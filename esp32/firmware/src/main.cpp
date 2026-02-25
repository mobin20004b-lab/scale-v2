#include <Arduino.h>
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <DNSServer.h>
#include <LittleFS.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <esp_wifi.h>
#include <Adafruit_NeoPixel.h>
#include <algorithm>
#include <vector>

DNSServer dnsServer;
AsyncWebServer server(80);
AsyncEventSource events("/api/events");
Preferences preferences;

const byte DNS_PORT = 53;
const char* AP_SSID = "ESP32-S3-Setup";

String sta_ssid = "";
String sta_password = "";
String custom_token = "";
String custom_domain = "";
String device_name = "ESP32 Controller";
String wifi_hostname = "esp32-controller";
uint32_t wifi_timeout_ms = 15000;
uint32_t reconnect_interval_ms = 15000;
bool auto_reconnect = true;
uint8_t wifi_power_save = WIFI_PS_MIN_MODEM;

bool shouldConnectWifi = false;
bool restartRequested = false;
unsigned long wifiConnectStartTime = 0;
unsigned long lastReconnectAttempt = 0;
unsigned long lastStatusBroadcast = 0;
uint32_t connectionAttempts = 0;
String lastDisconnectReason = "none";

#ifndef RGB_LED_PIN
#define RGB_LED_PIN 48
#endif

#ifndef RGB_LED_COUNT
#define RGB_LED_COUNT 1
#endif

Adafruit_NeoPixel rgbLed(RGB_LED_COUNT, RGB_LED_PIN, NEO_GRB + NEO_KHZ800);

enum class LedState {
    WAITING_CONFIG,
    CONNECTING,
    CONNECTED,
    ERROR,
    RESTARTING
};

LedState ledState = LedState::WAITING_CONFIG;
unsigned long ledTickMs = 0;
uint16_t ledPulse = 0;

const char* ledStateToString(LedState state) {
    switch (state) {
        case LedState::WAITING_CONFIG: return "waiting-config";
        case LedState::CONNECTING: return "connecting";
        case LedState::CONNECTED: return "connected";
        case LedState::ERROR: return "error";
        case LedState::RESTARTING: return "restarting";
        default: return "unknown";
    }
}

void setLedState(LedState state) {
    ledState = state;
}

void updateRgbLed() {
    if (millis() - ledTickMs < 20) {
        return;
    }
    ledTickMs = millis();
    ledPulse += 512;

    uint8_t level = 0;
    uint32_t color = 0;

    switch (ledState) {
        case LedState::WAITING_CONFIG:
            level = (sin(ledPulse / 65535.0f * 6.28318f) * 0.5f + 0.5f) * 70;
            color = rgbLed.Color(0, 0, level);
            break;
        case LedState::CONNECTING:
            level = ((ledPulse / 4096) % 2 == 0) ? 90 : 10;
            color = rgbLed.Color(level, level / 2, 0);
            break;
        case LedState::CONNECTED:
            color = rgbLed.Color(0, 110, 0);
            break;
        case LedState::ERROR:
            level = ((ledPulse / 4096) % 2 == 0) ? 120 : 0;
            color = rgbLed.Color(level, 0, 0);
            break;
        case LedState::RESTARTING:
            level = ((ledPulse / 2048) % 2 == 0) ? 120 : 0;
            color = rgbLed.Color(level, 0, level);
            break;
    }

    rgbLed.setPixelColor(0, color);
    rgbLed.show();
}

void refreshLedStateFromNetwork() {
    if (restartRequested) {
        setLedState(LedState::RESTARTING);
        return;
    }
    if (WiFi.status() == WL_CONNECTED) {
        setLedState(LedState::CONNECTED);
    } else if (wifiConnectStartTime > 0 || shouldConnectWifi) {
        setLedState(LedState::CONNECTING);
    } else if (sta_ssid == "") {
        setLedState(LedState::WAITING_CONFIG);
    } else {
        setLedState(LedState::ERROR);
    }
}

void applyWifiPowerSave() {
    esp_wifi_set_ps((wifi_ps_type_t)wifi_power_save);
}

void loadConfig() {
    preferences.begin("config", false);
    sta_ssid = preferences.getString("ssid", "");
    sta_password = preferences.getString("password", "");
    custom_token = preferences.getString("token", "");
    custom_domain = preferences.getString("domain", "");
    device_name = preferences.getString("dev_name", "ESP32 Controller");
    wifi_hostname = preferences.getString("hostname", "esp32-controller");
    wifi_timeout_ms = preferences.getUInt("wifi_to", 15000);
    reconnect_interval_ms = preferences.getUInt("rc_int", 15000);
    auto_reconnect = preferences.getBool("auto_rc", true);
    wifi_power_save = preferences.getUChar("wifi_ps", WIFI_PS_MIN_MODEM);
    preferences.end();

    if (wifi_timeout_ms < 5000 || wifi_timeout_ms > 60000) {
        wifi_timeout_ms = 15000;
    }
    if (reconnect_interval_ms < 3000 || reconnect_interval_ms > 120000) {
        reconnect_interval_ms = 15000;
    }
    if (wifi_hostname.length() < 3 || wifi_hostname.length() > 32) {
        wifi_hostname = "esp32-controller";
    }
    if (wifi_power_save > WIFI_PS_MAX_MODEM) {
        wifi_power_save = WIFI_PS_MIN_MODEM;
    }
}

