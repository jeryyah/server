import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Username dan password wajib diisi.");
      return;
    }
    setError("");
    setIsLoading(true);
    const result = await login(username.trim(), password, discordWebhook.trim() || undefined);
    setIsLoading(false);
    if (result.success) {
      router.replace("/(tabs)/");
    } else {
      setError(result.error ?? "Login gagal.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 40), paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoWrap}>
          <View style={[styles.shieldOuter, { borderColor: colors.cyan + "40" }]}>
            <View style={[styles.shieldInner, { backgroundColor: colors.cyan + "15" }]}>
              <Feather name="shield" size={48} color={colors.cyan} />
            </View>
          </View>
          <Text style={[styles.appName, { color: colors.foreground }]}>ANTI-CHEAT</Text>
          <Text style={[styles.appSub, { color: colors.mutedForeground }]}>Security System v1.0</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>LOGIN</Text>

          <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
            <Feather name="user" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Username"
              placeholderTextColor={colors.mutedForeground}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
            <Feather name="lock" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.advancedToggle}
            onPress={() => setShowAdvanced(!showAdvanced)}
          >
            <Feather name={showAdvanced ? "chevron-up" : "chevron-down"} size={14} color={colors.cyan} />
            <Text style={[styles.advancedText, { color: colors.cyan }]}>
              {showAdvanced ? "Sembunyikan" : "Pengaturan Discord"}
            </Text>
          </TouchableOpacity>

          {showAdvanced && (
            <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
              <Feather name="bell" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Discord Webhook URL (opsional)"
                placeholderTextColor={colors.mutedForeground}
                value={discordWebhook}
                onChangeText={setDiscordWebhook}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.red + "15", borderColor: colors.red + "40" }]}>
              <Feather name="alert-circle" size={14} color={colors.red} />
              <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.cyan }, isLoading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} size="small" />
            ) : (
              <>
                <Feather name="log-in" size={18} color={colors.background} />
                <Text style={[styles.loginBtnText, { color: colors.background }]}>MASUK</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.hwidBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="cpu" size={13} color={colors.mutedForeground} />
          <Text style={[styles.hwidText, { color: colors.mutedForeground }]}>
            Akun terikat ke HWID perangkat ini. Pendaftaran otomatis saat login pertama.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, justifyContent: "center", gap: 20 },
  logoWrap: { alignItems: "center", gap: 10, marginBottom: 8 },
  shieldOuter: { width: 96, height: 96, borderRadius: 48, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  shieldInner: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  appName: { fontSize: 26, fontWeight: "800", letterSpacing: 4 },
  appSub: { fontSize: 12, letterSpacing: 2 },
  card: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 12 },
  cardTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 2, marginBottom: 4 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  input: { flex: 1, fontSize: 14 },
  advancedToggle: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  advancedText: { fontSize: 13, fontWeight: "600" },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { flex: 1, fontSize: 12, lineHeight: 18 },
  loginBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 15, borderRadius: 12, marginTop: 4 },
  loginBtnText: { fontSize: 15, fontWeight: "800", letterSpacing: 2 },
  hwidBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  hwidText: { flex: 1, fontSize: 11, lineHeight: 17 },
});
