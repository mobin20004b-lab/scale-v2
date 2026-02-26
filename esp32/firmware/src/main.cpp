#include <Arduino.h>
#include <ArduinoJson.h>
#include <AsyncTCP.h>
#include <DNSServer.h>
#include <ESPAsyncWebServer.h>
#include <HTTPClient.h>
#include <LittleFS.h>
#include <Preferences.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <algorithm>
#include <ctype.h>
#include <vector>

// ─── Forward declarations ────────────────────────────────────────────────────
void broadcastStatus(const char *reason = "update");
void writeStatus(JsonDocument &doc, const char *reason = "update");

// ─── Globals ─────────────────────────────────────────────────────────────────
DNSServer dnsServer;
AsyncWebServer server(80);
AsyncEventSource events("/api/events");
Preferences preferences;

const byte DNS_PORT = 53;
const char *const AP_SSID = "ESP32-S3-Setup";

// Upload endpoint – change these if needed
const char *const WEIGHT_POST_URL = "https://scale.hadersanat.com/api/v1/"
                                    "scales/cmm31px750004uzvlr467j1m4/weight";
const char *const WEIGHT_POST_AUTH =
    "Bearer a854aecf-da96-4f02-801d-77212c5e71cf";

// UART2: RX=16, TX unused (-1)
#define SCALE_RX_PIN 16
#define SCALE_BAUDRATE 9600

// ─── Persisted config
// ─────────────────────────────────────────────────────────
static String staSsid;
static String staPassword;
static uint32_t uploadIntervalMs = 5000;

// ─── Runtime state
// ────────────────────────────────────────────────────────────
static volatile bool shouldConnectWifi = false;
static unsigned long wifiConnectStartMs = 0;
static unsigned long lastReconnectAttemptMs = 0;
static unsigned long lastStatusBroadcastMs = 0;

// Weight
static String latestWeightRaw = "";
static float latestWeightValue = NAN;
static bool hasWeightValue = false;
static unsigned long lastWeightReadMs = 0;

// Upload tracking
static unsigned long lastUploadAttemptMs = 0;
static unsigned long lastUploadMs = 0;
static int lastUploadCode = 0;
static String lastUploadResponse = "";

// Serial2 receive buffer – avoids blocking delay() in the read loop
#define SCALE_BUF_SIZE 128
static char scaleBuf[SCALE_BUF_SIZE];
static uint8_t scaleBufLen = 0;

// WiFi event flags set from ISR, acted on in loop()
static volatile bool wifiGotIp = false;
static volatile bool wifiDisconnected = false;

const uint32_t WIFI_CONNECT_TIMEOUT_MS = 15000;
const uint32_t WIFI_RECONNECT_INTERVAL_MS = 15000;

// ─── Captive portal handler
// ───────────────────────────────────────────────────
class CaptiveRequestHandler : public AsyncWebHandler {
public:
  bool canHandle(AsyncWebServerRequest *request) const override {
    String host = request->host();
    // Redirect everything that is NOT aimed at the AP IP
    return (host != WiFi.softAPIP().toString() && host != "192.168.4.1");
  }
  void handleRequest(AsyncWebServerRequest *request) override {
    request->redirect("http://" + WiFi.softAPIP().toString() + "/");
  }
};

// ─── NVS helpers ─────────────────────────────────────────────────────────────
static void loadConfig() {
  preferences.begin("config", true); // read-only
  staSsid = preferences.getString("ssid", "");
  staPassword = preferences.getString("password", "");
  uploadIntervalMs = preferences.getUInt("upl_ms", 5000);
  preferences.end();

  if (uploadIntervalMs < 1000 || uploadIntervalMs > 600000) {
    uploadIntervalMs = 5000;
  }
}

static void saveConfig() {
  preferences.begin("config", false); // read-write
  preferences.putString("ssid", staSsid);
  preferences.putString("password", staPassword);
  preferences.putUInt("upl_ms", uploadIntervalMs);
  preferences.end();
}

