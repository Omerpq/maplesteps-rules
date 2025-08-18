import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export default function TimelineScreen() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.h1}>Timeline</Text>
      <Text>Calendar & reminders (push) — to be wired with Expo Notifications.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: "#fff" },
  h1: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 8 },
});
