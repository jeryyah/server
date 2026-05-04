import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useDetection, DetectionSeverity } from "@/context/DetectionContext";
import { DetectionCard } from "@/components/DetectionCard";

const FILTERS: { label: string; value: DetectionSeverity | "all" }[] = [
  { label: "SEMUA", value: "all" },
  { label: "KRITIS", value: "critical" },
  { label: "HIGH", value: "high" },
  { label: "MEDIUM", value: "medium" },
  { label: "LOW", value: "low" },
];

export default function LogsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { events, clearEvents } = useDetection();
  const [filter, setFilter] = useState<DetectionSeverity | "all">("all");

  const filtered = filter === "all" ? events : events.filter((e) => e.severity === filter);

  const handleClear = () => {
    Alert.alert("Hapus Log", "Yakin ingin menghapus semua log deteksi?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await clearEvents();
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>LOG DETEKSI</Text>
        <TouchableOpacity onPress={handleClear}>
          <Feather name="trash-2" size={18} color={colors.red} />
        </TouchableOpacity>
      </View>

      <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            onPress={() => setFilter(f.value)}
            style={[
              styles.filterChip,
              filter === f.value && { backgroundColor: colors.cyan + "20", borderColor: colors.cyan },
              filter !== f.value && { borderColor: "transparent" },
            ]}
          >
            <Text style={[styles.filterText, { color: filter === f.value ? colors.cyan : colors.mutedForeground }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DetectionCard event={item} />}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100) }]}
        scrollEnabled={!!filtered.length}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="clipboard" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Belum ada log deteksi</Text>
            <Text style={[styles.emptySubText, { color: colors.mutedForeground + "80" }]}>Jalankan scan dari dashboard</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: "800", letterSpacing: 2 },
  filterBar: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  filterText: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  list: { padding: 16 },
  empty: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 15, fontWeight: "600" },
  emptySubText: { fontSize: 12 },
});
