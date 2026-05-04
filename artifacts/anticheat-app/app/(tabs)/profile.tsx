import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useDetection } from "@/context/DetectionContext";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { events } = useDetection();

  const handleLogout = () => {
    Alert.alert("Logout", "Yakin ingin keluar dari akun ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const threats = events.filter((e) => e.severity === "critical" || e.severity === "high").length;
  const scans = events.length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>PROFIL</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.avatarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.cyan + "20", borderColor: colors.cyan + "40" }]}>
            <Feather name={user?.role === "admin" ? "shield" : "user"} size={36} color={colors.cyan} />
          </View>
          <Text style={[styles.displayName, { color: colors.foreground }]}>{user?.username}</Text>
          <View style={[styles.rolePill, { backgroundColor: user?.role === "admin" ? colors.cyan + "20" : colors.secondary, borderColor: user?.role === "admin" ? colors.cyan : colors.border }]}>
            <Text style={[styles.roleText, { color: user?.role === "admin" ? colors.cyan : colors.mutedForeground }]}>
              {user?.role === "admin" ? "ADMINISTRATOR" : "USER"}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statVal, { color: colors.red }]}>{threats}</Text>
            <Text style={[styles.statKey, { color: colors.mutedForeground }]}>Ancaman</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statVal, { color: colors.cyan }]}>{scans}</Text>
            <Text style={[styles.statKey, { color: colors.mutedForeground }]}>Total Log</Text>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoCardTitle, { color: colors.mutedForeground }]}>INFORMASI PERANGKAT</Text>

          <InfoRow icon="cpu" label="HWID" value={user?.hwid ?? "-"} colors={colors} mono />
          <InfoRow icon="bell" label="Discord Webhook" value={user?.discordWebhook ? "Terhubung" : "Tidak dikonfigurasi"} colors={colors} valueColor={user?.discordWebhook ? colors.green : colors.mutedForeground} />
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoCardTitle, { color: colors.mutedForeground }]}>KEAMANAN</Text>
          <View style={[styles.securityItem, { borderBottomColor: colors.border }]}>
            <Feather name="lock" size={16} color={colors.cyan} />
            <View style={styles.secItemText}>
              <Text style={[styles.secLabel, { color: colors.foreground }]}>HWID Lock</Text>
              <Text style={[styles.secSub, { color: colors.mutedForeground }]}>Akun terikat ke perangkat ini</Text>
            </View>
            <Feather name="check-circle" size={16} color={colors.green} />
          </View>
          <View style={styles.securityItem}>
            <Feather name="shield" size={16} color={colors.cyan} />
            <View style={styles.secItemText}>
              <Text style={[styles.secLabel, { color: colors.foreground }]}>Anti-Cheat Protection</Text>
              <Text style={[styles.secSub, { color: colors.mutedForeground }]}>Pemantauan aktif</Text>
            </View>
            <Feather name="check-circle" size={16} color={colors.green} />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.red + "15", borderColor: colors.red + "40" }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Feather name="log-out" size={18} color={colors.red} />
          <Text style={[styles.logoutText, { color: colors.red }]}>LOGOUT</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, colors, mono, valueColor }: any) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <Feather name={icon} size={14} color={colors.mutedForeground} />
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text
        style={[styles.infoValue, { color: valueColor ?? colors.foreground, fontFamily: mono && Platform.OS === "ios" ? "Menlo" : mono ? "monospace" : undefined }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: "800", letterSpacing: 2 },
  content: { padding: 20, gap: 16 },
  avatarCard: { alignItems: "center", padding: 24, borderRadius: 16, borderWidth: 1, gap: 12 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  displayName: { fontSize: 20, fontWeight: "700" },
  rolePill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  roleText: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  statsRow: { flexDirection: "row", gap: 12 },
  statBox: { flex: 1, alignItems: "center", padding: 16, borderRadius: 12, borderWidth: 1, gap: 4 },
  statVal: { fontSize: 28, fontWeight: "800" },
  statKey: { fontSize: 11, letterSpacing: 1 },
  infoCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  infoCardTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 2, padding: 14, paddingBottom: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  infoLabel: { fontSize: 12, flex: 1 },
  infoValue: { fontSize: 12, fontWeight: "600", maxWidth: "50%" },
  securityItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  secItemText: { flex: 1 },
  secLabel: { fontSize: 13, fontWeight: "600" },
  secSub: { fontSize: 11, marginTop: 2 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  logoutText: { fontSize: 14, fontWeight: "800", letterSpacing: 2 },
});
