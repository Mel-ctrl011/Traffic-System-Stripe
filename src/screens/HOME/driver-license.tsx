import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function VehicleLicenseScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vehicle License</Text>
      <Text style={styles.subtitle}>
        View your vehicle license information here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});