void saveConfig() {
    preferences.begin("config", false);
    preferences.putString("ssid", sta_ssid);
    preferences.putString("password", sta_password);
    preferences.putString("token", custom_token);
    preferences.putString("domain", custom_domain);
    preferences.putString("dev_name", device_name);
    preferences.putString("hostname", wifi_hostname);
    preferences.putUInt("wifi_to", wifi_timeout_ms);
    preferences.putUInt("rc_int", reconnect_interval_ms);
    preferences.putBool("auto_rc", auto_reconnect);
    preferences.putUChar("wifi_ps", wifi_power_save);
    preferences.end();
}

void broadcastStatus(const char* reason = "update") {
    JsonDocument doc;
    doc["reason"] = reason;
    doc["device_name"] = device_name;
    doc["ap_ssid"] = AP_SSID;
    doc["ap_ip"] = WiFi.softAPIP().toString();
    doc["sta_ssid"] = sta_ssid;
    doc["sta_connected"] = WiFi.status() == WL_CONNECTED;
    doc["sta_ip"] = WiFi.localIP().toString();
    doc["uptime_seconds"] = millis() / 1000;
    doc["wifi_timeout_ms"] = wifi_timeout_ms;
    doc["reconnect_interval_ms"] = reconnect_interval_ms;
    doc["auto_reconnect"] = auto_reconnect;
    doc["rssi"] = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0;
    doc["connection_attempts"] = connectionAttempts;
    doc["last_disconnect_reason"] = lastDisconnectReason;
    doc["wifi_power_save"] = wifi_power_save;
    doc["wifi_hostname"] = wifi_hostname;
    doc["free_heap_bytes"] = ESP.getFreeHeap();
    doc["wifi_channel"] = WiFi.status() == WL_CONNECTED ? WiFi.channel() : 0;
    doc["led_state"] = ledStateToString(ledState);

    String response;
    serializeJson(doc, response);
    events.send(response.c_str(), "status", millis());
}

class CaptiveRequestHandler : public AsyncWebHandler {
public:
    CaptiveRequestHandler() {}
    virtual ~CaptiveRequestHandler() {}

    bool canHandle(AsyncWebServerRequest *request){
        String host = request->host();
        if (host != WiFi.softAPIP().toString() && host != "192.168.4.1") {
            return true;
        }
        return false;
    }

    void handleRequest(AsyncWebServerRequest *request) {
        request->redirect("http://" + WiFi.softAPIP().toString() + "/");
    }
};