// ─── Status serialisation
// ─────────────────────────────────────────────────────
void writeStatus(JsonDocument &doc, const char *reason) {
  doc["reason"] = reason;
  doc["ap_ssid"] = AP_SSID;
  doc["ap_ip"] = WiFi.softAPIP().toString();
  doc["sta_ssid"] = staSsid;
  doc["sta_connected"] = (WiFi.status() == WL_CONNECTED);
  doc["sta_ip"] = WiFi.localIP().toString();
  doc["rssi"] = (WiFi.status() == WL_CONNECTED) ? WiFi.RSSI() : 0;
  doc["uptime_seconds"] = millis() / 1000;
  doc["free_heap"] = ESP.getFreeHeap();

  doc["weight_raw"] = latestWeightRaw;
  // Send NaN-safe value: always a number
  doc["weight_value"] = hasWeightValue ? latestWeightValue : 0.0f;
  doc["weight_available"] = hasWeightValue;
  doc["weight_last_read_ms"] = lastWeightReadMs;

  doc["upload_interval_ms"] = uploadIntervalMs;
  doc["weight_last_upload_ms"] = lastUploadMs;
  doc["weight_last_upload_code"] = lastUploadCode;
  doc["weight_last_upload_response"] = lastUploadResponse;
}

void broadcastStatus(const char *reason) {
  JsonDocument doc;
  writeStatus(doc, reason);
  String payload;
  payload.reserve(256);
  serializeJson(doc, payload);
  events.send(payload.c_str(), "status", millis());
}

// ─── Weight parsing
// ─────────────────────────────────────────────────────────── Returns true and
// sets parsedWeight on success. Accepts strings like "  +1234.56 g", "-0,500",
// "001234", etc.
static bool tryParseWeight(const char *input, size_t len, float &parsedWeight) {
  // Build a clean float string
  char normalized[32];
  uint8_t ni = 0;
  bool seenDot = false;
  bool seenDigit = false;

  for (size_t i = 0; i < len && ni < (sizeof(normalized) - 1); ++i) {
    char c = input[i];
    if (c >= '0' && c <= '9') {
      normalized[ni++] = c;
      seenDigit = true;
    } else if (c == '-' && ni == 0) {
      normalized[ni++] = c;
    } else if ((c == '.' || c == ',') && !seenDot) {
      normalized[ni++] = '.';
      seenDot = true;
    }
    // all other characters (unit labels, spaces, +) are skipped
  }
  normalized[ni] = '\0';

  if (!seenDigit)
    return false;

  char *endPtr = nullptr;
  float val = strtof(normalized, &endPtr);
  if (endPtr == normalized || *endPtr != '\0' || isnan(val))
    return false;

  parsedWeight = val;
  return true;
}

// ─── Scale UART reader – non-blocking ────────────────────────────────────────
// Accumulates bytes into scaleBuf and only processes a complete line
// (terminated by \n or \r\n). No delay() calls.
static void readWeightFromScale() {
  while (Serial2.available()) {
    char c = (char)Serial2.read();

    if (c == '\n') {
      // End of line – process what we have
      if (scaleBufLen > 0) {
        scaleBuf[scaleBufLen] = '\0';

        // Trim trailing \r if present
        if (scaleBufLen > 0 && scaleBuf[scaleBufLen - 1] == '\r') {
          scaleBuf[--scaleBufLen] = '\0';
        }

        // Trim leading/trailing whitespace in-place
        size_t start = 0;
        while (start < scaleBufLen && isspace((unsigned char)scaleBuf[start]))
          ++start;
        size_t end = scaleBufLen;
        while (end > start && isspace((unsigned char)scaleBuf[end - 1]))
          --end;

        size_t frameLen = end - start;
        if (frameLen > 0) {
          // Copy trimmed frame into latestWeightRaw
          latestWeightRaw = String(scaleBuf + start, frameLen);
          lastWeightReadMs = millis();

          float parsed = NAN;
          if (tryParseWeight(scaleBuf + start, frameLen, parsed)) {
            latestWeightValue = parsed;
            hasWeightValue = true;
          }
        }
      }
      scaleBufLen = 0; // reset for next line
    } else if (c != '\r') {
      // Append to buffer; guard overflow
      if (scaleBufLen < SCALE_BUF_SIZE - 1) {
        scaleBuf[scaleBufLen++] = c;
      } else {
        // Buffer overflowed – discard this partial frame and start fresh
        scaleBufLen = 0;
      }
    }
  }
}

