
import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";

export default function VehicleInformationScreen() {
  const { user } = useAuth();

  if (!user) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const vehicles = user.vehicles ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleSection}>
        <View style={styles.titleIcon}>
          <MaterialIcons
            name="directions-car"
            size={27}
            color="#FFFFFF"
          />
        </View>

        <Text style={styles.title}>
          Vehicle Information
        </Text>

        <Text style={styles.subtitle}>
          View all vehicles registered under your profile.
        </Text>
      </View>

      {vehicles.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <MaterialIcons
              name="directions-car"
              size={48}
              color="#8A9BB0"
            />
          </View>

          <Text style={styles.emptyTitle}>
            No Vehicles Yet
          </Text>

          <Text style={styles.emptyText}>
            No vehicles are currently registered under your profile.
          </Text>
        </View>
      ) : (
        vehicles.map((vehicle, index) => (
          <View
            key={vehicle.vehicleId || index}
            style={styles.card}
          >
            <View style={styles.header}>
              <View style={styles.vehicleIcon}>
                <MaterialIcons
                  name="directions-car"
                  size={30}
                  color="#003366"
                />
              </View>

              <View style={styles.vehicleHeading}>
                <Text style={styles.vehicleName}>
                  {vehicle.make} {vehicle.model}
                </Text>

                <View style={styles.registrationBadge}>
                  <MaterialIcons
                    name="confirmation-number"
                    size={15}
                    color="#003366"
                  />

                  <Text style={styles.reg}>
                    {vehicle.registrationNumber || "-"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeading}>
              <MaterialIcons
                name="info-outline"
                size={18}
                color="#003366"
              />
              <Text style={styles.sectionTitle}>
                Vehicle Details
              </Text>
            </View>

            <Row
              label="Vehicle ID"
              value={vehicle.vehicleId}
            />

            <Row
              label="Year"
              value={String(vehicle.year ?? "-")}
            />

            <Row
              label="Colour"
              value={vehicle.colour}
            />

            <Row
              label="VIN"
              value={vehicle.vin}
            />

            <Row
              label="Engine Number"
              value={vehicle.engineNumber}
            />

            <View style={styles.sectionHeading}>
              <MaterialIcons
                name="description"
                size={18}
                color="#003366"
              />
              <Text style={styles.sectionTitle}>
                Licence Disk
              </Text>
            </View>

            <Row
              label="Licence Disk"
              value={vehicle.licenceDisk?.number}
            />

            <Row
              label="Disk Expiry"
              value={vehicle.licenceDisk?.expiryDate}
            />

            <Row
              label="Disk Status"
              value={vehicle.licenceDisk?.status}
            />

            <View style={styles.sectionHeading}>
              <MaterialIcons
                name="verified-user"
                size={18}
                color="#003366"
              />
              <Text style={styles.sectionTitle}>
                Compliance & Ownership
              </Text>
            </View>

            <Row
              label="Roadworthy"
              value={vehicle.roadworthy ? "Yes" : "No"}
            />

            <Row
              label="Owner"
              value={vehicle.ownership?.owner ? "Yes" : "No"}
            />

            <Row
              label="Financed"
              value={vehicle.ownership?.financed ? "Yes" : "No"}
            />

            <Row
              label="Reported Stolen"
              value={vehicle.stolen ? "Yes" : "No"}
            />
          </View>
        ))
      )}
    </ScrollView>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>
        {label}
      </Text>

      <Text style={styles.value}>
        {value || "-"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F6FA",
  },

  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F6FA",
  },

  loadingText: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "500",
  },

  titleSection: {
    marginBottom: 25,
  },

  titleIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#003366",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },

  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#003366",
    letterSpacing: -0.5,
  },

  subtitle: {
    color: "#64748B",
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 38,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8EDF4",
  },

  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#F0F4F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#003366",
    marginBottom: 8,
  },

  emptyText: {
    color: "#718096",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8EDF4",
    elevation: 3,
    shadowColor: "#003366",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF1F6",
  },

  vehicleIcon: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: "#EAF1FA",
    justifyContent: "center",
    alignItems: "center",
  },

  vehicleHeading: {
    flex: 1,
    marginLeft: 14,
  },

  vehicleName: {
    fontSize: 19,
    fontWeight: "800",
    color: "#003366",
    marginBottom: 7,
  },

  registrationBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#F0F5FB",
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 5,
  },

  reg: {
    color: "#003366",
    fontSize: 12,
    fontWeight: "700",
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    marginBottom: 7,
    paddingTop: 9,
    gap: 8,
  },

  sectionTitle: {
    color: "#003366",
    fontSize: 14,
    fontWeight: "800",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F6",
    gap: 12,
  },

  label: {
    color: "#718096",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },

  value: {
    fontSize: 13,
    fontWeight: "700",
    color: "#172B4D",
    flex: 1,
    textAlign: "right",
  },
});