void setupRoutes() {
    server.on("/api/status", HTTP_GET, [](AsyncWebServerRequest *request){
        JsonDocument doc;
        doc["device_name"] = device_name;
        doc["ap_ssid"] = AP_SSID;
        doc["ap_ip"] = WiFi.softAPIP().toString();
        doc["sta_ssid"] = sta_ssid;
        doc["sta_connected"] = WiFi.status() == WL_CONNECTED;
        doc["sta_ip"] = WiFi.localIP().toString();
        doc["uptime_seconds"] = millis() / 1000;
        doc["wifi_timeout_ms"] = wifi_timeout_ms;
        doc["reconnect_interval_ms"] = reconnect_interval_ms;
        doc["auto_reconnect"] = auto_reconnect;
        doc["rssi"] = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0;
        doc["connection_attempts"] = connectionAttempts;
        doc["last_disconnect_reason"] = lastDisconnectReason;
        doc["wifi_power_save"] = wifi_power_save;
        doc["wifi_hostname"] = wifi_hostname;
        doc["free_heap_bytes"] = ESP.getFreeHeap();
        doc["wifi_channel"] = WiFi.status() == WL_CONNECTED ? WiFi.channel() : 0;
        doc["led_state"] = ledStateToString(ledState);

        String response;
        serializeJson(doc, response);
        request->send(200, "application/json", response);
    });


    server.on("/api/wifi/scan", HTTP_GET, [](AsyncWebServerRequest *request){
        int n = WiFi.scanComplete();
        if(n == -2){
            WiFi.scanNetworks(true, true);
            request->send(202, "application/json", "{\"status\":\"scanning\"}");
        } else if(n == -1){
            request->send(202, "application/json", "{\"status\":\"scanning\"}");
        } else {
            struct ScannedNetwork {
                String ssid;
                int32_t rssi;
                bool open;
                int32_t channel;
            };

            std::vector<ScannedNetwork> sorted;
            sorted.reserve(n);
            for (int i = 0; i < n; ++i) {
                String ssid = WiFi.SSID(i);
                if (ssid.length() == 0) {
                    continue;
                }
                sorted.push_back({ssid, WiFi.RSSI(i), WiFi.encryptionType(i) == WIFI_AUTH_OPEN, WiFi.channel(i)});
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
                net["channel"] = entry.channel;
            }
            WiFi.scanDelete();
            String response;
            serializeJson(doc, response);
            request->send(200, "application/json", response);
        }
    });

    server.on("/api/wifi/connect", HTTP_POST, [](AsyncWebServerRequest *request){}, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){
        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, data, len);
        if (error) {
            request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
            return;
        }

        sta_ssid = doc["ssid"].as<String>();
        sta_password = doc["password"].as<String>();
        saveConfig();

        shouldConnectWifi = true;

        request->send(200, "application/json", "{\"status\":\"connecting\"}");
    });

    server.on("/api/wifi/reconnect", HTTP_POST, [](AsyncWebServerRequest *request){
        if (sta_ssid == "") {
            request->send(400, "application/json", "{\"error\":\"No saved Wi-Fi\"}");
            return;
        }
        shouldConnectWifi = true;
        request->send(200, "application/json", "{\"status\":\"reconnecting\"}");
    });

    server.on("/api/wifi/disconnect", HTTP_POST, [](AsyncWebServerRequest *request){
        WiFi.disconnect();
        sta_ssid = "";
        sta_password = "";
        saveConfig();
        broadcastStatus("wifi-forgotten");
        request->send(200, "application/json", "{\"status\":\"disconnected\"}");
    });

    server.on("/api/wifi/test", HTTP_GET, [](AsyncWebServerRequest *request){
        if(WiFi.status() != WL_CONNECTED){
            request->send(200, "application/json", "{\"result\":\"Not connected to Wi-Fi\"}");
            return;
        }
        HTTPClient http;
        http.begin("http://www.google.com/generate_204");
        int httpCode = http.GET();
        http.end();

        JsonDocument doc;
        if(httpCode == 204 || httpCode == 200){
            doc["result"] = "Success";
        } else {
            doc["result"] = "Failed (HTTP " + String(httpCode) + ")";
        }
        String response;
        serializeJson(doc, response);
        request->send(200, "application/json", response);
    });

    server.on("/api/config", HTTP_GET, [](AsyncWebServerRequest *request){
        JsonDocument doc;
        doc["token"] = custom_token;
        doc["domain"] = custom_domain;
        doc["device_name"] = device_name;
        doc["wifi_hostname"] = wifi_hostname;
        doc["wifi_timeout_ms"] = wifi_timeout_ms;
        doc["reconnect_interval_ms"] = reconnect_interval_ms;
        doc["auto_reconnect"] = auto_reconnect;
        doc["wifi_power_save"] = wifi_power_save;
        String response;
        serializeJson(doc, response);
        request->send(200, "application/json", response);
    });

    server.on("/api/config", HTTP_POST, [](AsyncWebServerRequest *request){}, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){
        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, data, len);
        if (error) {
            request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
            return;
        }

        custom_token = doc["token"].as<String>();
        custom_domain = doc["domain"].as<String>();
        if (doc["device_name"].is<String>()) {
            device_name = doc["device_name"].as<String>();
        }
        if (doc["wifi_hostname"].is<String>()) {
            String requestedHostname = doc["wifi_hostname"].as<String>();
            requestedHostname.trim();
            if (requestedHostname.length() >= 3 && requestedHostname.length() <= 32) {
                wifi_hostname = requestedHostname;
            }
        }
        if (doc["wifi_timeout_ms"].is<uint32_t>()) {
            uint32_t requestedTimeout = doc["wifi_timeout_ms"].as<uint32_t>();
            if (requestedTimeout >= 5000 && requestedTimeout <= 60000) {
                wifi_timeout_ms = requestedTimeout;
            }
        }
        if (doc["reconnect_interval_ms"].is<uint32_t>()) {
            uint32_t requestedReconnect = doc["reconnect_interval_ms"].as<uint32_t>();
            if (requestedReconnect >= 3000 && requestedReconnect <= 120000) {
                reconnect_interval_ms = requestedReconnect;
            }
        }
        if (doc["auto_reconnect"].is<bool>()) {
            auto_reconnect = doc["auto_reconnect"].as<bool>();
        }
        if (doc["wifi_power_save"].is<uint8_t>()) {
            uint8_t requestedPowerSave = doc["wifi_power_save"].as<uint8_t>();
            if (requestedPowerSave <= WIFI_PS_MAX_MODEM) {
                wifi_power_save = requestedPowerSave;
                applyWifiPowerSave();
            }
        }
        saveConfig();

        request->send(200, "application/json", "{\"status\":\"saved\"}");
        broadcastStatus("config-updated");
    });

    server.on("/api/system/restart", HTTP_POST, [](AsyncWebServerRequest *request){
        restartRequested = true;
        request->send(200, "application/json", "{\"status\":\"restarting\"}");
    });

    events.onConnect([](AsyncEventSourceClient *client){
        if(client->lastId()) {
            Serial.printf("Client reconnected! Last message ID that it got is: %u\n", client->lastId());
        }
        client->send("connected", "hello", millis());
        broadcastStatus("client-connected");
    });
    server.addHandler(&events);

    server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");

    server.onNotFound([](AsyncWebServerRequest *request){
        if (request->method() == HTTP_OPTIONS) {
            request->send(200);
        } else {
            request->send(LittleFS, "/index.html", "text/html");
        }
    });
}

void onWifiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
    switch (event) {
        case ARDUINO_EVENT_WIFI_STA_GOT_IP:
            Serial.println("Connected to Wi-Fi!");
            Serial.print("IP Address: ");
            Serial.println(WiFi.localIP());
            lastDisconnectReason = "none";
            wifiConnectStartTime = 0;
            setLedState(LedState::CONNECTED);
            broadcastStatus("wifi-connected");
            break;
        case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
            lastDisconnectReason = String(info.wifi_sta_disconnected.reason);
            Serial.printf("Wi-Fi disconnected. Reason code: %s\n", lastDisconnectReason.c_str());
            setLedState(sta_ssid == "" ? LedState::WAITING_CONFIG : LedState::ERROR);
            broadcastStatus("wifi-disconnected");
            break;
        default:
            break;
    }
}

void setup() {
    Serial.begin(115200);
    delay(1000);

    if(!LittleFS.begin(true)){
        Serial.println("An Error has occurred while mounting LittleFS");
        return;
    }

    loadConfig();

    rgbLed.begin();
    rgbLed.setBrightness(100);
    rgbLed.clear();
    rgbLed.show();

    WiFi.mode(WIFI_AP_STA);
    WiFi.setHostname(wifi_hostname.c_str());
    applyWifiPowerSave();
    WiFi.onEvent(onWifiEvent);
    WiFi.softAP(AP_SSID);
    Serial.print("AP IP address: ");
    Serial.println(WiFi.softAPIP());

    dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());

    if(sta_ssid != ""){
        connectionAttempts++;
        WiFi.begin(sta_ssid.c_str(), sta_password.c_str());
        wifiConnectStartTime = millis();
        setLedState(LedState::CONNECTING);
        Serial.println("Connecting to saved Wi-Fi...");
    } else {
        setLedState(LedState::WAITING_CONFIG);
    }

    server.addHandler(new CaptiveRequestHandler()).setFilter(ON_AP_FILTER);

    setupRoutes();

    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers", "Content-Type");

    server.begin();
    Serial.println("HTTP server started");
}

void loop() {
    dnsServer.processNextRequest();

    if(shouldConnectWifi){
        shouldConnectWifi = false;
        connectionAttempts++;
        WiFi.disconnect();
        delay(100);
        WiFi.begin(sta_ssid.c_str(), sta_password.c_str());
        wifiConnectStartTime = millis();
        setLedState(LedState::CONNECTING);
        Serial.print("Connecting to ");
        Serial.println(sta_ssid);
        broadcastStatus("wifi-connect-requested");
    }

    if(wifiConnectStartTime > 0){
        if(WiFi.status() == WL_CONNECTED){
            wifiConnectStartTime = 0;
        } else if(millis() - wifiConnectStartTime > wifi_timeout_ms){
            Serial.println("Wi-Fi connection timeout.");
            WiFi.disconnect();
            lastDisconnectReason = "connect-timeout";
            wifiConnectStartTime = 0;
            setLedState(LedState::ERROR);
            broadcastStatus("wifi-timeout");
        }
    }

    if (auto_reconnect && WiFi.status() != WL_CONNECTED && sta_ssid != "" && wifiConnectStartTime == 0) {
        if (millis() - lastReconnectAttempt > reconnect_interval_ms) {
            lastReconnectAttempt = millis();
            shouldConnectWifi = true;
            Serial.println("Auto-reconnect triggered");
        }
    }

    if (millis() - lastStatusBroadcast > 1000) {
        lastStatusBroadcast = millis();
        broadcastStatus("heartbeat");
    }

    if (restartRequested) {
        setLedState(LedState::RESTARTING);
        updateRgbLed();
        delay(500);
        ESP.restart();
    }

    refreshLedStateFromNetwork();
    updateRgbLed();

    delay(2);
}
