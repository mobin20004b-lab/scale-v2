#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace scale_v2 {

enum class FeatureFlag {
  kOta,
  kBleProvisioning,
  kPowerSaver,
  kRemoteLogging
};

struct DeviceConfig {
  std::string wifi_ssid;
  std::string wifi_password;
  std::string mqtt_host;
  uint16_t mqtt_port = 1883;
  bool mqtt_tls = false;

  uint8_t led_brightness = 128;
  uint16_t sampling_ms = 1000;
  bool auto_restart = true;
  std::vector<FeatureFlag> enabled_features;
};

struct TelemetrySnapshot {
  int16_t rssi_dbm = -90;
  uint32_t uptime_minutes = 0;
  float temperature_c = 0.0f;
  uint8_t cpu_load_pct = 0;
};

inline bool ValidateConfig(const DeviceConfig& config) {
  const bool has_network = !config.wifi_ssid.empty();
  const bool valid_mqtt_port = config.mqtt_port >= 1 && config.mqtt_port <= 65535;
  const bool valid_sampling = config.sampling_ms >= 100 && config.sampling_ms <= 5000;

  return has_network && valid_mqtt_port && valid_sampling;
}

}  // namespace scale_v2
