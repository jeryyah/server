import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useSettings } from "@/context/SettingsContext";
import { useDetection } from "@/context/DetectionContext";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useSettings();
  const { runScan, isScanning } = useDetection();
  const [webhookInput, setWebhookInput] = useState(settings.discordWebhook);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveWebhook = async () => {
    await updateSettings({ discordWebhook: webhookInput.trim() });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testWebhook = async () => {
    if (!webhookInput.trim()) {
      Alert.alert("Error", "Masukkan Discord Webhook URL terlebih dahulu.");
      return;
    }
    setTestingWebhook(true);
    try {
      const res = await fetch(webhookInput.trim(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "✅ **[ANTI-CHEAT TEST]** Webhook berhasil terhubung! Notifikasi akan dikirim ke channel ini.",
        }),
      });
      if (res.ok) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Berhasil", "Webhook berhasil! Cek channel Discord Anda.");
      } else {
        Alert.alert("Gagal", `Error: ${res.status} ${res.statusText}`);
      }
    } catch {
      Alert.alert("Gagal", "Tidak dapat menghubungi Discord. Periksa URL webhook.");
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleManualScan = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await runScan();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>PENGATURAN</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100) }]}
        showsVerticalScrollIndicator={false}
      >
        <Section title="DISCORD NOTIFIKASI" colors={colors}>
          <Text style={[styles.desc, { color: colors.mutedForeground }]}>
            Masukkan Discord Webhook URL untuk menerima notifikasi login dan deteksi cheat.
          </Text>

          <View style={[styles.inputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="link" size={15} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="https://discord.com/api/webhooks/..."
              placeholderTextColor={colors.mutedForeground}
              value={webhookInput}
              onChangeText={setWebhookInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.cyan + "20", borderColor: colors.cyan + "40", flex: 1 }]}
              onPress={saveWebhook}
            >
              <Feather name={saved ? "check" : "save"} size={14} color={saved ? colors.green : colors.cyan} />
              <Text style={[styles.btnText, { color: saved ? colors.green : colors.cyan }]}>
                {saved ? "Tersimpan!" : "Simpan"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={testWebhook}
              disabled={testingWebhook}
            >
              {testingWebhook ? (
                <ActivityIndicator size="small" color={colors.mutedForeground} />
              ) : (
                <Feather name="send" size={14} color={colors.mutedForeground} />
              )}
              <Text style={[styles.btnText, { color: colors.mutedForeground }]}>Test</Text>
            </TouchableOpacity>
          </View>
        </Section>

        <Section title="NOTIFIKASI" colors={colors}>
          <ToggleRow
            label="Notifikasi Login"
            desc="Kirim alert ke Discord setiap ada login"
            value={settings.notifyOnLogin}
            onChange={(v) => updateSettings({ notifyOnLogin: v })}
            colors={colors}
          />
          <ToggleRow
            label="Notifikasi Ancaman"
            desc="Kirim alert saat terdeteksi root/emulator/cheat"
            value={settings.notifyOnThreat}
            onChange={(v) => updateSettings({ notifyOnThreat: v })}
            colors={colors}
          />
          <ToggleRow
            label="Notifikasi Scan Bersih"
            desc="Kirim alert saat scan tidak menemukan ancaman"
            value={settings.notifyOnCleanScan}
            onChange={(v) => updateSettings({ notifyOnCleanScan: v })}
            colors={colors}
          />
        </Section>

        <Section title="AUTO SCAN" colors={colors}>
          <ToggleRow
            label="Scan Otomatis"
            desc="Jalankan scan secara berkala"
            value={settings.autoScanEnabled}
            onChange={(v) => updateSettings({ autoScanEnabled: v })}
            colors={colors}
          />
          {settings.autoScanEnabled && (
            <View style={styles.intervalRow}>
              <Text style={[styles.intervalLabel, { color: colors.foreground }]}>Interval Scan</Text>
              <View style={styles.intervalBtns}>
                {[1, 5, 10, 30].map((min) => (
                  <TouchableOpacity
                    key={min}
                    style={[
                      styles.intervalBtn,
                      {
                        backgroundColor: settings.autoScanIntervalMinutes === min ? colors.cyan + "20" : colors.secondary,
                        borderColor: settings.autoScanIntervalMinutes === min ? colors.cyan : colors.border,
                      },
                    ]}
                    onPress={() => updateSettings({ autoScanIntervalMinutes: min })}
                  >
                    <Text style={[styles.intervalBtnText, { color: settings.autoScanIntervalMinutes === min ? colors.cyan : colors.mutedForeground }]}>
                      {min}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </Section>

        <Section title="AKSI MANUAL" colors={colors}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.cyan + "10", borderColor: colors.cyan + "30" }]}
            onPress={handleManualScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator color={colors.cyan} />
            ) : (
              <Feather name="search" size={20} color={colors.cyan} />
            )}
            <View style={styles.actionCardText}>
              <Text style={[styles.actionCardTitle, { color: colors.cyan }]}>
                {isScanning ? "Sedang scanning..." : "Jalankan Scan Manual"}
              </Text>
              <Text style={[styles.actionCardDesc, { color: colors.mutedForeground }]}>
                Deteksi root, emulator, dan ancaman lainnya sekarang
              </Text>
            </View>
          </TouchableOpacity>
        </Section>

        <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Anti-Cheat v1.0.0 — Aktif memantau perangkat Anda. Semua data tersimpan lokal di perangkat.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children, colors }: any) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function ToggleRow({ label, desc, value, onChange, colors }: any) {
  return (
    <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
      <View style={styles.toggleText}>
        <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.cyan + "60" }}
        thumbColor={value ? colors.cyan : colors.mutedForeground}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: "800", letterSpacing: 2 },
  content: { padding: 16, gap: 16 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 2, paddingHorizontal: 4 },
  sectionCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden", padding: 14, gap: 12 },
  desc: { fontSize: 12, lineHeight: 18 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, gap: 8 },
  input: { flex: 1, fontSize: 13 },
  row: { flexDirection: "row", gap: 8 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1 },
  btnText: { fontSize: 13, fontWeight: "600" },
  toggleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, gap: 12 },
  toggleText: { flex: 1, gap: 2 },
  toggleLabel: { fontSize: 13, fontWeight: "600" },
  toggleDesc: { fontSize: 11, lineHeight: 16 },
  intervalRow: { gap: 10 },
  intervalLabel: { fontSize: 13, fontWeight: "600" },
  intervalBtns: { flexDirection: "row", gap: 8 },
  intervalBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  intervalBtnText: { fontSize: 13, fontWeight: "700" },
  actionCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, gap: 14 },
  actionCardText: { flex: 1, gap: 3 },
  actionCardTitle: { fontSize: 14, fontWeight: "700" },
  actionCardDesc: { fontSize: 12, lineHeight: 17 },
  infoBox: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 11, lineHeight: 17 },
});
