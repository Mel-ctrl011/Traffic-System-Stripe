
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { AppointmentService } from "../types/appointment";

/* =========================================================
   TYPES
========================================================= */

interface ServiceStepProps {
  selectedService: AppointmentService | null;
  onSelectService: (service: AppointmentService) => void;
}

/* =========================================================
   TEMPORARY SERVICES
========================================================= */

const SERVICES: AppointmentService[] = [
  {
    id: "learners",
    name: "Learner's Licence",
    description:
      "Book an appointment to apply for or complete your learner's licence.",
    duration: "Approx. 30 min",
  },

  {
    id: "driving",
    name: "Driver's Licence",
    description:
      "Book an appointment for your driver's licence application or test.",
    duration: "Approx. 45 min",
  },

  {
    id: "renewal",
    name: "Licence Renewal",
    description:
      "Renew your existing driver's licence at a licensing centre.",
    duration: "Approx. 30 min",
  },

  {
    id: "professional",
    name: "Professional Driving Permit",
    description:
      "Apply for or renew a professional driving permit.",
    duration: "Approx. 45 min",
  },

  {
    id: "vehicle",
    name: "Vehicle Licence",
    description:
      "Complete a vehicle licensing service at your selected branch.",
    duration: "Approx. 30 min",
  },
];

/* =========================================================
   COMPONENT
========================================================= */

export default function ServiceStep({
  selectedService,
  onSelectService,
}: ServiceStepProps) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <View style={styles.introduction}>
        <Text style={styles.title}>
          What do you need help with?
        </Text>

        <Text style={styles.description}>
          Select the service you want to book an
          appointment for.
        </Text>
      </View>

      <View style={styles.servicesContainer}>
        {SERVICES.map((service) => {
          const selected =
            selectedService?.id === service.id;

          return (
            <TouchableOpacity
              key={service.id}
              activeOpacity={0.8}
              onPress={() => onSelectService(service)}
              style={[
                styles.serviceCard,
                selected && styles.serviceCardSelected,
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  selected &&
                    styles.iconContainerSelected,
                ]}
              >
                <Ionicons
                  name="car-outline"
                  size={24}
                  color={
                    selected
                      ? "#FFFFFF"
                      : "#2563EB"
                  }
                />
              </View>

              <View style={styles.serviceInformation}>
                <Text
                  style={[
                    styles.serviceName,
                    selected &&
                      styles.serviceNameSelected,
                  ]}
                >
                  {service.name}
                </Text>

                <Text style={styles.serviceDescription}>
                  {service.description}
                </Text>

                {service.duration && (
                  <View style={styles.durationRow}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color="#64748B"
                    />

                    <Text style={styles.durationText}>
                      {service.duration}
                    </Text>
                  </View>
                )}
              </View>

              <View
                style={[
                  styles.radioOuter,
                  selected &&
                    styles.radioOuterSelected,
                ]}
              >
                {selected && (
                  <View style={styles.radioInner} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedService && (
        <View style={styles.selectedMessage}>
          <Ionicons
            name="checkmark-circle"
            size={18}
            color="#16A34A"
          />

          <Text style={styles.selectedMessageText}>
            {selectedService.name} selected
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  content: {
    paddingBottom: 30,
  },

  introduction: {
    marginBottom: 24,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },

  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
  },

  servicesContainer: {
    gap: 12,
  },

  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  serviceCardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    marginRight: 14,
  },

  iconContainerSelected: {
    backgroundColor: "#2563EB",
  },

  serviceInformation: {
    flex: 1,
  },

  serviceName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },

  serviceNameSelected: {
    color: "#1D4ED8",
  },

  serviceDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
  },

  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 5,
  },

  durationText: {
    fontSize: 12,
    color: "#64748B",
  },

  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  radioOuterSelected: {
    borderColor: "#2563EB",
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563EB",
  },

  selectedMessage: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
    gap: 8,
  },

  selectedMessageText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#166534",
  },
});

