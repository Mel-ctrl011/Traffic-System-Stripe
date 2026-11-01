import React from "react";
import { View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeScreen from "../screens/HomeScreen";
import LicensesScreen from "../screens/LicensesScreen";
import ServicesScreen from "../screens/ServicesScreen";
import PaymentsScreen from "../screens/PaymentsScreen";
import NewsScreen from "../screens/NewsScreen";

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#3F51B5",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarHideOnKeyboard: true,

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginBottom: 4,
        },

        tabBarStyle: {
          backgroundColor: "#FFFFFF",

          // Respect Android navigation bar
          height: 65 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,

          borderTopWidth: 1,
          borderTopColor: "#ECECEC",

          elevation: 8,
          shadowOpacity: 0,
        },

        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      {/* Home */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="home"
              color={color}
              size={size}
            />
          ),
        }}
      />

      {/* Licenses */}
      <Tab.Screen
        name="Licenses"
        component={LicensesScreen}
        options={{
          tabBarLabel: "Licenses",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="card"
              color={color}
              size={size}
            />
          ),
        }}
      />

      {/* Services */}
      <Tab.Screen
        name="Services"
        component={ServicesScreen}
        options={{
          tabBarLabel: "Services",
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.servicesButton,
                {
                  backgroundColor: focused ? "#3F51B5" : "#5C6BC0",
                },
              ]}
            >
              <Ionicons
                name="apps"
                size={30}
                color="#FFFFFF"
              />
            </View>
          ),
        }}
      />

      {/* Payments */}
      <Tab.Screen
        name="Payments"
        component={PaymentsScreen}
        options={{
          tabBarLabel: "Payments",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="wallet"
              color={color}
              size={size}
            />
          ),
        }}
      />

      {/* Updates */}
      <Tab.Screen
        name="Updates"
        component={NewsScreen}
        options={{
          tabBarLabel: "Updates",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="newspaper"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  servicesButton: {
    width: 66,
    height: 66,
    borderRadius: 33,

    justifyContent: "center",
    alignItems: "center",

    marginTop: -50,

    backgroundColor: "#3F51B5",

    shadowColor: "#3F51B5",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 8,
  },
});