import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useSessionKey } from "@/context/SessionKeyContext";
import { useSettings } from "@/context/SettingsContext";

const MAX_ATTEMPTS = 3;

export default function KeyAuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const {
    currentKey,
    keyStatus,
    failedAttempts,
    isLocked,
    generateKey,
    validateKey,
    forceCloseApp,
    wipeData,
    resetSession,
  } = useSessionKey();

  const [keyInput, setKeyInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const webhook = settings.discordWebhook || user?.discordWebhook || "";

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (success) {
      let t = 5;
      const interval = setInterval(() => {
        t--;
        setCountdown(t);
        if (t <= 0) {
          clearInterval(interval);
          forceCloseApp();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [success]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleGenerate = async () => {
    if (!user) return;
    if (!webhook) {
      setErrorMsg("Discord Webhook belum dikonfigurasi di Settings!");
      return;
    }
    setIsGenerating(true);
    setErrorMsg("");
    await generateKey(user.username, user.hwid, webhook);
    setIsGenerating(false);
  };

  const handleValidate = async () => {
    if (!user || !keyInput.trim()) return;
    setIsValidating(true);
    setErrorMsg("");
    const ok = await validateKey(keyInput.trim(), user.username, user.hwid, webhook);
    setIsValidating(false);

    if (ok) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shake();
      if (isLocked || failedAttempts + 1 >= MAX_ATTEMPTS) {
        setErrorMsg("Terlalu banyak percobaan salah. Data dihapus. Akun dikunci.");
        await wipeData(webhook, user.hwid, user.username, "Brute force key");
        await logout();
        setTimeout(() => router.replace("/login"), 2000);
      } else {
        const remaining = MAX_ATTEMPTS - (failedAttempts + 1);
        setErrorMsg(`Key salah! Sisa percobaan: ${remaining}`);
      }
      setKeyInput("");
    }
  };

  const handleSkipToApp = async () => {
    await resetSession();
    router.replace("/(tabs)/");
  };

  if (isLocked) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <Feather name="lock" size={60} color={colors.red} />
        <Text style={[styles.lockedTitle, { color: colors.red }]}>AKUN DIKUNCI</Text>
        <Text style={[styles.lockedSub, { color: colors.mutedForeground }]}>
          Terlalu banyak percobaan key salah. Hubungi admin untuk membuka kunci.
        </Text>
      </View>
    );
  }

  if (success) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <View style={[styles.successCircle, { borderColor: colors.green }]}>
            <Feather name="check" size={50} color={colors.green} />
          </View>
        </Animated.View>
        <Text style={[styles.successTitle, { color: colors.green }]}>KEY VALID</Text>
        <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
          Aplikasi menutup otomatis dalam...
        </Text>
        <Text style={[styles.countdown, { color: colors.cyan }]}>{countdown}</Text>
      </View>
    );
  }

  const keyGenerated = !!currentKey && !currentKey.used;
  const expiresAt = currentKey ? new Date(currentKey.expiresAt).toLocaleTimeString("id-ID") : "";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 50), paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topSection}>
          <View style={[styles.iconWrap, { borderColor: colors.cyan + "40", backgroundColor: colors.cyan + "10" }]}>
            <Feather name="key" size={40} color={colors.cyan} />
          </View>
          <Text style={[styles.mainTitle, { color: colors.foreground }]}>VERIFIKASI SESI</Text>
          <Text style={[styles.mainSub, { color: colors.mutedForeground }]}>
            Selamat datang, <Text style={{ color: colors.cyan, fontWeight: "700" }}>{user?.username}</Text>
          </Text>
          <Text style={[styles.mainDesc, { color: colors.mutedForeground }]}>
            Setiap sesi membutuhkan key unik yang dikirim ke Discord admin. Masukkan key yang Anda terima.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>LANGKAH 1 — Minta Key Baru</Text>
          <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
            Admin akan menerima key di Discord dan meneruskannya ke Anda.
          </Text>

          <TouchableOpacity
            style={[styles.generateBtn, { backgroundColor: keyGenerated ? colors.secondary : colors.cyan, borderColor: keyGenerated ? colors.border : colors.cyan }]}
            onPress={handleGenerate}
            disabled={isGenerating || keyGenerated}
            activeOpacity={0.8}
          >
            {isGenerating ? (
              <ActivityIndicator color={keyGenerated ? colors.mutedForeground : colors.background} size="small" />
            ) : (
              <Feather name={keyGenerated ? "check-circle" : "send"} size={18} color={keyGenerated ? colors.green : colors.background} />
            )}
            <Text style={[styles.generateBtnText, { color: keyGenerated ? colors.green : colors.background }]}>
              {isGenerating ? "Mengirim ke Discord..." : keyGenerated ? "Key Terkirim ke Discord" : "Kirim Key ke Discord"}
            </Text>
          </TouchableOpacity>

          {keyGenerated && (
            <View style={[styles.infoBox, { backgroundColor: colors.green + "10", borderColor: colors.green + "30" }]}>
              <Feather name="clock" size={13} color={colors.green} />
              <Text style={[styles.infoBoxText, { color: colors.green }]}>
                Key berlaku sampai {expiresAt} — Sekali pakai saja
              </Text>
            </View>
          )}
        </View>

        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>LANGKAH 2 — Masukkan Key</Text>

            <View style={[styles.keyInputWrap, { backgroundColor: colors.secondary, borderColor: errorMsg ? colors.red : colors.border }]}>
              <Feather name="lock" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.keyInput, { color: colors.cyan }]}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                placeholderTextColor={colors.mutedForeground}
                value={keyInput}
                onChangeText={(t) => setKeyInput(t.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={20}
              />
            </View>

            <View style={[styles.attemptsRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              {[...Array(MAX_ATTEMPTS)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.attemptDot,
                    { backgroundColor: i < failedAttempts ? colors.red : colors.border },
                  ]}
                />
              ))}
              <Text style={[styles.attemptsText, { color: colors.mutedForeground }]}>
                {failedAttempts}/{MAX_ATTEMPTS} percobaan
              </Text>
            </View>

            {errorMsg ? (
              <View style={[styles.errorBox, { backgroundColor: colors.red + "15", borderColor: colors.red + "40" }]}>
                <Feather name="alert-triangle" size={14} color={colors.red} />
                <Text style={[styles.errorText, { color: colors.red }]}>{errorMsg}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.validateBtn, { backgroundColor: colors.cyan }, (!keyInput.trim() || isValidating) && { opacity: 0.5 }]}
              onPress={handleValidate}
              disabled={!keyInput.trim() || isValidating}
              activeOpacity={0.85}
            >
              {isValidating ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Feather name="unlock" size={18} color={colors.background} />
              )}
              <Text style={[styles.validateBtnText, { color: colors.background }]}>
                {isValidating ? "Memvalidasi..." : "VALIDASI KEY"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkipToApp}>
          <Feather name="arrow-right" size={14} color={colors.mutedForeground} />
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Lewati (masuk tanpa key)</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 16 },
  scroll: { padding: 20, gap: 20 },
  topSection: { alignItems: "center", gap: 12 },
  iconWrap: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  mainTitle: { fontSize: 22, fontWeight: "800", letterSpacing: 3 },
  mainSub: { fontSize: 14 },
  mainDesc: { fontSize: 12, textAlign: "center", lineHeight: 19, paddingHorizontal: 10 },
  card: { borderRadius: 16, borderWidth: 1, padding: 18, gap: 14 },
  cardTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  cardDesc: { fontSize: 12, lineHeight: 18 },
  generateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 15, borderRadius: 12, borderWidth: 1 },
  generateBtnText: { fontSize: 14, fontWeight: "700", letterSpacing: 1 },
  infoBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  infoBoxText: { fontSize: 12, flex: 1 },
  keyInputWrap: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  keyInput: { flex: 1, fontSize: 18, fontWeight: "700", letterSpacing: 3, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  attemptsRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  attemptDot: { width: 10, height: 10, borderRadius: 5 },
  attemptsText: { fontSize: 12, marginLeft: 4 },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { flex: 1, fontSize: 12, lineHeight: 18 },
  validateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 15, borderRadius: 12 },
  validateBtnText: { fontSize: 14, fontWeight: "800", letterSpacing: 2 },
  skipBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  skipText: { fontSize: 12 },
  lockedTitle: { fontSize: 22, fontWeight: "800", letterSpacing: 2 },
  lockedSub: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  successCircle: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 24, fontWeight: "800", letterSpacing: 3 },
  successSub: { fontSize: 14 },
  countdown: { fontSize: 64, fontWeight: "800" },
});
