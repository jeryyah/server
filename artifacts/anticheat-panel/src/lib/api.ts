import { getToken } from "./auth";

const BASE = "/api";

export interface ApiEvent {
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

export interface ApiUser {
  id: string;
  username: string;
  hwid: string;
  role: "admin" | "user";
  banned: boolean;
  registeredAt: string;
  lastSeen: string;
  detectionCount: number;
}

export interface ApiStats {
  totalUsers: number;
  bannedUsers: number;
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  eventsLast24h: number;
  onlineDevices: number;
  bySeverity: { low: number; medium: number; high: number; critical: number };
  hourlyActivity: { hour: string; count: number }[];
  topThreats: { name: string; count: number }[];
}

function headers() {
  return {
    "Content-Type": "application/json",
    "x-panel-token": getToken() ?? "",
  };
}

async function request<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, { headers: headers(), ...opts });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  getStats: () => request<ApiStats>("/stats"),
  getEvents: (params?: { severity?: string; username?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.severity) q.set("severity", params.severity);
    if (params?.username) q.set("username", params.username);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    return request<{ events: ApiEvent[]; total: number }>(`/events?${q}`);
  },
  clearEvents: () => request("/events", { method: "DELETE" }),
  getUsers: () => request<{ users: ApiUser[] }>("/users"),
  banUser: (id: string) => request(`/users/${id}/ban`, { method: "PUT" }),
  unbanUser: (id: string) => request(`/users/${id}/unban`, { method: "PUT" }),
  promoteUser: (id: string) => request(`/users/${id}/promote`, { method: "PUT" }),
  deleteUser: (id: string) => request(`/users/${id}`, { method: "DELETE" }),
  getDevices: () => request<{ devices: unknown[] }>("/devices"),
};
