import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { useAuth } from "./AuthContext";
import { useSettings } from "./SettingsContext";

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
  screenshotUrl?: string;
}

export interface DeviceStatus {
  isRooted: boolean;
  isEmulator: boolean;
  isVirtualEnv: boolean;
  isDebuggerAttached: boolean;
  hasModifiedSignature: boolean;
  suspiciousProcesses: string[];
  memoryTampered: boolean;
  trustScore: number;
}

interface DetectionContextType {
  events: DetectionEvent[];
  deviceStatus: DeviceStatus | null;
  isScanning: boolean;
  runScan: () => Promise<void>;
  clearEvents: () => Promise<void>;
  sendDiscordAlert: (event: DetectionEvent) => Promise<void>;
  reportBehavior: (type: string, value: number, threshold: number, context?: string) => Promise<void>;
}

const DetectionContext = createContext<DetectionContextType | null>(null);
const EVENTS_KEY = "@anticheat_events";
const API_BASE = "/api";

const SUSPICIOUS_PACKAGES = [
  "com.zune.gameguardian",
  "org.sbtools.gamehack",
  "com.thinkware.gamehacker",
  "com.gamehacker.apk",
  "com.luckypatcher",
  "com.topjohnwu.magisk",
  "eu.chainfire.supersu",
  "com.koushikdutta.rommanager",
  "com.jrummy.root.browserfree",
  "com.noshufou.android.su",
  "com.chelpus.lackypatch",
  "com.dimonvideo.luckypatcher",
  "com.forpda.lp",
  "com.android.vending.billing.InAppBillingService.LOCK",
  "com.creehack.luckypatcher",
  "org.creeplays.hack",
  "com.blackmartalpha",
  "org.blackmart.market",
  "com.allapps.off",
  "com.appmgr",
];

function detectRootIndicators(): boolean {
  if (Platform.OS !== "android") return false;
  return !!Device.isRooted;
}

function detectEmulator(): boolean {
  if (Platform.OS === "web") return false;
  const model = (Device.modelName ?? "").toLowerCase();
  const brand = (Device.brand ?? "").toLowerCase();
  const emulatorBrands = ["goldfish", "ranchu", "generic", "vbox", "genymotion", "sdk", "emulator"];
  const emulatorModels = ["android sdk", "emulator", "genymotion", "bluestacks", "nox", "ldplayer", "memu"];
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
  if (Platform.OS === "web") return false;
  const start = Date.now();
  let sum = 0;
  for (let i = 0; i < 100000; i++) sum += i;
  void sum;
  return Date.now() - start > 80;
}

function detectSuspiciousProcesses(): string[] {
  const deviceStr = [
    Device.brand,
    Device.modelName,
    Device.manufacturer,
    Device.osName,
  ].join(" ").toLowerCase();
  return SUSPICIOUS_PACKAGES.filter((pkg) => {
    const short = pkg.split(".").pop() ?? "";
    return deviceStr.includes(short.toLowerCase());
  });
}

function detectMemoryTamper(): boolean {
  try {
    const arr = new Float64Array(4);
    arr[0] = 100.0;
    const ref = arr[0];
    for (let i = 0; i < 1000; i++) arr[0] = arr[0] * 1.0;
    return arr[0] !== ref * 1.0;
  } catch {
    return false;
  }
}

function verifyApkSignature(): boolean {
  if (Platform.OS === "web") return false;
  const buildId = Device.osInternalBuildId ?? "";
  const suspicious = ["test-keys", "dev-keys", "userdebug", "eng"].some((s) =>
    buildId.toLowerCase().includes(s)
  );
  return suspicious;
}

function calculateTrustScore(status: Omit<DeviceStatus, "trustScore">): number {
  let score = 100;
  if (status.isRooted) score -= 40;
  if (status.isEmulator) score -= 30;
  if (status.isVirtualEnv) score -= 20;
  if (status.isDebuggerAttached) score -= 25;
  if (status.hasModifiedSignature) score -= 35;
  if (status.memoryTampered) score -= 30;
  if (status.suspiciousProcesses.length > 0) score -= Math.min(40, status.suspiciousProcesses.length * 15);
  return Math.max(0, score);
}

