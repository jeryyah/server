import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../../data");

function filePath(name: string) { return path.join(DATA_DIR, name); }
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export interface StoredEvent {
  id: string;
  type: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: string;
  hwid: string;
  username: string;
  details?: string;
  screenshotUrl?: string;
}

export interface StoredUser {
  id: string;
  username: string;
  hwid: string;
  role: "admin" | "user";
  banned: boolean;
  registeredAt: string;
  lastSeen: string;
  detectionCount: number;
  generatedPassword?: string;
}

export interface StoredDevice {
  hwid: string;
  username: string;
  deviceName: string;
  model: string;
  os: string;
  ip: string;
  lastSeen: string;
  screenshotBase64?: string;
  status: "online" | "offline";
  loginCount: number;
}

function readJSON<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch { return fallback; }
}

function writeJSON(file: string, data: unknown) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

export const store = {
  /* ─── Events ─── */
  getEvents(): StoredEvent[] { return readJSON<StoredEvent[]>(filePath("events.json"), []); },
  addEvent(event: StoredEvent) {
    const events = this.getEvents();
    events.unshift(event);
    writeJSON(filePath("events.json"), events.slice(0, 10000));
    return event;
  },
  clearEvents() { writeJSON(filePath("events.json"), []); },

  /* ─── Users ─── */
  getUsers(): StoredUser[] { return readJSON<StoredUser[]>(filePath("users.json"), []); },
  upsertUser(user: StoredUser) {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.hwid === user.hwid);
    if (idx >= 0) { users[idx] = { ...users[idx], ...user }; }
    else { users.push(user); }
    writeJSON(filePath("users.json"), users);
    return users[idx >= 0 ? idx : users.length - 1];
  },
  updateUser(id: string, updates: Partial<StoredUser>) {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) return null;
    users[idx] = { ...users[idx], ...updates };
    writeJSON(filePath("users.json"), users);
    return users[idx];
  },
  deleteUser(id: string) {
    writeJSON(filePath("users.json"), this.getUsers().filter((u) => u.id !== id));
  },

  /* ─── Devices ─── */
  getDevices(): StoredDevice[] { return readJSON<StoredDevice[]>(filePath("devices.json"), []); },
  upsertDevice(device: Partial<StoredDevice> & { hwid: string }) {
    const devices = this.getDevices();
    const idx = devices.findIndex((d) => d.hwid === device.hwid);
    const base: StoredDevice = {
      hwid: device.hwid,
      username: device.username ?? "",
      deviceName: device.deviceName ?? "Unknown Device",
      model: device.model ?? "",
      os: device.os ?? "",
      ip: device.ip ?? "",
      lastSeen: new Date().toISOString(),
      status: "online",
      loginCount: 1,
      screenshotBase64: device.screenshotBase64,
    };
    if (idx >= 0) {
      devices[idx] = {
        ...devices[idx],
        ...device,
        lastSeen: new Date().toISOString(),
        status: "online",
        loginCount: (devices[idx].loginCount ?? 0) + 1,
      };
    } else {
      devices.push(base);
    }
    writeJSON(filePath("devices.json"), devices);
    return devices[idx >= 0 ? idx : devices.length - 1];
  },
  setDeviceOffline(hwid: string) {
    const devices = this.getDevices();
    const idx = devices.findIndex((d) => d.hwid === hwid);
    if (idx >= 0) { devices[idx].status = "offline"; writeJSON(filePath("devices.json"), devices); }
  },
  updateDeviceScreenshot(hwid: string, screenshotBase64: string) {
    const devices = this.getDevices();
    const idx = devices.findIndex((d) => d.hwid === hwid);
    if (idx >= 0) { devices[idx].screenshotBase64 = screenshotBase64; writeJSON(filePath("devices.json"), devices); }
  },

  /* ─── Stats ─── */
  getStats() {
    const events = this.getEvents();
    const users = this.getUsers();
    const devices = this.getDevices();
    const now = Date.now();
    const last24h = new Date(now - 86400000).toISOString();

    const byType: Record<string, number> = {};
    const bySeverity = { low: 0, medium: 0, high: 0, critical: 0 };
    const recentHours: Record<number, number> = {};

    for (const e of events) {
      byType[e.type] = (byType[e.type] ?? 0) + 1;
      bySeverity[e.severity] = (bySeverity[e.severity] ?? 0) + 1;
      if (e.timestamp >= last24h) {
        const hr = new Date(e.timestamp).getHours();
        recentHours[hr] = (recentHours[hr] ?? 0) + 1;
      }
    }

    const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      count: recentHours[i] ?? 0,
    }));

    const topThreats = Object.entries(byType)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      totalUsers: users.length,
      bannedUsers: users.filter((u) => u.banned).length,
      totalEvents: events.length,
      criticalEvents: bySeverity.critical,
      highEvents: bySeverity.high,
      eventsLast24h: events.filter((e) => e.timestamp >= last24h).length,
      onlineDevices: devices.filter((d) => d.status === "online").length,
      bySeverity,
      hourlyActivity,
      topThreats,
    };
  },
};
