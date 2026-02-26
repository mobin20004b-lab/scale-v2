#include <Arduino.h>
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <DNSServer.h>
#include <LittleFS.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <vector>
#include <algorithm>
#include <ctype.h>

DNSServer dnsServer;
AsyncWebServer server(80);
AsyncEventSource events("/api/events");
Preferences preferences;

const byte DNS_PORT = 53;
const char* AP_SSID = "ESP32-S3-Setup";
const char* WEIGHT_POST_URL = "https://scale.hadersanat.com/api/v1/scales/cmm31px750004uzvlr467j1m4/weight";
const char* WEIGHT_POST_AUTH = "Bearer a854aecf-da96-4f02-801d-77212c5e71cf";

#define SCALE_RX_PIN 16
#define SCALE_BAUDRATE 9600

String staSsid = "";
String staPassword = "";

bool shouldConnectWifi = false;
unsigned long wifiConnectStartMs = 0;
unsigned long lastReconnectAttemptMs = 0;
unsigned long lastStatusBroadcastMs = 0;

String latestWeightRaw = "No Data";
float latestWeightValue = NAN;
bool hasWeightValue = false;
unsigned long lastWeightReadMs = 0;

uint32_t uploadIntervalMs = 5000;
unsigned long lastUploadAttemptMs = 0;
unsigned long lastUploadMs = 0;
int lastUploadCode = 0;
String lastUploadResponse = "never";

const uint32_t WIFI_CONNECT_TIMEOUT_MS = 15000;
const uint32_t WIFI_RECONNECT_INTERVAL_MS = 15000;

class CaptiveRequestHandler : public AsyncWebHandler {
public:
    bool canHandle(AsyncWebServerRequest *request) override {
        String host = request->host();
        return host != WiFi.softAPIP().toString() && host != "192.168.4.1";
    }

    void handleRequest(AsyncWebServerRequest *request) override {
        request->redirect("http://" + WiFi.softAPIP().toString() + "/");
    }
};

void loadConfig() {
    preferences.begin("config", false);
    staSsid = preferences.getString("ssid", "");
    staPassword = preferences.getString("password", "");
    uploadIntervalMs = preferences.getUInt("upl_ms", 5000);
    preferences.end();

    if (uploadIntervalMs < 1000 || uploadIntervalMs > 600000) {
        uploadIntervalMs = 5000;
    }
}

void saveConfig() {
    preferences.begin("config", false);
    preferences.putString("ssid", staSsid);
    preferences.putString("password", staPassword);
    preferences.putUInt("upl_ms", uploadIntervalMs);
    preferences.end();
}

void writeStatus(JsonDocument& doc, const char* reason = "update") {
    doc["reason"] = reason;
    doc["ap_ssid"] = AP_SSID;
    doc["ap_ip"] = WiFi.softAPIP().toString();
    doc["sta_ssid"] = staSsid;
    doc["sta_connected"] = WiFi.status() == WL_CONNECTED;
    doc["sta_ip"] = WiFi.localIP().toString();
    doc["rssi"] = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0;
    doc["uptime_seconds"] = millis() / 1000;

    doc["weight_raw"] = latestWeightRaw;
    doc["weight_value"] = hasWeightValue ? latestWeightValue : 0;
    doc["weight_available"] = hasWeightValue;
    doc["weight_last_read_ms"] = lastWeightReadMs;

    doc["upload_interval_ms"] = uploadIntervalMs;
    doc["weight_last_upload_ms"] = lastUploadMs;
    doc["weight_last_upload_code"] = lastUploadCode;
    doc["weight_last_upload_response"] = lastUploadResponse;
}

void broadcastStatus(const char* reason = "update") {
    JsonDocument doc;
    writeStatus(doc, reason);
    String response;
    serializeJson(doc, response);
    events.send(response.c_str(), "status", millis());
}

