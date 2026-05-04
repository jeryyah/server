import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useDetection } from "@/context/DetectionContext";
import { TrustScoreRing } from "@/components/TrustScoreRing";
import { StatusItem } from "@/components/StatusItem";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { deviceStatus, isScanning, runScan, events } = useDetection();

  useEffect(() => {
    runScan();
  }, []);

  const handleScan = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await runScan();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const recentThreats = events.filter((e) => e.severity !== "low").length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Selamat datang,</Text>
          <Text style={[styles.username, { color: colors.foreground }]}>{user?.username}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: user?.role === "admin" ? colors.cyan + "20" : colors.secondary, borderColor: user?.role === "admin" ? colors.cyan + "50" : colors.border }]}>
          <Feather name={user?.role === "admin" ? "shield" : "user"} size={12} color={user?.role === "admin" ? colors.cyan : colors.mutedForeground} />
          <Text style={[styles.roleText, { color: user?.role === "admin" ? colors.cyan : colors.mutedForeground }]}>
            {user?.role === "admin" ? "ADMIN" : "USER"}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.ringSection}>
          {isScanning ? (
            <View style={styles.scanningWrap}>
              <ActivityIndicator size="large" color={colors.cyan} />
              <Text style={[styles.scanningText, { color: colors.cyan }]}>SCANNING...</Text>
            </View>
          ) : (
            <TrustScoreRing score={deviceStatus?.trustScore ?? 100} size={150} />
          )}
          <Text style={[styles.trustLabel, { color: colors.mutedForeground }]}>Trust Score</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="alert-triangle" size={20} color={colors.red} />
            <Text style={[styles.statNum, { color: colors.foreground }]}>{recentThreats}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Ancaman</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="activity" size={20} color={colors.cyan} />
            <Text style={[styles.statNum, { color: colors.foreground }]}>{events.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Scan</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="cpu" size={20} color={colors.green} />
            <Text style={[styles.statNum, { color: colors.foreground, fontSize: 11 }]} numberOfLines={1}>{user?.hwid?.slice(0, 8) ?? "---"}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>HWID</Text>
          </View>
        </View>

        {deviceStatus && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>STATUS PERANGKAT</Text>
            <StatusItem icon="smartphone" label="Root / Jailbreak" status={deviceStatus.isRooted} />
            <StatusItem icon="monitor" label="Emulator" status={deviceStatus.isEmulator} />
            <StatusItem icon="copy" label="Virtual Environment" status={deviceStatus.isVirtualEnv} />
            <StatusItem icon="terminal" label="Debugger Aktif" status={deviceStatus.isDebuggerAttached} />
            <StatusItem icon="file-text" label="Signature APK" status={!deviceStatus.hasModifiedSignature} safeWhenTrue />
          </View>
        )}

        <View style={[styles.hwidCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.hwidRow}>
            <Feather name="lock" size={14} color={colors.cyan} />
            <Text style={[styles.hwidLabel, { color: colors.mutedForeground }]}>HARDWARE ID</Text>
          </View>
          <Text style={[styles.hwidValue, { color: colors.cyan }]}>{user?.hwid}</Text>
        </View>

        <TouchableOpacity
          style={[styles.scanBtn, { backgroundColor: colors.cyan }, isScanning && { opacity: 0.6 }]}
          onPress={handleScan}
          disabled={isScanning}
          activeOpacity={0.8}
        >
          {isScanning ? (
            <ActivityIndicator color={colors.background} size="small" />
          ) : (
            <Feather name="search" size={20} color={colors.background} />
          )}
          <Text style={[styles.scanBtnText, { color: colors.background }]}>
            {isScanning ? "SCANNING..." : "JALANKAN SCAN"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  greeting: { fontSize: 12, letterSpacing: 0.5 },
  username: { fontSize: 18, fontWeight: "700" },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  roleText: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16 },
  ringSection: { alignItems: "center", paddingVertical: 10, gap: 8 },
  scanningWrap: { alignItems: "center", gap: 12, height: 150, justifyContent: "center" },
  scanningText: { fontSize: 12, fontWeight: "700", letterSpacing: 2 },
  trustLabel: { fontSize: 12, letterSpacing: 1.5 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  statNum: { fontSize: 20, fontWeight: "700" },
  statLabel: { fontSize: 10, letterSpacing: 1 },
  section: { gap: 0 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 2, marginBottom: 10 },
  hwidCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  hwidRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  hwidLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  hwidValue: { fontSize: 13, fontWeight: "600", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  scanBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 14, marginTop: 4 },
  scanBtnText: { fontSize: 14, fontWeight: "800", letterSpacing: 2 },
});
