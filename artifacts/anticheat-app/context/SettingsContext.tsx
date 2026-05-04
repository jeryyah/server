import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

interface Settings {
  discordWebhook: string;
  autoScanEnabled: boolean;
  autoScanIntervalMinutes: number;
  notifyOnLogin: boolean;
  notifyOnThreat: boolean;
  notifyOnCleanScan: boolean;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
  isLoading: boolean;
}

const SETTINGS_KEY = "@anticheat_settings";

const DEFAULT_SETTINGS: Settings = {
  discordWebhook: "",
  autoScanEnabled: true,
  autoScanIntervalMinutes: 5,
  notifyOnLogin: true,
  notifyOnThreat: true,
  notifyOnCleanScan: false,
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const updateSettings = async (partial: Partial<Settings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
