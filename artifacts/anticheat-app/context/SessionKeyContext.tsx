import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AppState, BackHandler, Platform } from "react-native";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import Constants from "expo-constants";

export type KeyStatus = "pending" | "valid" | "invalid" | "expired" | "locked";

export interface SessionKey {
  key: string;
  username: string;
  hwid: string;
  generatedAt: string;
  expiresAt: string;
  used: boolean;
}

interface SessionKeyContextType {
  currentKey: SessionKey | null;
  keyStatus: KeyStatus;
  failedAttempts: number;
  isLocked: boolean;
  generateKey: (username: string, hwid: string, discordWebhook: string) => Promise<string>;
  validateKey: (inputKey: string, username: string, hwid: string, discordWebhook: string) => Promise<boolean>;
  forceCloseApp: () => void;
  wipeData: (discordWebhook: string, hwid: string, username: string, reason: string) => Promise<void>;
  resetSession: () => Promise<void>;
}

const SessionKeyContext = createContext<SessionKeyContextType | null>(null);

const CURRENT_KEY_STORAGE = "@anticheat_session_key";
const FAILED_ATTEMPTS_STORAGE = "@anticheat_failed_attempts";
const LOCKED_STORAGE = "@anticheat_locked";
const MAX_ATTEMPTS = 3;
const KEY_EXPIRY_MINUTES = 10;

function generateRandomKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let key = "";
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) key += "-";
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

async function sendDiscord(webhook: string, message: string) {
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
  } catch {}
}

function getDeviceInfo() {
  return `${Device.brand ?? "?"} ${Device.modelName ?? "?"} (${Platform.OS} ${Device.osVersion ?? ""})`;
}

