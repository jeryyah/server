import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface Props {
  icon: string;
  label: string;
  status: boolean;
  safeWhenTrue?: boolean;
}

export function StatusItem({ icon, label, status, safeWhenTrue = false }: Props) {
  const colors = useColors();
  const isSafe = safeWhenTrue ? status : !status;
  const color = isSafe ? colors.green : colors.red;
  const statusText = isSafe ? "AMAN" : "TERDETEKSI";

  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <View style={[styles.statusBadge, { backgroundColor: color + "18" }]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.statusText, { color }]}>{statusText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
});