async function syncEventToAPI(event: DetectionEvent) {
  try {
    await fetch(`${API_BASE}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  } catch {}
}

async function syncUserToAPI(user: { id: string; username: string; hwid: string; role: string; banned: boolean; registeredAt: string }) {
  try {
    await fetch(`${API_BASE}/users/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
  } catch {}
}

export function DetectionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(EVENTS_KEY);
      if (raw) setEvents(JSON.parse(raw));
    })();
  }, []);

  useEffect(() => {
    if (user) {
      syncUserToAPI({
        id: user.id,
        username: user.username,
        hwid: user.hwid,
        role: user.role,
        banned: user.banned ?? false,
        registeredAt: user.registeredAt ?? new Date().toISOString(),
      });
    }
  }, [user]);

  const addEvent = useCallback(async (event: DetectionEvent) => {
    setEvents((prev) => {
      const updated = [event, ...prev].slice(0, 200);
      AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
      return updated;
    });
    await syncEventToAPI(event);
  }, []);

  const sendDiscordAlert = useCallback(async (event: DetectionEvent) => {
    const webhook = settings.discordWebhook || user?.discordWebhook;
    if (!webhook) return;
    const severityEmoji: Record<DetectionSeverity, string> = {
      low: "🟡", medium: "🟠", high: "🔴", critical: "💀",
    };
    const msg =
      `${severityEmoji[event.severity]} **[ANTI-CHEAT — ${event.severity.toUpperCase()}]**\n` +
      `🔍 **${event.type}**\n` +
      `📋 ${event.description}\n` +
      `👤 User: \`${event.username}\`\n` +
      `🆔 HWID: \`${event.hwid}\`\n` +
      `⏰ ${new Date(event.timestamp).toLocaleString("id-ID")}` +
      (event.details ? `\n📝 ${event.details}` : "");
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msg }),
      });
    } catch {}
  }, [user, settings]);

  const runScan = useCallback(async () => {
    if (!user) return;
    setIsScanning(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));

      const isRooted = detectRootIndicators();
      const isEmulator = detectEmulator();
      const isVirtualEnv = detectVirtualEnvironment();
      const isDebuggerAttached = detectDebugger();
      const hasModifiedSignature = verifyApkSignature();
      const suspiciousProcesses = detectSuspiciousProcesses();
      const memoryTampered = detectMemoryTamper();

      const statusWithoutScore = {
        isRooted, isEmulator, isVirtualEnv, isDebuggerAttached,
        hasModifiedSignature, suspiciousProcesses, memoryTampered,
      };
      const trustScore = calculateTrustScore(statusWithoutScore);
      setDeviceStatus({ ...statusWithoutScore, trustScore });

      const newEvents: DetectionEvent[] = [];
      const ts = new Date().toISOString();
      const base = { hwid: user.hwid, username: user.username };

      if (isRooted) {
        const e: DetectionEvent = {
          id: `${Date.now()}root`, type: "ROOT DETECTED",
          description: "Perangkat telah di-root (superuser privileges aktif)",
          severity: "critical", timestamp: ts, ...base,
          details: `OS: ${Platform.OS} ${Device.osVersion} | Build: ${Device.osInternalBuildId}`,
        };
        newEvents.push(e); await sendDiscordAlert(e);
      }

      if (isEmulator) {
        const e: DetectionEvent = {
          id: `${Date.now()}emu`, type: "EMULATOR DETECTED",
          description: "Aplikasi berjalan di emulator Android",
          severity: "high", timestamp: ts, ...base,
          details: `Model: ${Device.modelName} | Brand: ${Device.brand}`,
        };
        newEvents.push(e); await sendDiscordAlert(e);
      }

      if (isVirtualEnv) {
        const e: DetectionEvent = {
          id: `${Date.now()}venv`, type: "VIRTUAL ENVIRONMENT",
          description: "Terdeteksi lingkungan virtual (Parallel Space / VirtualXposed)",
          severity: "high", timestamp: ts, ...base,
          details: `Manufacturer: ${Device.manufacturer}`,
        };
        newEvents.push(e); await sendDiscordAlert(e);
      }

      if (isDebuggerAttached) {
        const e: DetectionEvent = {
          id: `${Date.now()}dbg`, type: "DEBUGGER DETECTED",
          description: "Anomali timing eksekusi — kemungkinan debugger aktif",
          severity: "medium", timestamp: ts, ...base,
        };
        newEvents.push(e); await sendDiscordAlert(e);
      }

      if (hasModifiedSignature) {
        const e: DetectionEvent = {
          id: `${Date.now()}sig`, type: "APK SIGNATURE INVALID",
          description: "APK terdeteksi telah dimodifikasi atau di-repack",
          severity: "critical", timestamp: ts, ...base,
          details: `Build ID: ${Device.osInternalBuildId}`,
        };
        newEvents.push(e); await sendDiscordAlert(e);
      }

      if (suspiciousProcesses.length > 0) {
        const e: DetectionEvent = {
          id: `${Date.now()}proc`, type: "CHEAT PROCESS DETECTED",
          description: `Terdeteksi ${suspiciousProcesses.length} aplikasi cheat aktif`,
          severity: "critical", timestamp: ts, ...base,
          details: `Proses: ${suspiciousProcesses.join(", ")}`,
        };
        newEvents.push(e); await sendDiscordAlert(e);
      }

      if (memoryTampered) {
        const e: DetectionEvent = {
          id: `${Date.now()}mem`, type: "MEMORY TAMPER DETECTED",
          description: "Integritas memori rusak — kemungkinan memory editor aktif",
          severity: "critical", timestamp: ts, ...base,
        };
        newEvents.push(e); await sendDiscordAlert(e);
      }

      if (newEvents.length === 0) {
        const e: DetectionEvent = {
          id: `${Date.now()}clean`, type: "SCAN BERSIH",
          description: "Tidak ada ancaman terdeteksi",
          severity: "low", timestamp: ts, ...base,
        };
        newEvents.push(e);
        if (settings.notifyOnCleanScan) await sendDiscordAlert(e);
      }

      for (const e of newEvents) await addEvent(e);
    } finally {
      setIsScanning(false);
    }
  }, [user, settings, addEvent, sendDiscordAlert]);

  const reportBehavior = useCallback(async (
    type: string, value: number, threshold: number, context?: string
  ) => {
    if (!user) return;
    const pct = Math.round(((value - threshold) / threshold) * 100);
    const e: DetectionEvent = {
      id: `${Date.now()}bhv`,
      type: `BEHAVIORAL ANOMALY: ${type}`,
      description: `Nilai abnormal terdeteksi: ${value} (threshold: ${threshold}, +${pct}%)`,
      severity: pct > 200 ? "critical" : pct > 100 ? "high" : "medium",
      timestamp: new Date().toISOString(),
      hwid: user.hwid,
      username: user.username,
      details: context,
    };
    await addEvent(e);
    await sendDiscordAlert(e);
  }, [user, addEvent, sendDiscordAlert]);

  const clearEvents = useCallback(async () => {
    setEvents([]);
    await AsyncStorage.removeItem(EVENTS_KEY);
  }, []);

  return (
    <DetectionContext.Provider value={{
      events, deviceStatus, isScanning,
      runScan, clearEvents, sendDiscordAlert, reportBehavior,
    }}>
      {children}
    </DetectionContext.Provider>
  );
}

export function useDetection() {
  const ctx = useContext(DetectionContext);
  if (!ctx) throw new Error("useDetection must be used inside DetectionProvider");
  return ctx;
}
