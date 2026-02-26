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
#include <cstring>
#include <stdarg.h>
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
const char *const DEFAULT_WEIGHT_POST_TOKEN =
    "a854aecf-da96-4f02-801d-77212c5e71cf";

// UART2: RX=16, TX unused (-1)
#define SCALE_RX_PIN 16
#define SCALE_BAUDRATE 9600

// ─── Persisted config
// ─────────────────────────────────────────────────────────
static String staSsid;
static String staPassword;
static uint32_t uploadIntervalMs = 5000;
static String uploadAuthToken;

static String normalizeAuthToken(const String &value) {
  String normalized = value;
  normalized.trim();

  if (normalized.startsWith("Bearer ")) {
    normalized = normalized.substring(7);
    normalized.trim();
  }

  return normalized;
}

// ─── Runtime state
// ────────────────────────────────────────────────────────────
static volatile bool shouldConnectWifi = false;
static unsigned long wifiConnectStartMs = 0;
static unsigned long lastReconnectAttemptMs = 0;
static unsigned long lastStatusBroadcastMs = 0;
static unsigned long wifiLastAttemptMs = 0;
static unsigned long wifiLastConnectedMs = 0;
static unsigned long wifiNextReconnectAtMs = 0;
static String wifiLastError = "idle";
static int32_t wifiLastDisconnectReason = 0;

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

const size_t SCALE_FRAME_LEN = 11; // e.g. "ww000.000kg"

// WiFi event flags set from ISR, acted on in loop()
static volatile bool wifiGotIp = false;
static volatile bool wifiDisconnected = false;

struct ScannedNetwork {
  String ssid;
  int32_t rssi;
  bool open;
};

static std::vector<ScannedNetwork> cachedNetworks;
static bool wifiScanInProgress = false;
static unsigned long wifiScanStartedMs = 0;
static unsigned long wifiLastScanCompletedMs = 0;

const uint32_t WIFI_SCAN_STALE_MS = 30000;
const uint32_t WIFI_SCAN_TIMEOUT_MS = 10000;
const char *const WIFI_SCAN_CACHE_PATH = "/wifi_scan_cache.json";

const uint32_t WIFI_CONNECT_TIMEOUT_MS = 15000;
const uint32_t WIFI_RECONNECT_INTERVAL_MS = 15000;
const uint32_t WIFI_RECONNECT_MAX_INTERVAL_MS = 60000;
const size_t LOG_FILE_MAX_BYTES = 32768;
const char *const LOG_FILE_PATH = "/serial.log";

static uint32_t wifiReconnectIntervalMs = WIFI_RECONNECT_INTERVAL_MS;

static void appendLogLine(const String &line) {
  Serial.println(line);

  File current = LittleFS.open(LOG_FILE_PATH, FILE_READ);
  size_t currentSize = current ? current.size() : 0;
  if (current)
    current.close();

  if (currentSize > LOG_FILE_MAX_BYTES) {
    LittleFS.remove(LOG_FILE_PATH);
  }

  File file = LittleFS.open(LOG_FILE_PATH, FILE_APPEND);
  if (!file)
    return;

  file.println(line);
  file.close();
}

static void logf(const char *fmt, ...) {
  char buffer[256];
  va_list args;
  va_start(args, fmt);
  vsnprintf(buffer, sizeof(buffer), fmt, args);
  va_end(args);
  appendLogLine(String(buffer));
}

static void dedupeAndSortNetworks(std::vector<ScannedNetwork> &networks) {
  std::sort(networks.begin(), networks.end(),
            [](const ScannedNetwork &a, const ScannedNetwork &b) {
              return a.rssi > b.rssi;
            });
  networks.erase(std::unique(networks.begin(), networks.end(),
                             [](const ScannedNetwork &a,
                                const ScannedNetwork &b) {
                               return a.ssid == b.ssid;
                             }),
                 networks.end());
}

static void markWifiConnectFailure(const char *error) {
  wifiConnectStartMs = 0;
  wifiLastError = error;
  wifiReconnectIntervalMs =
      std::min(wifiReconnectIntervalMs * 2, WIFI_RECONNECT_MAX_INTERVAL_MS);
  wifiNextReconnectAtMs = millis() + wifiReconnectIntervalMs;
}

static void markWifiConnectSuccess() {
  wifiReconnectIntervalMs = WIFI_RECONNECT_INTERVAL_MS;
  wifiNextReconnectAtMs = 0;
}