// ─── HTTP weight upload
// ───────────────────────────────────────────────────────
static void postWeightToServer() {
  if (!hasWeightValue)
    return;
  if (WiFi.status() != WL_CONNECTED)
    return;
  if (millis() - lastUploadAttemptMs < uploadIntervalMs)
    return;

  lastUploadAttemptMs = millis();

  // Use WiFiClientSecure with certificate verification disabled.
  // For production, load the server's CA cert instead.
  WiFiClientSecure client;
  client
      .setInsecure(); // accept any TLS cert – fine for a local/private endpoint

  HTTPClient http;
  if (!http.begin(client, WEIGHT_POST_URL)) {
    lastUploadCode = -1;
    lastUploadResponse = "begin failed";
    lastUploadMs = millis();
    broadcastStatus("weight-upload-error");
    return;
  }

  http.addHeader("Authorization", WEIGHT_POST_AUTH);
  http.addHeader("Content-Type", "text/plain");
  http.setTimeout(8000); // 8 s timeout – don't hang the loop for too long

  char payload[32];
  snprintf(payload, sizeof(payload), "%.3f", latestWeightValue);

  int httpCode = http.POST(payload);
  lastUploadCode = httpCode;
  lastUploadMs = millis();

  if (httpCode > 0) {
    // Read up to 64 bytes of the response body for diagnostics
    String body = http.getString();
    body.trim();
    if (body.length() > 64)
      body = body.substring(0, 64);
    lastUploadResponse = (httpCode >= 200 && httpCode < 300) ? "ok" : body;
  } else {
    // httpCode is negative – it's a WiFi/TCP error code
    lastUploadResponse = http.errorToString(httpCode);
  }

  http.end();
  broadcastStatus("weight-uploaded");
}

// ─── WiFi event handler – runs in a task context, NOT an ISR ────────────────
// Set flags here; do not call broadcastStatus() (which invokes async server
// callbacks) directly from this callback because it may fire from a different
// FreeRTOS task than the one running loop().
static void onWifiEvent(WiFiEvent_t event, WiFiEventInfo_t /*info*/) {
  switch (event) {
  case ARDUINO_EVENT_WIFI_STA_GOT_IP:
    wifiConnectStartMs = 0;
    wifiGotIp = true;
    break;
  case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
    wifiConnectStartMs = 0;
    wifiDisconnected = true;
    break;
  default:
    break;
  }
}

