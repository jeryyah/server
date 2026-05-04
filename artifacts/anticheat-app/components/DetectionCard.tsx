import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { DetectionEvent, DetectionSeverity } from "@/context/DetectionContext";

interface Props {
  event: DetectionEvent;
}

const severityConfig: Record<DetectionSeverity, { icon: string; label: string }> = {
  low: { icon: "check-circle", label: "LOW" },
  medium: { icon: "alert-circle", label: "MEDIUM" },
  high: { icon: "alert-triangle", label: "HIGH" },
  critical: { icon: "x-octagon", label: "CRITICAL" },
};

export function DetectionCard({ event }: Props) {
  const colors = useColors();
  const config = severityConfig[event.severity];

  const getSeverityColor = (severity: DetectionSeverity): string => {
    switch (severity) {
      case "low": return colors.green;
      case "medium": return colors.yellow;
      case "high": return colors.orange;
      case "critical": return colors.red;
    }
  };

  const color = getSeverityColor(event.severity);
  const time = new Date(event.timestamp).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const date = new Date(event.timestamp).toLocaleDateString("id-ID");

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: color + "30" }]}>
      <View style={[styles.indicator, { backgroundColor: color }]} />
      <View style={styles.iconWrap}>
        <Feather name={config.icon as any} size={20} color={color} />
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.type, { color: colors.foreground }]}>{event.type}</Text>
          <View style={[styles.badge, { backgroundColor: color + "20" }]}>
            <Text style={[styles.badgeText, { color }]}>{config.label}</Text>
          </View>
        </View>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>{event.description}</Text>
        {event.details ? (
          <Text style={[styles.details, { color: colors.mutedForeground + "99" }]}>{event.details}</Text>
        ) : null}
        <Text style={[styles.time, { color: colors.mutedForeground }]}>{date} {time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
    alignItems: "flex-start",
  },
  indicator: {
    width: 3,
    alignSelf: "stretch",
  },
  iconWrap: {
    padding: 14,
    paddingTop: 16,
  },
  content: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 14,
    gap: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  type: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
  },
  details: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "monospace",
  },
  time: {
    fontSize: 11,
    marginTop: 2,
  },
});