static const char *wifiDisconnectReasonText(int32_t reason) {
  switch (reason) {
  case WIFI_REASON_AUTH_EXPIRE:
    return "auth-expired";
  case WIFI_REASON_AUTH_FAIL:
    return "auth-failed";
  case WIFI_REASON_ASSOC_FAIL:
    return "association-failed";
  case WIFI_REASON_HANDSHAKE_TIMEOUT:
    return "handshake-timeout";
  case WIFI_REASON_BEACON_TIMEOUT:
    return "beacon-timeout";
  case WIFI_REASON_NO_AP_FOUND:
    return "ap-not-found";
  case WIFI_REASON_CONNECTION_FAIL:
    return "connection-failed";
  default:
    return "disconnected";
  }
}

static void saveCachedNetworksToFile() {
  JsonDocument doc;
  doc["last_scan_ms"] = wifiLastScanCompletedMs;
  JsonArray networks = doc["networks"].to<JsonArray>();

  for (const auto &e : cachedNetworks) {
    JsonObject net = networks.add<JsonObject>();
    net["ssid"] = e.ssid;
    net["rssi"] = e.rssi;
    net["open"] = e.open;
  }

  File file = LittleFS.open(WIFI_SCAN_CACHE_PATH, FILE_WRITE);
  if (!file) {
    logf("[WiFi] Failed to open scan cache file for writing");
    return;
  }

  if (serializeJson(doc, file) == 0) {
    logf("[WiFi] Failed to write scan cache file");
  }

  file.close();
}

static void loadCachedNetworksFromFile() {
  if (!LittleFS.exists(WIFI_SCAN_CACHE_PATH))
    return;

  File file = LittleFS.open(WIFI_SCAN_CACHE_PATH, FILE_READ);
  if (!file) {
    logf("[WiFi] Failed to open scan cache file for reading");
    return;
  }

  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, file);
  file.close();

  if (error) {
    logf("[WiFi] Invalid scan cache file: %s", error.c_str());
    LittleFS.remove(WIFI_SCAN_CACHE_PATH);
    return;
  }

  cachedNetworks.clear();
  JsonArray networks = doc["networks"].as<JsonArray>();
  for (JsonVariant net : networks) {
    if (!net["ssid"].is<const char *>())
      continue;
    String ssid = net["ssid"].as<String>();
    ssid.trim();
    if (ssid.length() == 0)
      continue;

    int32_t rssi = net["rssi"] | -100;
    bool open = net["open"] | false;
    cachedNetworks.push_back({ssid, rssi, open});
  }

  dedupeAndSortNetworks(cachedNetworks);

  wifiLastScanCompletedMs = doc["last_scan_ms"] | 0;
  if (cachedNetworks.empty()) {
    wifiLastScanCompletedMs = 0;
  }

  logf("[WiFi] Restored %u cached networks from LittleFS",
       (unsigned)cachedNetworks.size());
}

static void updateWifiScanState() {
  if (!wifiScanInProgress)
    return;

  int n = WiFi.scanComplete();
  if (n == WIFI_SCAN_RUNNING)
    return;

  if (n < 0) {
    if (n == WIFI_SCAN_FAILED) {
      wifiScanInProgress = false;
      wifiLastError = "scan-failed";
      WiFi.scanDelete();
      logf("[WiFi] Scan failed (driver error)");
      return;
    }

    if (millis() - wifiScanStartedMs > WIFI_SCAN_TIMEOUT_MS) {
      wifiScanInProgress = false;
      wifiLastError = "scan-timeout";
      WiFi.scanDelete();
      logf("[WiFi] Scan timeout");
    }
    return;
  }

  std::vector<ScannedNetwork> sorted;
  sorted.reserve(n);
  for (int i = 0; i < n; ++i) {
    String ssid = WiFi.SSID(i);
    if (ssid.length() == 0)
      continue;
    sorted.push_back({ssid, WiFi.RSSI(i),
                      WiFi.encryptionType(i) == WIFI_AUTH_OPEN});
  }

  dedupeAndSortNetworks(sorted);

  cachedNetworks = sorted;
  wifiLastScanCompletedMs = millis();
  saveCachedNetworksToFile();
  wifiScanInProgress = false;
  wifiLastError = "scan-ready";
  WiFi.scanDelete();
  logf("[WiFi] Scan completed with %u networks", (unsigned)cachedNetworks.size());
}

