import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export default function VaultScreen() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.h1}>Document Vault</Text>
      <Text>Securely store IELTS, ECAs, police certificates, and proofs. (MVP stub)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: "#fff" },
  h1: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 8 },
});