export function SessionKeyProvider({ children }: { children: React.ReactNode }) {
  const [currentKey, setCurrentKey] = useState<SessionKey | null>(null);
  const [keyStatus, setKeyStatus] = useState<KeyStatus>("pending");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(CURRENT_KEY_STORAGE);
      if (raw) setCurrentKey(JSON.parse(raw));
      const fa = await AsyncStorage.getItem(FAILED_ATTEMPTS_STORAGE);
      if (fa) setFailedAttempts(parseInt(fa));
      const locked = await AsyncStorage.getItem(LOCKED_STORAGE);
      if (locked === "true") setIsLocked(true);
    })();
  }, []);

  const generateKey = useCallback(async (username: string, hwid: string, discordWebhook: string): Promise<string> => {
    const key = generateRandomKey();
    const now = new Date();
    const expires = new Date(now.getTime() + KEY_EXPIRY_MINUTES * 60 * 1000);

    const sessionKey: SessionKey = {
      key,
      username,
      hwid,
      generatedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      used: false,
    };

    await AsyncStorage.setItem(CURRENT_KEY_STORAGE, JSON.stringify(sessionKey));
    setCurrentKey(sessionKey);
    setKeyStatus("pending");

    const deviceInfo = getDeviceInfo();
    const msg =
      `🔑 **[ANTI-CHEAT — KEY SESI BARU]**\n` +
      `👤 Username: \`${username}\`\n` +
      `🆔 HWID: \`${hwid}\`\n` +
      `📱 Device: ${deviceInfo}\n` +
      `⏰ Dibuat: ${now.toLocaleString("id-ID")}\n` +
      `⌛ Expired: ${expires.toLocaleString("id-ID")}\n\n` +
      `🔐 **KEY SESI:**\n` +
      `\`\`\`\n${key}\n\`\`\`\n` +
      `> Berikan key ini ke user. Key hanya berlaku **${KEY_EXPIRY_MINUTES} menit** dan **sekali pakai**.`;

    await sendDiscord(discordWebhook, msg);
    return key;
  }, []);

  const validateKey = useCallback(async (
    inputKey: string,
    username: string,
    hwid: string,
    discordWebhook: string
  ): Promise<boolean> => {
    if (isLocked) return false;

    const stored = currentKey;
    if (!stored) return false;

    const now = new Date();
    const expired = new Date(stored.expiresAt) < now;
    const cleaned = inputKey.trim().toUpperCase().replace(/\s/g, "");

    if (expired) {
      setKeyStatus("expired");
      await sendDiscord(
        discordWebhook,
        `⌛ **[ANTI-CHEAT — KEY EXPIRED]**\n👤 \`${username}\` mencoba key yang sudah expired.\n🆔 HWID: \`${hwid}\`\n📱 ${getDeviceInfo()}`
      );
      return false;
    }

    if (stored.used) {
      setKeyStatus("expired");
      await sendDiscord(
        discordWebhook,
        `⚠️ **[ANTI-CHEAT — KEY SUDAH DIPAKAI]**\n👤 \`${username}\` mencoba memakai key yang sudah digunakan.\n🆔 HWID: \`${hwid}\``
      );
      return false;
    }

    if (cleaned !== stored.key.replace(/-/g, "")) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      await AsyncStorage.setItem(FAILED_ATTEMPTS_STORAGE, String(newAttempts));
      setKeyStatus("invalid");

      if (newAttempts >= MAX_ATTEMPTS) {
        setIsLocked(true);
        await AsyncStorage.setItem(LOCKED_STORAGE, "true");
        await sendDiscord(
          discordWebhook,
          `🚨 **[ANTI-CHEAT — BRUTE FORCE DETECTED]**\n👤 \`${username}\` gagal ${MAX_ATTEMPTS}x memasukkan key!\n🆔 HWID: \`${hwid}\`\n📱 ${getDeviceInfo()}\n\n💣 **Akun DIKUNCI & Data DIHAPUS otomatis!**`
        );
        await wipeDataInternal(discordWebhook, hwid, username, "Terlalu banyak percobaan key salah");
        return false;
      }

      await sendDiscord(
        discordWebhook,
        `❌ **[ANTI-CHEAT — KEY SALAH]**\n👤 \`${username}\` memasukkan key salah (percobaan ${newAttempts}/${MAX_ATTEMPTS})\n🆔 HWID: \`${hwid}\`\n🔑 Dimasukkan: \`${cleaned}\``
      );
      return false;
    }

    const updated: SessionKey = { ...stored, used: true };
    await AsyncStorage.setItem(CURRENT_KEY_STORAGE, JSON.stringify(updated));
    setCurrentKey(updated);
    setKeyStatus("valid");
    setFailedAttempts(0);
    await AsyncStorage.setItem(FAILED_ATTEMPTS_STORAGE, "0");

    await sendDiscord(
      discordWebhook,
      `✅ **[ANTI-CHEAT — KEY VALID]**\n👤 \`${username}\` berhasil masuk dengan key.\n🆔 HWID: \`${hwid}\`\n📱 ${getDeviceInfo()}\n⏰ ${new Date().toLocaleString("id-ID")}\n\n🔒 Aplikasi akan menutup otomatis.`
    );

    return true;
  }, [currentKey, failedAttempts, isLocked]);

  const wipeDataInternal = async (discordWebhook: string, hwid: string, username: string, reason: string) => {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys as string[]);

    await sendDiscord(
      discordWebhook,
      `💣 **[ANTI-CHEAT — DATA WIPE]**\n👤 \`${username}\`\n🆔 HWID: \`${hwid}\`\n📱 ${getDeviceInfo()}\n📋 Alasan: ${reason}\n⏰ ${new Date().toLocaleString("id-ID")}\n\n🗑️ **Semua data aplikasi telah dihapus.**`
    );
  };

  const wipeData = useCallback(async (discordWebhook: string, hwid: string, username: string, reason: string) => {
    await wipeDataInternal(discordWebhook, hwid, username, reason);
  }, []);

  const forceCloseApp = useCallback(() => {
    if (Platform.OS === "android") {
      BackHandler.exitApp();
    } else {
      // iOS: cannot force close, but we hide UI
      AppState.addEventListener("change", () => {});
    }
  }, []);

  const resetSession = useCallback(async () => {
    await AsyncStorage.removeItem(CURRENT_KEY_STORAGE);
    setCurrentKey(null);
    setKeyStatus("pending");
  }, []);

  return (
    <SessionKeyContext.Provider value={{
      currentKey,
      keyStatus,
      failedAttempts,
      isLocked,
      generateKey,
      validateKey,
      forceCloseApp,
      wipeData,
      resetSession,
    }}>
      {children}
    </SessionKeyContext.Provider>
  );
}

export function useSessionKey() {
  const ctx = useContext(SessionKeyContext);
  if (!ctx) throw new Error("useSessionKey must be used inside SessionKeyProvider");
  return ctx;
}