static bool startWifiScan() {
  int scanState = WiFi.scanComplete();
  if (scanState == WIFI_SCAN_RUNNING) {
    wifiScanInProgress = true;
    if (wifiScanStartedMs == 0)
      wifiScanStartedMs = millis();
    return true;
  }

  if (scanState >= 0 || scanState == WIFI_SCAN_FAILED) {
    WiFi.scanDelete();
  }

  int result = WiFi.scanNetworks(/*async=*/true, /*show_hidden=*/true);
  if (result < 0) {
    wifiLastError = "scan-start-failed";
    logf("[WiFi] Failed to start scan: %d", result);
    return false;
  }

  wifiScanInProgress = true;
  wifiScanStartedMs = millis();
  return true;
}

static void requestWifiScan(bool forceRescan) {
  updateWifiScanState();

  bool hasFreshCache =
      wifiLastScanCompletedMs > 0 &&
      (millis() - wifiLastScanCompletedMs) < WIFI_SCAN_STALE_MS;

  if (wifiScanInProgress)
    return;
  if (!forceRescan && hasFreshCache)
    return;

  startWifiScan();
}

static void requestWifiConnect(const char *reason) {
  if (staSsid.length() == 0)
    return;

  wl_status_t wifiStatus = WiFi.status();
  if (wifiStatus == WL_CONNECTED) {
    if (WiFi.SSID() == staSsid) {
      wifiLastError = "already-connected";
      wifiConnectStartMs = 0;
      return;
    }
    WiFi.disconnect(/*wifioff=*/false, /*eraseap=*/false);
  }

  shouldConnectWifi = false;
  wifiLastAttemptMs = millis();
  wifiLastError = "connecting";
  wifiLastDisconnectReason = 0;
  WiFi.disconnect(/*wifioff=*/false, /*eraseap=*/false);
  WiFi.begin(staSsid.c_str(), staPassword.c_str());
  wifiConnectStartMs = millis();
  logf("[WiFi] Connecting to '%s' (%s)", staSsid.c_str(), reason);
  broadcastStatus(reason);
}

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
  uploadAuthToken =
      preferences.getString("upl_tok", DEFAULT_WEIGHT_POST_TOKEN);
  preferences.end();

  if (uploadIntervalMs < 1000 || uploadIntervalMs > 600000) {
    uploadIntervalMs = 5000;
  }

  uploadAuthToken = normalizeAuthToken(uploadAuthToken);
  if (uploadAuthToken.length() == 0) {
    uploadAuthToken = DEFAULT_WEIGHT_POST_TOKEN;
  }
}

