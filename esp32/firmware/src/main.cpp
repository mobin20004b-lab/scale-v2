#include <Arduino.h>
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <DNSServer.h>
#include <LittleFS.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>

DNSServer dnsServer;
AsyncWebServer server(80);
Preferences preferences;

const byte DNS_PORT = 53;
const char* AP_SSID = "ESP32-S3-Setup";

String sta_ssid = "";
String sta_password = "";
String custom_token = "";
String custom_domain = "";
String device_name = "ESP32 Controller";
uint32_t wifi_timeout_ms = 15000;
bool auto_reconnect = true;

bool shouldConnectWifi = false;
bool restartRequested = false;
unsigned long wifiConnectStartTime = 0;
unsigned long lastReconnectAttempt = 0;

void loadConfig() {
    preferences.begin("config", false);
    sta_ssid = preferences.getString("ssid", "");
    sta_password = preferences.getString("password", "");
    custom_token = preferences.getString("token", "");
    custom_domain = preferences.getString("domain", "");
    device_name = preferences.getString("dev_name", "ESP32 Controller");
    wifi_timeout_ms = preferences.getUInt("wifi_to", 15000);
    auto_reconnect = preferences.getBool("auto_rc", true);
    preferences.end();

    if (wifi_timeout_ms < 5000 || wifi_timeout_ms > 60000) {
        wifi_timeout_ms = 15000;
    }
}

void saveConfig() {
    preferences.begin("config", false);
    preferences.putString("ssid", sta_ssid);
    preferences.putString("password", sta_password);
    preferences.putString("token", custom_token);
    preferences.putString("domain", custom_domain);
    preferences.putString("dev_name", device_name);
    preferences.putUInt("wifi_to", wifi_timeout_ms);
    preferences.putBool("auto_rc", auto_reconnect);
    preferences.end();
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
        doc["auto_reconnect"] = auto_reconnect;
        doc["rssi"] = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0;

        String response;
        serializeJson(doc, response);
        request->send(200, "application/json", response);
    });


    server.on("/api/wifi/scan", HTTP_GET, [](AsyncWebServerRequest *request){
        int n = WiFi.scanComplete();
        if(n == -2){
            WiFi.scanNetworks(true);
            request->send(202, "application/json", "{\"status\":\"scanning\"}");
        } else if(n == -1){
            request->send(202, "application/json", "{\"status\":\"scanning\"}");
        } else {
            JsonDocument doc;
            JsonArray networks = doc["networks"].to<JsonArray>();
            for (int i = 0; i < n; ++i) {
                JsonObject net = networks.add<JsonObject>();
                net["ssid"] = WiFi.SSID(i);
                net["rssi"] = WiFi.RSSI(i);
                net["open"] = WiFi.encryptionType(i) == WIFI_AUTH_OPEN;
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

    server.on("/api/wifi/disconnect", HTTP_POST, [](AsyncWebServerRequest *request){
        WiFi.disconnect();
        sta_ssid = "";
        sta_password = "";
        saveConfig();
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
        doc["wifi_timeout_ms"] = wifi_timeout_ms;
        doc["auto_reconnect"] = auto_reconnect;
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
        if (doc["wifi_timeout_ms"].is<uint32_t>()) {
            uint32_t requestedTimeout = doc["wifi_timeout_ms"].as<uint32_t>();
            if (requestedTimeout >= 5000 && requestedTimeout <= 60000) {
                wifi_timeout_ms = requestedTimeout;
            }
        }
        if (doc["auto_reconnect"].is<bool>()) {
            auto_reconnect = doc["auto_reconnect"].as<bool>();
        }
        saveConfig();

        request->send(200, "application/json", "{\"status\":\"saved\"}");
    });

    server.on("/api/system/restart", HTTP_POST, [](AsyncWebServerRequest *request){
        restartRequested = true;
        request->send(200, "application/json", "{\"status\":\"restarting\"}");
    });

    server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");

    server.onNotFound([](AsyncWebServerRequest *request){
        if (request->method() == HTTP_OPTIONS) {
            request->send(200);
        } else {
            request->send(LittleFS, "/index.html", "text/html");
        }
    });
}

void setup() {
    Serial.begin(115200);
    delay(1000);

    if(!LittleFS.begin(true)){
        Serial.println("An Error has occurred while mounting LittleFS");
        return;
    }

    loadConfig();

    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP(AP_SSID);
    Serial.print("AP IP address: ");
    Serial.println(WiFi.softAPIP());

    dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());

    if(sta_ssid != ""){
        WiFi.begin(sta_ssid.c_str(), sta_password.c_str());
        Serial.println("Connecting to saved Wi-Fi...");
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
        WiFi.disconnect();
        delay(100);
        WiFi.begin(sta_ssid.c_str(), sta_password.c_str());
        wifiConnectStartTime = millis();
        Serial.print("Connecting to ");
        Serial.println(sta_ssid);
    }

    if(wifiConnectStartTime > 0){
        if(WiFi.status() == WL_CONNECTED){
            Serial.println("Connected to Wi-Fi!");
            Serial.print("IP Address: ");
            Serial.println(WiFi.localIP());
            wifiConnectStartTime = 0;
        } else if(millis() - wifiConnectStartTime > wifi_timeout_ms){
            Serial.println("Wi-Fi connection timeout.");
            WiFi.disconnect();
            wifiConnectStartTime = 0;
        }
    }

    if (auto_reconnect && WiFi.status() != WL_CONNECTED && sta_ssid != "" && wifiConnectStartTime == 0) {
        if (millis() - lastReconnectAttempt > 15000) {
            lastReconnectAttempt = millis();
            shouldConnectWifi = true;
            Serial.println("Auto-reconnect triggered");
        }
    }

    if (restartRequested) {
        delay(500);
        ESP.restart();
    }

    delay(10);
}
