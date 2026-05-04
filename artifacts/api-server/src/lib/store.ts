import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../../data");
const EVENTS_FILE = path.join(DATA_DIR, "events.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");

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
}

function readJSON<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(file: string, data: unknown) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

export const store = {
  getEvents(): StoredEvent[] {
    return readJSON<StoredEvent[]>(EVENTS_FILE, []);
  },
  addEvent(event: StoredEvent) {
    const events = this.getEvents();
    events.unshift(event);
    const trimmed = events.slice(0, 10000);
    writeJSON(EVENTS_FILE, trimmed);
    return event;
  },
  clearEvents() {
    writeJSON(EVENTS_FILE, []);
  },

  getUsers(): StoredUser[] {
    return readJSON<StoredUser[]>(USERS_FILE, []);
  },
  upsertUser(user: StoredUser) {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.hwid === user.hwid);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...user };
    } else {
      users.push(user);
    }
    writeJSON(USERS_FILE, users);
    return user;
  },
  updateUser(id: string, updates: Partial<StoredUser>) {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) return null;
    users[idx] = { ...users[idx], ...updates };
    writeJSON(USERS_FILE, users);
    return users[idx];
  },
  deleteUser(id: string) {
    const users = this.getUsers().filter((u) => u.id !== id);
    writeJSON(USERS_FILE, users);
  },

  getStats() {
    const events = this.getEvents();
    const users = this.getUsers();
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
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      totalUsers: users.length,
      bannedUsers: users.filter((u) => u.banned).length,
      totalEvents: events.length,
      criticalEvents: bySeverity.critical,
      highEvents: bySeverity.high,
      eventsLast24h: events.filter((e) => e.timestamp >= last24h).length,
      bySeverity,
      hourlyActivity,
      topThreats,
    };
  },
};