static void saveConfig() {
  preferences.begin("config", false); // read-write
  preferences.putString("ssid", staSsid);
  preferences.putString("password", staPassword);
  preferences.putUInt("upl_ms", uploadIntervalMs);
  preferences.putString("upl_tok", uploadAuthToken);
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
  doc["sta_has_saved_credentials"] = staSsid.length() > 0;
  doc["sta_connecting"] = wifiConnectStartMs > 0;
  doc["wifi_last_attempt_ms"] = wifiLastAttemptMs;
  doc["wifi_last_connected_ms"] = wifiLastConnectedMs;
  doc["wifi_last_error"] = wifiLastError;
  doc["wifi_last_disconnect_reason"] = wifiLastDisconnectReason;
  doc["sta_ip"] = WiFi.localIP().toString();
  doc["rssi"] = (WiFi.status() == WL_CONNECTED) ? WiFi.RSSI() : 0;
  doc["wifi_scan_in_progress"] = wifiScanInProgress;
  doc["wifi_scan_last_ms"] = wifiLastScanCompletedMs;
  doc["wifi_scan_result_count"] = cachedNetworks.size();
  doc["uptime_seconds"] = millis() / 1000;
  doc["free_heap"] = ESP.getFreeHeap();

  doc["weight_raw"] = latestWeightRaw;
  // Send NaN-safe value: always a number
  doc["weight_value"] = hasWeightValue ? latestWeightValue : 0.0f;
  doc["weight_available"] = hasWeightValue;
  doc["weight_last_read_ms"] = lastWeightReadMs;

  doc["upload_interval_ms"] = uploadIntervalMs;
  doc["upload_auth_token"] = uploadAuthToken;
  doc["upload_auth_token_configured"] = uploadAuthToken.length() > 0;
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

// Tries to find a full scale frame in `input` with this exact shape:
//   ww000.000kg
// and returns both the full raw frame and the numeric value.
static bool tryExtractWeightFrame(const char *input, size_t len, String &rawFrame,
                                  float &parsedWeight) {
  if (len < SCALE_FRAME_LEN)
    return false;

  for (size_t i = 0; i + SCALE_FRAME_LEN <= len; ++i) {
    const char *p = input + i;

    bool matches =
        isalpha((unsigned char)p[0]) && isalpha((unsigned char)p[1]) &&
        isdigit((unsigned char)p[2]) && isdigit((unsigned char)p[3]) &&
        isdigit((unsigned char)p[4]) && p[5] == '.' &&
        isdigit((unsigned char)p[6]) && isdigit((unsigned char)p[7]) &&
        isdigit((unsigned char)p[8]) &&
        tolower((unsigned char)p[9]) == 'k' &&
        tolower((unsigned char)p[10]) == 'g';

    if (!matches)
      continue;

    rawFrame = String(p, SCALE_FRAME_LEN);

    char numericPart[8]; // "000.000" + '\0'
    memcpy(numericPart, p + 2, 7);
    numericPart[7] = '\0';
    parsedWeight = strtof(numericPart, nullptr);

    return !isnan(parsedWeight);
  }

  return false;
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
          float parsed = NAN;
          String extractedRaw;

          // Prefer strict frame parsing first (e.g. "ww000.000kg")
          if (tryExtractWeightFrame(scaleBuf + start, frameLen, extractedRaw,
                                    parsed)) {
            latestWeightRaw = extractedRaw;
            latestWeightValue = parsed;
            hasWeightValue = true;
            lastWeightReadMs = millis();
          } else {
            // Fallback: keep trimmed raw line and parse any numeric value in it
            latestWeightRaw = String(scaleBuf + start, frameLen);
            lastWeightReadMs = millis();

            if (tryParseWeight(scaleBuf + start, frameLen, parsed)) {
              latestWeightValue = parsed;
              hasWeightValue = true;
            }
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

  String authHeader = "Bearer " + uploadAuthToken;
  http.addHeader("Authorization", authHeader);
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
static void onWifiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
  switch (event) {
  case ARDUINO_EVENT_WIFI_STA_GOT_IP:
    wifiConnectStartMs = 0;
    markWifiConnectSuccess();
    wifiLastError = "connected";
    wifiLastDisconnectReason = 0;
    wifiLastConnectedMs = millis();
    wifiGotIp = true;
    break;
  case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
    markWifiConnectFailure(wifiDisconnectReasonText(
        info.wifi_sta_disconnected.reason));
    wifiLastDisconnectReason = info.wifi_sta_disconnected.reason;
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
    bool forceRescan = request->hasParam("refresh") &&
                       request->getParam("refresh")->value() == "1";

    requestWifiScan(forceRescan);
    updateWifiScanState();

    if (wifiScanInProgress && cachedNetworks.empty()) {
      request->send(202, "application/json", "{\"status\":\"scanning\"}");
      return;
    }

    JsonDocument doc;
    doc["status"] = wifiScanInProgress ? "scanning" : "ready";
    doc["cached"] = wifiScanInProgress;
    doc["last_scan_ms"] = wifiLastScanCompletedMs;
    JsonArray networks = doc["networks"].to<JsonArray>();
    for (const auto &e : cachedNetworks) {
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
        if (staPassword.length() > 0 && staPassword.length() < 8) {
          request->send(400, "application/json",
                        "{\"error\":\"password must be at least 8 chars\"}");
          return;
        }

        saveConfig();
        wifiLastError = "connecting";
        wifiLastDisconnectReason = 0;
        wifiReconnectIntervalMs = WIFI_RECONNECT_INTERVAL_MS;
        wifiNextReconnectAtMs = 0;
        shouldConnectWifi = true;

        JsonDocument response;
        response["status"] = "connecting";
        response["ssid"] = staSsid;
        response["message"] = "Connection attempt started";
        String payload;
        serializeJson(response, payload);
        request->send(200, "application/json", payload);
      });

  // GET /api/logs - serial logs persisted in LittleFS
  server.on("/api/logs", HTTP_GET, [](AsyncWebServerRequest *request) {
    if (!LittleFS.exists(LOG_FILE_PATH)) {
      request->send(200, "text/plain", "No logs yet");
      return;
    }

    File file = LittleFS.open(LOG_FILE_PATH, FILE_READ);
    if (!file) {
      request->send(500, "application/json",
                    "{\"error\":\"failed to open log file\"}");
      return;
    }

    String output;
    output.reserve(1024);
    while (file.available()) {
      output += static_cast<char>(file.read());
    }
    file.close();
    request->send(200, "text/plain", output);
  });

  // POST /api/wifi/disconnect – forget saved credentials and disconnect
  server.on(
      "/api/wifi/disconnect", HTTP_POST, [](AsyncWebServerRequest *request) {
        WiFi.disconnect(/*wifioff=*/false);
        staSsid = "";
        staPassword = "";
        wifiLastError = "credentials-cleared";
        wifiLastDisconnectReason = 0;
        saveConfig();
        broadcastStatus("wifi-forgotten");
        request->send(200, "application/json", "{\"status\":\"forgotten\"}");
      });

  // GET /api/settings
  server.on("/api/settings", HTTP_GET, [](AsyncWebServerRequest *request) {
    JsonDocument doc;
    doc["upload_interval_ms"] = uploadIntervalMs;
    doc["upload_auth_token"] = uploadAuthToken;
    String response;
    serializeJson(doc, response);
    request->send(200, "application/json", response);
  });

  // POST /api/settings  { "upload_interval_ms": 5000, "upload_auth_token":
  // "..." }
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

        if (!doc["upload_auth_token"].is<const char *>()) {
          request->send(
              400, "application/json",
              "{\"error\":\"upload_auth_token must be a non-empty string\"}");
          return;
        }

        uint32_t requested = doc["upload_interval_ms"].as<uint32_t>();
        if (requested < 1000 || requested > 600000) {
          request->send(
              400, "application/json",
              "{\"error\":\"upload_interval_ms must be 1000..600000\"}");
          return;
        }

        String requestedToken = normalizeAuthToken(doc["upload_auth_token"].as<String>());
        if (requestedToken.length() == 0 || requestedToken.length() > 255) {
          request->send(400, "application/json",
                        "{\"error\":\"upload_auth_token length must be "
                        "1..255\"}");
          return;
        }

        uploadIntervalMs = requested;
        uploadAuthToken = requestedToken;
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

  appendLogLine("\n\n=== ESP32-S3 Scale firmware booting ===");

  if (!LittleFS.begin(/*formatOnFail=*/true)) {
    appendLogLine("[ERROR] LittleFS mount failed - halting");
    while (true)
      delay(1000);
  }

  loadConfig();
  loadCachedNetworksFromFile();

  // Initialise UART2 for the scale (RX only; TX pin set to -1)
  Serial2.begin(SCALE_BAUDRATE, SERIAL_8N1, SCALE_RX_PIN, -1);

  // WiFi: AP + STA simultaneously
  WiFi.mode(WIFI_AP_STA);
  WiFi.onEvent(onWifiEvent);
  WiFi.softAP(AP_SSID);

  logf("[WiFi] AP started - SSID: %s IP: %s", AP_SSID,
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

  appendLogLine("[Boot] Done.");
}

// ─── loop ────────────────────────────────────────────────────────────────────
void loop() {
  // 1. Process captive-portal DNS
  dnsServer.processNextRequest();

  // 2. Act on WiFi events flagged from the event handler
  if (wifiGotIp) {
    wifiGotIp = false;
    logf("[WiFi] Connected - IP: %s", WiFi.localIP().toString().c_str());
    broadcastStatus("wifi-connected");
  }
  if (wifiDisconnected) {
    wifiDisconnected = false;
    appendLogLine("[WiFi] Disconnected");
    broadcastStatus("wifi-disconnected");
  }

  // 3. Initiate WiFi STA connection (requested from a route handler or
  // auto-reconnect)
  if (shouldConnectWifi) {
    requestWifiConnect("wifi-connect-requested");
  }

  // 4. WiFi connect timeout
  if (wifiConnectStartMs > 0 && WiFi.status() != WL_CONNECTED &&
      millis() - wifiConnectStartMs > WIFI_CONNECT_TIMEOUT_MS) {

    WiFi.disconnect(/*wifioff=*/false);
    markWifiConnectFailure("timeout");
    appendLogLine("[WiFi] Connect timeout");
    broadcastStatus("wifi-timeout");
  }

  // 5. Periodic auto-reconnect (only when not already trying)
  if (WiFi.status() != WL_CONNECTED && staSsid.length() > 0 &&
      wifiConnectStartMs == 0 && wifiNextReconnectAtMs > 0 &&
      millis() >= wifiNextReconnectAtMs &&
      millis() - lastReconnectAttemptMs > 1000) {

    lastReconnectAttemptMs = millis();
    shouldConnectWifi = true;
  }

  // 6. Read scale UART (non-blocking, line-buffered)
  updateWifiScanState();

  // 7. Read scale UART (non-blocking, line-buffered)
  readWeightFromScale();

  // 8. Upload weight to server (throttled by uploadIntervalMs)
  postWeightToServer();

  // 9. Heartbeat SSE broadcast every second
  if (millis() - lastStatusBroadcastMs >= 1000) {
    lastStatusBroadcastMs = millis();
    broadcastStatus("heartbeat");
  }

  // No delay() here – the async server and DNS need fast loop() calls
}