// ─── Route setup ─────────────────────────────────────────────────────────────
static void setupRoutes() {

  // GET /api/status – polled by the frontend every N seconds
  server.on("/api/status", HTTP_GET, [](AsyncWebServerRequest *request) {
    JsonDocument doc;
    writeStatus(doc, "api-status");
    String response;
    response.reserve(256);
    serializeJson(doc, response);
    request->send(200, "application/json", response);
  });

  // GET /api/wifi/scan – triggers or retrieves a scan
  server.on("/api/wifi/scan", HTTP_GET, [](AsyncWebServerRequest *request) {
    int n = WiFi.scanComplete();
    if (n == WIFI_SCAN_FAILED || n == -2) {
      WiFi.scanNetworks(/*async=*/true, /*show_hidden=*/true);
      request->send(202, "application/json", "{\"status\":\"scanning\"}");
      return;
    }
    if (n == WIFI_SCAN_RUNNING) {
      request->send(202, "application/json", "{\"status\":\"scanning\"}");
      return;
    }

    struct ScannedNetwork {
      String ssid;
      int32_t rssi;
      bool open;
    };
    std::vector<ScannedNetwork> sorted;
    sorted.reserve(n);

    for (int i = 0; i < n; ++i) {
      String ssid = WiFi.SSID(i);
      if (ssid.length() == 0)
        continue;
      sorted.push_back(
          {ssid, WiFi.RSSI(i), WiFi.encryptionType(i) == WIFI_AUTH_OPEN});
    }
    WiFi.scanDelete(); // free the scan memory immediately

    std::sort(sorted.begin(), sorted.end(),
              [](const ScannedNetwork &a, const ScannedNetwork &b) {
                return a.rssi > b.rssi; // strongest first
              });

    // Deduplicate by SSID (keep strongest)
    sorted.erase(
        std::unique(sorted.begin(), sorted.end(),
                    [](const ScannedNetwork &a, const ScannedNetwork &b) {
                      return a.ssid == b.ssid;
                    }),
        sorted.end());

    JsonDocument doc;
    JsonArray networks = doc["networks"].to<JsonArray>();
    for (const auto &e : sorted) {
      JsonObject net = networks.add<JsonObject>();
      net["ssid"] = e.ssid;
      net["rssi"] = e.rssi;
      net["open"] = e.open;
    }

    String response;
    response.reserve(512);
    serializeJson(doc, response);
    request->send(200, "application/json", response);
  });

  // POST /api/wifi/connect  { "ssid": "...", "password": "..." }
  server.on(
      "/api/wifi/connect", HTTP_POST,
      [](AsyncWebServerRequest * /*request*/) {}, nullptr,
      [](AsyncWebServerRequest *request, uint8_t *data, size_t len,
         size_t /*index*/, size_t /*total*/) {
        JsonDocument doc;
        if (deserializeJson(doc, data, len)) {
          request->send(400, "application/json",
                        "{\"error\":\"Invalid JSON\"}");
          return;
        }

        if (!doc["ssid"].is<const char *>()) {
          request->send(400, "application/json",
                        "{\"error\":\"ssid required\"}");
          return;
        }

        String ssid = doc["ssid"].as<String>();
        ssid.trim();
        if (ssid.length() == 0) {
          request->send(400, "application/json",
                        "{\"error\":\"ssid must not be empty\"}");
          return;
        }

        staSsid = ssid;
        staPassword = doc["password"] | "";
        saveConfig();
        shouldConnectWifi = true;

        request->send(200, "application/json", "{\"status\":\"connecting\"}");
      });

  // POST /api/wifi/disconnect – forget saved credentials and disconnect
  server.on(
      "/api/wifi/disconnect", HTTP_POST, [](AsyncWebServerRequest *request) {
        WiFi.disconnect(/*wifioff=*/false);
        staSsid = "";
        staPassword = "";
        saveConfig();
        broadcastStatus("wifi-forgotten");
        request->send(200, "application/json", "{\"status\":\"forgotten\"}");
      });

  // GET /api/settings
  server.on("/api/settings", HTTP_GET, [](AsyncWebServerRequest *request) {
    JsonDocument doc;
    doc["upload_interval_ms"] = uploadIntervalMs;
    String response;
    serializeJson(doc, response);
    request->send(200, "application/json", response);
  });

  // POST /api/settings  { "upload_interval_ms": 5000 }
  server.on(
      "/api/settings", HTTP_POST, [](AsyncWebServerRequest * /*request*/) {},
      nullptr,
      [](AsyncWebServerRequest *request, uint8_t *data, size_t len,
         size_t /*index*/, size_t /*total*/) {
        JsonDocument doc;
        if (deserializeJson(doc, data, len)) {
          request->send(400, "application/json",
                        "{\"error\":\"Invalid JSON\"}");
          return;
        }

        if (!doc["upload_interval_ms"].is<uint32_t>()) {
          request->send(
              400, "application/json",
              "{\"error\":\"upload_interval_ms must be a positive integer\"}");
          return;
        }

        uint32_t requested = doc["upload_interval_ms"].as<uint32_t>();
        if (requested < 1000 || requested > 600000) {
          request->send(
              400, "application/json",
              "{\"error\":\"upload_interval_ms must be 1000..600000\"}");
          return;
        }

        uploadIntervalMs = requested;
        saveConfig();
        broadcastStatus("settings-updated");
        request->send(200, "application/json", "{\"status\":\"saved\"}");
      });

  // SSE endpoint (kept for clients that support it; SPA may also poll)
  events.onConnect([](AsyncEventSourceClient *client) {
    // Send current state immediately to the newly connected client
    JsonDocument doc;
    writeStatus(doc, "client-connected");
    String payload;
    payload.reserve(256);
    serializeJson(doc, payload);
    client->send(payload.c_str(), "status", millis());
  });
  server.addHandler(&events);

  // Static files served from LittleFS
  server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");

  // Fallback: serve index.html for any unknown path (SPA routing)
  server.onNotFound([](AsyncWebServerRequest *request) {
    if (request->method() == HTTP_OPTIONS) {
      request->send(200);
      return;
    }
    if (!LittleFS.exists("/index.html")) {
      request->send(404, "text/plain", "Not found");
      return;
    }
    request->send(LittleFS, "/index.html", "text/html");
  });
}