bool tryParseWeight(const String& input, float& parsedWeight) {
    String normalized = "";
    normalized.reserve(input.length());
    bool seenDot = false;

    for (size_t i = 0; i < input.length(); ++i) {
        char c = input[i];
        if (isdigit((unsigned char)c)) {
            normalized += c;
            continue;
        }
        if (c == '-' && normalized.length() == 0) {
            normalized += c;
            continue;
        }
        if ((c == '.' || c == ',') && !seenDot) {
            normalized += '.';
            seenDot = true;
        }
    }

    if (normalized.length() == 0 || normalized == "-" || normalized == "." || normalized == "-.") {
        return false;
    }

    char* endPtr = nullptr;
    parsedWeight = strtof(normalized.c_str(), &endPtr);
    return endPtr != normalized.c_str() && *endPtr == '\0' && !isnan(parsedWeight);
}

void readWeightFromScale() {
    if (!Serial2.available()) {
        return;
    }

    String frame = "";
    while (Serial2.available()) {
        char c = Serial2.read();
        if (c != '\n' && c != '\r') {
            frame += c;
        }
        delay(1);
    }

    frame.trim();
    if (frame.length() == 0) {
        return;
    }

    latestWeightRaw = frame;
    lastWeightReadMs = millis();

    float parsedWeight = NAN;
    if (tryParseWeight(frame, parsedWeight)) {
        latestWeightValue = parsedWeight;
        hasWeightValue = true;
    }
}

void postWeightToServer() {
    if (!hasWeightValue || WiFi.status() != WL_CONNECTED) {
        return;
    }

    if (millis() - lastUploadAttemptMs < uploadIntervalMs) {
        return;
    }
    lastUploadAttemptMs = millis();

    HTTPClient http;
    http.begin(WEIGHT_POST_URL);
    http.addHeader("Authorization", WEIGHT_POST_AUTH);
    http.addHeader("Content-Type", "text/plain");

    String payload = String(latestWeightValue, 3);
    int httpCode = http.POST(payload);
    if (httpCode > 0) {
        lastUploadResponse = "ok";
    } else {
        lastUploadResponse = http.errorToString(httpCode);
    }
    lastUploadCode = httpCode;
    lastUploadMs = millis();
    http.end();

    broadcastStatus("weight-uploaded");
}

void onWifiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
    switch (event) {
        case ARDUINO_EVENT_WIFI_STA_GOT_IP:
            wifiConnectStartMs = 0;
            broadcastStatus("wifi-connected");
            break;
        case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
            (void)info;
            wifiConnectStartMs = 0;
            broadcastStatus("wifi-disconnected");
            break;
        default:
            break;
    }
}

