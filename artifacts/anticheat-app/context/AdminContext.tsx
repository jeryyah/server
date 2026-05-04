import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

export interface ManagedUser {
  id: string;
  username: string;
  hwid: string;
  role: "admin" | "user";
  banned: boolean;
  registeredAt: string;
  discordWebhook?: string;
  lastSeen?: string;
  detectionCount?: number;
}

interface AdminContextType {
  users: ManagedUser[];
  isLoading: boolean;
  refreshUsers: () => Promise<void>;
  banUser: (userId: string) => Promise<void>;
  unbanUser: (userId: string) => Promise<void>;
  promoteUser: (userId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | null>(null);

const STORED_USERS_KEY = "@anticheat_users";
const EVENTS_KEY = "@anticheat_events";

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshUsers = useCallback(async () => {
    if (user?.role !== "admin") return;
    setIsLoading(true);
    try {
      const raw = await AsyncStorage.getItem(STORED_USERS_KEY);
      const stored: any[] = raw ? JSON.parse(raw) : [];

      const eventsRaw = await AsyncStorage.getItem(EVENTS_KEY);
      const events: any[] = eventsRaw ? JSON.parse(eventsRaw) : [];

      const managed: ManagedUser[] = stored.map((u) => {
        const userEvents = events.filter((e) => e.hwid === u.hwid);
        const lastEvent = userEvents[0];
        return {
          id: u.id,
          username: u.username,
          hwid: u.hwid,
          role: u.role,
          banned: u.banned,
          registeredAt: u.registeredAt,
          discordWebhook: u.discordWebhook,
          lastSeen: lastEvent?.timestamp ?? u.registeredAt,
          detectionCount: userEvents.filter((e) => e.severity !== "low").length,
        };
      });

      setUsers(managed);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  const updateUser = async (userId: string, updates: Partial<any>) => {
    const raw = await AsyncStorage.getItem(STORED_USERS_KEY);
    const stored: any[] = raw ? JSON.parse(raw) : [];
    const updated = stored.map((u) => (u.id === userId ? { ...u, ...updates } : u));
    await AsyncStorage.setItem(STORED_USERS_KEY, JSON.stringify(updated));
    await refreshUsers();
  };

  const banUser = async (userId: string) => updateUser(userId, { banned: true });
  const unbanUser = async (userId: string) => updateUser(userId, { banned: false });
  const promoteUser = async (userId: string) => updateUser(userId, { role: "admin" });

  const deleteUser = async (userId: string) => {
    const raw = await AsyncStorage.getItem(STORED_USERS_KEY);
    const stored: any[] = raw ? JSON.parse(raw) : [];
    const updated = stored.filter((u) => u.id !== userId);
    await AsyncStorage.setItem(STORED_USERS_KEY, JSON.stringify(updated));
    await refreshUsers();
  };

  return (
    <AdminContext.Provider value={{ users, isLoading, refreshUsers, banUser, unbanUser, promoteUser, deleteUser }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside AdminProvider");
  return ctx;
}