// ─── setup ───────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n\n=== ESP32-S3 Scale firmware booting ===");

  if (!LittleFS.begin(/*formatOnFail=*/true)) {
    Serial.println("[ERROR] LittleFS mount failed – halting");
    while (true)
      delay(1000);
  }

  loadConfig();

  // Initialise UART2 for the scale (RX only; TX pin set to -1)
  Serial2.begin(SCALE_BAUDRATE, SERIAL_8N1, SCALE_RX_PIN, -1);

  // WiFi: AP + STA simultaneously
  WiFi.mode(WIFI_AP_STA);
  WiFi.onEvent(onWifiEvent);
  WiFi.softAP(AP_SSID);

  Serial.printf("[WiFi] AP started – SSID: %s  IP: %s\n", AP_SSID,
                WiFi.softAPIP().toString().c_str());

  // Captive-portal DNS: redirect all DNS queries to our AP IP
  dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());

  // CORS headers for every response
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods",
                                       "GET, POST, OPTIONS");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers",
                                       "Content-Type");

  // Captive portal redirect (must be added before other handlers)
  server.addHandler(new CaptiveRequestHandler()).setFilter(ON_AP_FILTER);
  setupRoutes();
  server.begin();

  // Kick off WiFi STA if we have saved credentials
  if (staSsid.length() > 0) {
    shouldConnectWifi = true;
  }

  Serial.println("[Boot] Done.");
}

// ─── loop ────────────────────────────────────────────────────────────────────
void loop() {
  // 1. Process captive-portal DNS
  dnsServer.processNextRequest();

  // 2. Act on WiFi events flagged from the event handler
  if (wifiGotIp) {
    wifiGotIp = false;
    Serial.printf("[WiFi] Connected – IP: %s\n",
                  WiFi.localIP().toString().c_str());
    broadcastStatus("wifi-connected");
  }
  if (wifiDisconnected) {
    wifiDisconnected = false;
    Serial.println("[WiFi] Disconnected");
    broadcastStatus("wifi-disconnected");
  }

  // 3. Initiate WiFi STA connection (requested from a route handler or
  // auto-reconnect)
  if (shouldConnectWifi) {
    shouldConnectWifi = false;
    WiFi.disconnect(/*wifioff=*/false);
    delay(50);
    WiFi.begin(staSsid.c_str(), staPassword.c_str());
    wifiConnectStartMs = millis();
    Serial.printf("[WiFi] Connecting to '%s'…\n", staSsid.c_str());
    broadcastStatus("wifi-connect-requested");
  }

  // 4. WiFi connect timeout
  if (wifiConnectStartMs > 0 && WiFi.status() != WL_CONNECTED &&
      millis() - wifiConnectStartMs > WIFI_CONNECT_TIMEOUT_MS) {

    WiFi.disconnect(/*wifioff=*/false);
    wifiConnectStartMs = 0;
    Serial.println("[WiFi] Connect timeout");
    broadcastStatus("wifi-timeout");
  }

  // 5. Periodic auto-reconnect (only when not already trying)
  if (WiFi.status() != WL_CONNECTED && staSsid.length() > 0 &&
      wifiConnectStartMs == 0 &&
      millis() - lastReconnectAttemptMs > WIFI_RECONNECT_INTERVAL_MS) {

    lastReconnectAttemptMs = millis();
    shouldConnectWifi = true;
  }

  // 6. Read scale UART (non-blocking, line-buffered)
  readWeightFromScale();

  // 7. Upload weight to server (throttled by uploadIntervalMs)
  postWeightToServer();

  // 8. Heartbeat SSE broadcast every second
  if (millis() - lastStatusBroadcastMs >= 1000) {
    lastStatusBroadcastMs = millis();
    broadcastStatus("heartbeat");
  }

  // No delay() here – the async server and DNS need fast loop() calls
}