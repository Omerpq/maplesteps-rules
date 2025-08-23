import React from "react";
import { TouchableOpacity, Text, StyleSheet, GestureResponderEvent } from "react-native";
import { colors } from "../theme/colors";

type Props = {
  title: string;
  onPress?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  testID?: string;               // ← add this
};


export default function PrimaryButton({ title, onPress, disabled, testID }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.btn, disabled && { opacity: 0.6 }]}
      disabled={disabled}
      testID={testID}            // ← forward it
    >
      <Text style={styles.txt}>{title}</Text>
    </TouchableOpacity>
  );
}


const styles = StyleSheet.create({
  btn: { backgroundColor: colors.mapleRed, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  txt: { color: "white", fontWeight: "600", fontSize: 16 }
});