void setupRoutes() {
    server.on("/api/status", HTTP_GET, [](AsyncWebServerRequest *request){
        JsonDocument doc;
        writeStatus(doc, "api-status");
        String response;
        serializeJson(doc, response);
        request->send(200, "application/json", response);
    });

    server.on("/api/wifi/scan", HTTP_GET, [](AsyncWebServerRequest *request){
        int n = WiFi.scanComplete();
        if (n == -2) {
            WiFi.scanNetworks(true, true);
            request->send(202, "application/json", "{\"status\":\"scanning\"}");
            return;
        }
        if (n == -1) {
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
            if (ssid.length() == 0) {
                continue;
            }
            sorted.push_back({ssid, WiFi.RSSI(i), WiFi.encryptionType(i) == WIFI_AUTH_OPEN});
        }

        std::sort(sorted.begin(), sorted.end(), [](const ScannedNetwork& a, const ScannedNetwork& b) {
            return a.rssi > b.rssi;
        });

        JsonDocument doc;
        JsonArray networks = doc["networks"].to<JsonArray>();
        for (const auto &entry : sorted) {
            JsonObject net = networks.add<JsonObject>();
            net["ssid"] = entry.ssid;
            net["rssi"] = entry.rssi;
            net["open"] = entry.open;
        }
        WiFi.scanDelete();

        String response;
        serializeJson(doc, response);
        request->send(200, "application/json", response);
    });

    server.on("/api/wifi/connect", HTTP_POST, [](AsyncWebServerRequest *request){}, NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){
            (void)index;
            (void)total;
            JsonDocument doc;
            if (deserializeJson(doc, data, len)) {
                request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
                return;
            }

            String ssid = doc["ssid"].as<String>();
            String password = doc["password"].as<String>();
            ssid.trim();
            if (ssid.length() == 0) {
                request->send(400, "application/json", "{\"error\":\"SSID required\"}");
                return;
            }

            staSsid = ssid;
            staPassword = password;
            saveConfig();
            shouldConnectWifi = true;

            request->send(200, "application/json", "{\"status\":\"connecting\"}");
        });

    server.on("/api/wifi/disconnect", HTTP_POST, [](AsyncWebServerRequest *request){
        WiFi.disconnect();
        staSsid = "";
        staPassword = "";
        saveConfig();
        broadcastStatus("wifi-forgotten");
        request->send(200, "application/json", "{\"status\":\"forgotten\"}");
    });

    server.on("/api/settings", HTTP_GET, [](AsyncWebServerRequest *request){
        JsonDocument doc;
        doc["upload_interval_ms"] = uploadIntervalMs;
        String response;
        serializeJson(doc, response);
        request->send(200, "application/json", response);
    });

    server.on("/api/settings", HTTP_POST, [](AsyncWebServerRequest *request){}, NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){
            (void)index;
            (void)total;
            JsonDocument doc;
            if (deserializeJson(doc, data, len)) {
                request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
                return;
            }

            if (!doc["upload_interval_ms"].is<uint32_t>()) {
                request->send(400, "application/json", "{\"error\":\"upload_interval_ms required\"}");
                return;
            }

            uint32_t requested = doc["upload_interval_ms"].as<uint32_t>();
            if (requested < 1000 || requested > 600000) {
                request->send(400, "application/json", "{\"error\":\"upload_interval_ms must be 1000-600000\"}");
                return;
            }

            uploadIntervalMs = requested;
            saveConfig();
            broadcastStatus("settings-updated");
            request->send(200, "application/json", "{\"status\":\"saved\"}");
        });

    events.onConnect([](AsyncEventSourceClient *client){
        if (client->lastId()) {
            Serial.printf("SSE reconnect id: %u\n", client->lastId());
        }
        client->send("connected", "hello", millis());
        broadcastStatus("client-connected");
    });

    server.addHandler(&events);
    server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");

    server.onNotFound([](AsyncWebServerRequest *request){
        if (request->method() == HTTP_OPTIONS) {
            request->send(200);
            return;
        }
        request->send(LittleFS, "/index.html", "text/html");
    });
}

void setup() {
    Serial.begin(115200);
    delay(1000);

    if (!LittleFS.begin(true)) {
        Serial.println("LittleFS mount failed");
        return;
    }

    loadConfig();

    WiFi.mode(WIFI_AP_STA);
    Serial2.begin(SCALE_BAUDRATE, SERIAL_8N1, SCALE_RX_PIN, -1);
    WiFi.onEvent(onWifiEvent);
    WiFi.softAP(AP_SSID);

    dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());

    if (staSsid.length() > 0) {
        shouldConnectWifi = true;
    }

    server.addHandler(new CaptiveRequestHandler()).setFilter(ON_AP_FILTER);
    setupRoutes();

    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers", "Content-Type");

    server.begin();
}

void loop() {
    dnsServer.processNextRequest();
    readWeightFromScale();
    postWeightToServer();

    if (shouldConnectWifi) {
        shouldConnectWifi = false;
        WiFi.disconnect();
        delay(100);
        WiFi.begin(staSsid.c_str(), staPassword.c_str());
        wifiConnectStartMs = millis();
        broadcastStatus("wifi-connect-requested");
    }

    if (wifiConnectStartMs > 0 && WiFi.status() != WL_CONNECTED && millis() - wifiConnectStartMs > WIFI_CONNECT_TIMEOUT_MS) {
        WiFi.disconnect();
        wifiConnectStartMs = 0;
        broadcastStatus("wifi-timeout");
    }

    if (WiFi.status() != WL_CONNECTED && staSsid.length() > 0 && wifiConnectStartMs == 0) {
        if (millis() - lastReconnectAttemptMs > WIFI_RECONNECT_INTERVAL_MS) {
            lastReconnectAttemptMs = millis();
            shouldConnectWifi = true;
        }
    }

    if (millis() - lastStatusBroadcastMs > 1000) {
        lastStatusBroadcastMs = millis();
        broadcastStatus("heartbeat");
    }

    delay(2);
}
