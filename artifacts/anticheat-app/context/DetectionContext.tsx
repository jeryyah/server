import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { useAuth } from "./AuthContext";

export type DetectionSeverity = "low" | "medium" | "high" | "critical";

export interface DetectionEvent {
  id: string;
  type: string;
  description: string;
  severity: DetectionSeverity;
  timestamp: string;
  hwid: string;
  username: string;
  details?: string;
}

export interface DeviceStatus {
  isRooted: boolean;
  isEmulator: boolean;
  isVirtualEnv: boolean;
  isDebuggerAttached: boolean;
  hasModifiedSignature: boolean;
  trustScore: number;
}

interface DetectionContextType {
  events: DetectionEvent[];
  deviceStatus: DeviceStatus | null;
  isScanning: boolean;
  runScan: () => Promise<void>;
  clearEvents: () => Promise<void>;
  sendDiscordAlert: (event: DetectionEvent) => Promise<void>;
}

const DetectionContext = createContext<DetectionContextType | null>(null);

const EVENTS_KEY = "@anticheat_events";

function detectRootIndicators(): boolean {
  if (Platform.OS !== "android") return false;
  const indicators = [
    Device.isRooted,
  ];
  return indicators.some(Boolean);
}

function detectEmulator(): boolean {
  if (Platform.OS === "web") return false;
  const model = (Device.modelName ?? "").toLowerCase();
  const brand = (Device.brand ?? "").toLowerCase();
  const emulatorBrands = ["goldfish", "ranchu", "generic", "vbox", "genymotion", "sdk", "emulator"];
  const emulatorModels = ["android sdk", "emulator", "genymotion", "bluestacks"];
  return (
    emulatorBrands.some((b) => brand.includes(b)) ||
    emulatorModels.some((m) => model.includes(m))
  );
}

function detectVirtualEnvironment(): boolean {
  if (Platform.OS === "web") return true;
  const manufacturer = (Device.manufacturer ?? "").toLowerCase();
  const virtualMfgs = ["genymotion", "bluestacks", "nox", "ldplayer", "memu"];
  return virtualMfgs.some((v) => manufacturer.includes(v));
}

function detectDebugger(): boolean {
  const start = Date.now();
  let sum = 0;
  for (let i = 0; i < 100000; i++) sum += i;
  const elapsed = Date.now() - start;
  return elapsed > 50;
}

function calculateTrustScore(status: Omit<DeviceStatus, "trustScore">): number {
  let score = 100;
  if (status.isRooted) score -= 40;
  if (status.isEmulator) score -= 30;
  if (status.isVirtualEnv) score -= 20;
  if (status.isDebuggerAttached) score -= 25;
  if (status.hasModifiedSignature) score -= 35;
  return Math.max(0, score);
}

export function DetectionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(EVENTS_KEY);
      if (raw) setEvents(JSON.parse(raw));
    })();
  }, []);

  const addEvent = useCallback(async (event: DetectionEvent) => {
    setEvents((prev) => {
      const updated = [event, ...prev].slice(0, 200);
      AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const sendDiscordAlert = useCallback(async (event: DetectionEvent) => {
    if (!user?.discordWebhook) return;
    const severityEmoji: Record<DetectionSeverity, string> = {
      low: "🟡",
      medium: "🟠",
      high: "🔴",
      critical: "💀",
    };
    const message = `${severityEmoji[event.severity]} **[ANTI-CHEAT ALERT - ${event.severity.toUpperCase()}]**\n🔍 Deteksi: **${event.type}**\n📋 Detail: ${event.description}\n👤 User: \`${event.username}\`\n🆔 HWID: \`${event.hwid}\`\n⏰ Waktu: ${new Date(event.timestamp).toLocaleString("id-ID")}${event.details ? `\n📝 Info: ${event.details}` : ""}`;
    try {
      await fetch(user.discordWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      });
    } catch {}
  }, [user]);

  const runScan = useCallback(async () => {
    if (!user) return;
    setIsScanning(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));

      const isRooted = detectRootIndicators();
      const isEmulator = detectEmulator();
      const isVirtualEnv = detectVirtualEnvironment();
      const isDebuggerAttached = detectDebugger();
      const hasModifiedSignature = false;

      const statusWithoutScore = { isRooted, isEmulator, isVirtualEnv, isDebuggerAttached, hasModifiedSignature };
      const trustScore = calculateTrustScore(statusWithoutScore);
      const status: DeviceStatus = { ...statusWithoutScore, trustScore };

      setDeviceStatus(status);

      const newEvents: DetectionEvent[] = [];

      if (isRooted) {
        const e: DetectionEvent = {
          id: Date.now().toString() + "root",
          type: "ROOT DETECTED",
          description: "Perangkat terdeteksi telah di-root",
          severity: "critical",
          timestamp: new Date().toISOString(),
          hwid: user.hwid,
          username: user.username,
          details: `OS: ${Platform.OS} ${Device.osVersion}`,
        };
        newEvents.push(e);
        await sendDiscordAlert(e);
      }

      if (isEmulator) {
        const e: DetectionEvent = {
          id: Date.now().toString() + "emu",
          type: "EMULATOR DETECTED",
          description: "Aplikasi berjalan di emulator",
          severity: "high",
          timestamp: new Date().toISOString(),
          hwid: user.hwid,
          username: user.username,
          details: `Model: ${Device.modelName}, Brand: ${Device.brand}`,
        };
        newEvents.push(e);
        await sendDiscordAlert(e);
      }

      if (isVirtualEnv) {
        const e: DetectionEvent = {
          id: Date.now().toString() + "venv",
          type: "VIRTUAL ENVIRONMENT",
          description: "Terdeteksi lingkungan virtual (parallel space/VPN injector)",
          severity: "high",
          timestamp: new Date().toISOString(),
          hwid: user.hwid,
          username: user.username,
          details: `Manufacturer: ${Device.manufacturer}`,
        };
        newEvents.push(e);
        await sendDiscordAlert(e);
      }

      if (isDebuggerAttached) {
        const e: DetectionEvent = {
          id: Date.now().toString() + "dbg",
          type: "DEBUGGER TIMING ANOMALY",
          description: "Anomali waktu eksekusi terdeteksi (kemungkinan debugger aktif)",
          severity: "medium",
          timestamp: new Date().toISOString(),
          hwid: user.hwid,
          username: user.username,
        };
        newEvents.push(e);
        await sendDiscordAlert(e);
      }

      if (trustScore === 100 && newEvents.length === 0) {
        const e: DetectionEvent = {
          id: Date.now().toString() + "clean",
          type: "SCAN BERSIH",
          description: "Tidak ada ancaman yang terdeteksi",
          severity: "low",
          timestamp: new Date().toISOString(),
          hwid: user.hwid,
          username: user.username,
        };
        newEvents.push(e);
      }

      for (const e of newEvents) await addEvent(e);
    } finally {
      setIsScanning(false);
    }
  }, [user, addEvent, sendDiscordAlert]);

  const clearEvents = useCallback(async () => {
    setEvents([]);
    await AsyncStorage.removeItem(EVENTS_KEY);
  }, []);

  return (
    <DetectionContext.Provider value={{ events, deviceStatus, isScanning, runScan, clearEvents, sendDiscordAlert }}>
      {children}
    </DetectionContext.Provider>
  );
}

export function useDetection() {
  const ctx = useContext(DetectionContext);
  if (!ctx) throw new Error("useDetection must be used inside DetectionProvider");
  return ctx;
}
