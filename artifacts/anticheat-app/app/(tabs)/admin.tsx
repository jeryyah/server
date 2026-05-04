import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useAdmin, ManagedUser } from "@/context/AdminContext";

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { users, isLoading, refreshUsers, banUser, unbanUser, promoteUser, deleteUser } = useAdmin();
  const [search, setSearch] = useState("");

  if (user?.role !== "admin") {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <Feather name="lock" size={48} color={colors.mutedForeground} />
        <Text style={[styles.noAccess, { color: colors.mutedForeground }]}>Akses Ditolak</Text>
        <Text style={[styles.noAccessSub, { color: colors.mutedForeground + "80" }]}>Hanya Admin yang bisa mengakses halaman ini</Text>
      </View>
    );
  }

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.hwid.toLowerCase().includes(search.toLowerCase())
  );

  const adminCount = users.filter((u) => u.role === "admin").length;
  const bannedCount = users.filter((u) => u.banned).length;
  const threatCount = users.reduce((sum, u) => sum + (u.detectionCount ?? 0), 0);

  const confirmAction = (title: string, message: string, onConfirm: () => void, danger = false) => {
    Alert.alert(title, message, [
      { text: "Batal", style: "cancel" },
      { text: "Ya", style: danger ? "destructive" : "default", onPress: onConfirm },
    ]);
  };

  const handleBan = (u: ManagedUser) => {
    if (u.id === user?.id) {
      Alert.alert("Error", "Tidak bisa ban diri sendiri.");
      return;
    }
    confirmAction(
      u.banned ? "Unban User" : "Ban User",
      u.banned ? `Unban @${u.username}?` : `Ban @${u.username}? User tidak akan bisa login.`,
      async () => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        if (u.banned) await unbanUser(u.id);
        else await banUser(u.id);
      },
      !u.banned
    );
  };

  const handlePromote = (u: ManagedUser) => {
    if (u.role === "admin") return;
    confirmAction(
      "Promote ke Admin",
      `Jadikan @${u.username} sebagai Admin?`,
      async () => {
        await promoteUser(u.id);
      }
    );
  };

  const handleDelete = (u: ManagedUser) => {
    if (u.id === user?.id) {
      Alert.alert("Error", "Tidak bisa hapus akun sendiri.");
      return;
    }
    confirmAction(
      "Hapus User",
      `Hapus akun @${u.username} secara permanen?`,
      async () => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        await deleteUser(u.id);
      },
      true
    );
  };

  const renderUser = ({ item }: { item: ManagedUser }) => {
    const isCurrentUser = item.id === user?.id;
    const lastSeen = item.lastSeen
      ? new Date(item.lastSeen).toLocaleDateString("id-ID")
      : "-";

    return (
      <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: item.banned ? colors.red + "40" : colors.border }]}>
        <View style={styles.userTop}>
          <View style={[styles.userAvatar, { backgroundColor: item.role === "admin" ? colors.cyan + "20" : colors.secondary }]}>
            <Feather name={item.role === "admin" ? "shield" : "user"} size={18} color={item.role === "admin" ? colors.cyan : colors.mutedForeground} />
          </View>
          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={[styles.userName, { color: colors.foreground }]}>{item.username}</Text>
              {isCurrentUser && (
                <View style={[styles.pill, { backgroundColor: colors.cyan + "20" }]}>
                  <Text style={[styles.pillText, { color: colors.cyan }]}>KAMU</Text>
                </View>
              )}
              {item.role === "admin" && (
                <View style={[styles.pill, { backgroundColor: colors.yellow + "20" }]}>
                  <Text style={[styles.pillText, { color: colors.yellow }]}>ADMIN</Text>
                </View>
              )}
              {item.banned && (
                <View style={[styles.pill, { backgroundColor: colors.red + "20" }]}>
                  <Text style={[styles.pillText, { color: colors.red }]}>BANNED</Text>
                </View>
              )}
            </View>
            <Text style={[styles.userHwid, { color: colors.mutedForeground }]}>{item.hwid}</Text>
          </View>
        </View>

        <View style={[styles.userStats, { borderTopColor: colors.border }]}>
          <View style={styles.statItem}>
            <Feather name="alert-triangle" size={11} color={item.detectionCount ? colors.red : colors.mutedForeground} />
            <Text style={[styles.statItemText, { color: item.detectionCount ? colors.red : colors.mutedForeground }]}>
              {item.detectionCount ?? 0} ancaman
            </Text>
          </View>
          <View style={styles.statItem}>
            <Feather name="clock" size={11} color={colors.mutedForeground} />
            <Text style={[styles.statItemText, { color: colors.mutedForeground }]}>{lastSeen}</Text>
          </View>
        </View>

        {!isCurrentUser && (
          <View style={[styles.actions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: item.banned ? colors.green + "15" : colors.red + "15" }]}
              onPress={() => handleBan(item)}
            >
              <Feather name={item.banned ? "unlock" : "slash"} size={14} color={item.banned ? colors.green : colors.red} />
              <Text style={[styles.actionText, { color: item.banned ? colors.green : colors.red }]}>
                {item.banned ? "Unban" : "Ban"}
              </Text>
            </TouchableOpacity>

            {item.role !== "admin" && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.yellow + "15" }]}
                onPress={() => handlePromote(item)}
              >
                <Feather name="star" size={14} color={colors.yellow} />
                <Text style={[styles.actionText, { color: colors.yellow }]}>Promote</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.red + "10" }]}
              onPress={() => handleDelete(item)}
            >
              <Feather name="trash-2" size={14} color={colors.red} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>ADMIN PANEL</Text>
        <TouchableOpacity onPress={refreshUsers}>
          <Feather name="refresh-cw" size={18} color={colors.cyan} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <StatChip icon="users" value={users.length} label="Users" color={colors.cyan} colors={colors} />
        <StatChip icon="shield" value={adminCount} label="Admin" color={colors.yellow} colors={colors} />
        <StatChip icon="slash" value={bannedCount} label="Banned" color={colors.red} colors={colors} />
        <StatChip icon="alert-triangle" value={threatCount} label="Threats" color={colors.orange} colors={colors} />
      </View>

      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={15} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Cari username / HWID..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.cyan} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100) }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!filtered.length}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="users" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {search ? "Tidak ditemukan" : "Belum ada user terdaftar"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function StatChip({ icon, value, label, color, colors }: any) {
  return (
    <View style={[styles.statChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name={icon} size={14} color={color} />
      <Text style={[styles.statChipVal, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statChipLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 20 },
  noAccess: { fontSize: 18, fontWeight: "700", marginTop: 12 },
  noAccessSub: { fontSize: 13, textAlign: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: "800", letterSpacing: 2 },
  statsRow: { flexDirection: "row", padding: 12, gap: 8 },
  statChip: { flex: 1, alignItems: "center", padding: 10, borderRadius: 10, borderWidth: 1, gap: 2 },
  statChipVal: { fontSize: 18, fontWeight: "700" },
  statChipLabel: { fontSize: 9, letterSpacing: 1 },
  searchWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: 12, marginBottom: 10, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  list: { paddingHorizontal: 12, gap: 10 },
  userCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  userTop: { flexDirection: "row", padding: 14, gap: 12, alignItems: "flex-start" },
  userAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  userInfo: { flex: 1, gap: 4 },
  userNameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  userName: { fontSize: 14, fontWeight: "700" },
  pill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  pillText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  userHwid: { fontSize: 11, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  userStats: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, gap: 16 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  statItemText: { fontSize: 11 },
  actions: { flexDirection: "row", padding: 10, borderTopWidth: 1, gap: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  actionText: { fontSize: 12, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: "600" },
});
