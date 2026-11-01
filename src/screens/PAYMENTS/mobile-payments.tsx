import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function MobilePaymentsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mobile Payments</Text>

      <Text style={styles.subtitle}>
        Pay quickly using supported mobile payment services.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F6F8",
    padding: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#003366",
    marginBottom: 10,
  },

  subtitle: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
  },
});