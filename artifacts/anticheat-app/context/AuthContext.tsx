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
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string, discordWebhook?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

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

const STORED_USERS_KEY = "@anticheat_users";
const CURRENT_USER_KEY = "@anticheat_current_user";

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

async function hashPassword(password: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
  return digest;
}

async function getStoredUsers(): Promise<StoredUser[]> {
  const raw = await AsyncStorage.getItem(STORED_USERS_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

async function saveStoredUsers(users: StoredUser[]): Promise<void> {
  await AsyncStorage.setItem(STORED_USERS_KEY, JSON.stringify(users));
}

async function sendDiscordNotification(webhook: string, message: string) {
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
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
      if (storedUser.banned) {
        return { success: false, error: "Akun ini telah di-ban. Hubungi admin." };
      }
      if (storedUser.passwordHash !== passwordHash) {
        return { success: false, error: "Password salah." };
      }
      if (storedUser.hwid !== hwid) {
        return { success: false, error: `HWID tidak cocok. Perangkat tidak diizinkan.\nHWID: ${hwid}` };
      }
    }

    const token = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      storedUser.id + Date.now()
    );

    const authUser: AuthUser = {
      id: storedUser.id,
      username: storedUser.username,
      hwid: storedUser.hwid,
      role: storedUser.role,
      token,
      discordWebhook: storedUser.discordWebhook ?? discordWebhook,
    };

    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authUser));
    setUser(authUser);

    const webhook = storedUser.discordWebhook ?? discordWebhook;
    if (webhook) {
      const deviceInfo = `${Device.brand ?? "Unknown"} ${Device.modelName ?? "Device"} (${Platform.OS} ${Device.osVersion ?? ""})`;
      await sendDiscordNotification(
        webhook,
        `🔐 **[ANTI-CHEAT LOGIN]**\n👤 User: \`${username}\`\n🆔 HWID: \`${hwid}\`\n📱 Device: ${deviceInfo}\n⏰ Time: ${new Date().toLocaleString("id-ID")}\n✅ Status: **LOGIN BERHASIL**`
      );
    }

    return { success: true };
  };

  const logout = async () => {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    setUser(null);
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
