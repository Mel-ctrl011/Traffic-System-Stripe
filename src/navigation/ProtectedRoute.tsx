import React from "react";
import { View, Text } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }: any) {
  const { isLoggedIn, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading system...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Access Denied. Please login.</Text>
      </View>
    );
  }

  return children;
}