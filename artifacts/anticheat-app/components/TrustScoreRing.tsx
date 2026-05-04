import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

interface Props {
  score: number;
  size?: number;
}

export function TrustScoreRing({ score, size = 140 }: Props) {
  const colors = useColors();
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const center = size / 2;

  const getColor = () => {
    if (score >= 80) return colors.green;
    if (score >= 50) return colors.yellow;
    if (score >= 20) return colors.orange;
    return colors.red;
  };

  const getLabel = () => {
    if (score >= 80) return "AMAN";
    if (score >= 50) return "WASPADA";
    if (score >= 20) return "BAHAYA";
    return "KRITIS";
  };

  const ringColor = getColor();

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          rotation="-90"
          originX={center}
          originY={center}
        />
      </Svg>
      <View style={[styles.inner, { width: size, height: size }]}>
        <Text style={[styles.score, { color: ringColor }]}>{score}</Text>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{getLabel()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  score: {
    fontSize: 36,
    fontWeight: "700",
    lineHeight: 40,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    marginTop: 2,
  },
});
