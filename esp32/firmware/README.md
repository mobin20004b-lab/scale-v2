# ESP32 Firmware Configuration Surface

This folder documents and defines a richer settings/capability model to match the new PrimeVue dashboard.

## Added settings domains

- Connectivity (`wifiSsid`, `wifiPassword`, `mqttHost`, `mqttPort`, `mqttTls`)
- Device behavior (`ledBrightness`, `samplingMs`, `autoRestart`)
- Capabilities toggles (OTA, BLE provisioning, power saver, remote logging)

## Suggested API routes

- `GET /api/v1/config` return active config
- `PUT /api/v1/config` validate and persist incoming config
- `GET /api/v1/telemetry` basic live health metrics for dashboard cards

These routes are represented by C++ stubs in `src/settings_api.h` and can be wired into ESP-IDF HTTP server handlers.
