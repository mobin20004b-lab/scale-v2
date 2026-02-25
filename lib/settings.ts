import { promises as fs } from "node:fs";
import path from "node:path";

const settingsPath = path.join(process.cwd(), "data", "system-settings.json");

const defaultSettings = {
  security: { defaultRateLimit: 120, tokenExpirationDays: 90 },
  api: { externalEnabled: true },
  users: { activeUsers: {} }
};

export async function readSettings() {
  try {
    const raw = await fs.readFile(settingsPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    await fs.mkdir(path.dirname(settingsPath), { recursive: true });
    await fs.writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2), "utf-8");
    return defaultSettings;
  }
}
