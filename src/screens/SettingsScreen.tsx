import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export default function SettingsScreen() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.h1}>Settings & Legal</Text>
      <Text>Region: Pakistan (default)</Text>
      <Text style={{marginTop: 8}}>
        Disclaimer: This app provides educational information, not legal advice; not affiliated with IRCC.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: "#fff" },
  h1: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 8 },
});
