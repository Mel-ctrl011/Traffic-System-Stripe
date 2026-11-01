
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import WeatherAlerts from "./Updates/WeatherAlerts";
import DepartmentAnnouncements from "./Updates/DepartmentAnnouncements";

const COLORS = {
  primary: "#0B4F8A",
  background: "#F3F5F7",
  card: "#FFFFFF",
  text: "#17212B",
  textLight: "#66737F",
  border: "#D9E0E6",
  softBlue: "#EAF3FA",
};

export default function TrafficNewsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="newspaper-outline"
              size={24}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.headerInformation}>
            <Text style={styles.eyebrow}>CITIZEN SERVICES</Text>

            <Text style={styles.title}>Traffic News</Text>

            <Text style={styles.subtitle}>
              Weather warnings and official traffic and
              transport announcements in one place.
            </Text>
          </View>
        </View>

        {/* WEATHER ALERTS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <MaterialCommunityIcons
                name="weather-partly-cloudy"
                size={21}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.sectionHeaderInformation}>
              <Text style={styles.sectionTitle}>
                Weather Alerts
              </Text>

              <Text style={styles.sectionDescription}>
                Weather conditions that may affect driving.
              </Text>
            </View>
          </View>

          <WeatherAlerts />
        </View>

        {/* DEPARTMENT ANNOUNCEMENTS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <MaterialCommunityIcons
                name="bullhorn-outline"
                size={21}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.sectionHeaderInformation}>
              <Text style={styles.sectionTitle}>
                Department Announcements
              </Text>

              <Text style={styles.sectionDescription}>
                Official traffic and transport announcements.
              </Text>
            </View>
          </View>

          <DepartmentAnnouncements />
        </View>

        {/* INFORMATION NOTICE */}
        <View style={styles.notice}>
          <Ionicons
            name="information-circle-outline"
            size={19}
            color={COLORS.primary}
          />

          <Text style={styles.noticeText}>
            Check weather alerts and official announcements
            before travelling. Always follow instructions
            issued by the relevant authorities.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  contentContainer: {
    paddingHorizontal: 15,
    paddingTop: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
  },

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerInformation: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: COLORS.primary,
  },

  title: {
    marginTop: 3,
    fontSize: 25,
    fontWeight: "800",
    color: COLORS.text,
  },

  subtitle: {
    marginTop: 5,
    color: COLORS.textLight,
    fontSize: 12,
    lineHeight: 18,
  },

  section: {
    marginBottom: 25,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  sectionHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  sectionHeaderInformation: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },

  sectionDescription: {
    marginTop: 3,
    color: COLORS.textLight,
    fontSize: 11,
    lineHeight: 16,
  },

  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.softBlue,
    borderWidth: 1,
    borderColor: "#C7DDED",
    borderRadius: 10,
    padding: 12,
  },

  noticeText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.text,
  },
});
