
import React from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";

export default function LicenseDiskPaymentsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const vehicles = user?.vehicles ?? [];

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="card-outline" size={28} color="#003366" />
          </View>

          <Text style={styles.title}>License Disk Payments</Text>

          <Text style={styles.subtitle}>
            Renew your vehicle license disk and securely manage your
            registration payments.
          </Text>
        </View>

        {/* INFORMATION CARD */}
        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color="#1565C0"
          />

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Keep your license disk valid</Text>

            <Text style={styles.infoText}>
              Your vehicle license disk must remain valid to keep your vehicle
              legally licensed for use on public roads.
            </Text>
          </View>
        </View>

        {/* VEHICLES */}
        <Text style={styles.sectionTitle}>Your Vehicles</Text>

        {vehicles.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="car-outline"
              size={40}
              color="#999"
            />

            <Text style={styles.emptyTitle}>No vehicles registered</Text>

            <Text style={styles.emptyText}>
              There are currently no vehicles linked to your account.
            </Text>
          </View>
        ) : (
          vehicles.map((vehicle) => {
            const disk = vehicle.licenceDisk;

            return (
              <View key={vehicle.vehicleId} style={styles.vehicleCard}>
                {/* VEHICLE HEADER */}
                <View style={styles.vehicleHeader}>
                  <View style={styles.vehicleIcon}>
                    <Ionicons
                      name="car-sport-outline"
                      size={24}
                      color="#003366"
                    />
                  </View>

                  <View style={styles.vehicleHeaderText}>
                    <Text style={styles.vehicleName}>
                      {vehicle.make} {vehicle.model}
                    </Text>

                    <Text style={styles.registration}>
                      {vehicle.registrationNumber || "Registration unavailable"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      disk?.status === "Valid"
                        ? styles.validBadge
                        : styles.warningBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        disk?.status === "Valid"
                          ? styles.validText
                          : styles.warningText,
                      ]}
                    >
                      {disk?.status ?? "Unknown"}
                    </Text>
                  </View>
                </View>

                {/* VEHICLE DETAILS */}
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <View>
                    <Text style={styles.detailLabel}>License Disk</Text>
                    <Text style={styles.detailValue}>
                      {disk?.number ?? "Not available"}
                    </Text>
                  </View>

                  <View style={styles.detailRight}>
                    <Text style={styles.detailLabel}>Expiry Date</Text>
                    <Text style={styles.detailValue}>
                      {disk?.expiryDate ?? "Not available"}
                    </Text>
                  </View>
                </View>

                {/* ACTION */}
                <TouchableOpacity
                  style={styles.payButton}
                  activeOpacity={0.8}
                  onPress={() =>
                    navigation.navigate("VehicleRegistrationFees")
                  }
                >
                  <Ionicons
                    name="card-outline"
                    size={19}
                    color="#FFFFFF"
                  />

                  <Text style={styles.payButtonText}>
                    Renew & Pay License Disk
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* DIGITAL LICENSE DISK */}
        <Text style={styles.sectionTitle}>Digital License Information</Text>

        <View style={styles.digitalCard}>
          <View style={styles.digitalIcon}>
            <Ionicons
              name="phone-portrait-outline"
              size={25}
              color="#003366"
            />
          </View>

          <View style={styles.digitalContent}>
            <Text style={styles.digitalTitle}>
              Digital License Disk
            </Text>

            <Text style={styles.digitalText}>
              View your vehicle licensing information digitally after your
              payment has been processed.
            </Text>

            <TouchableOpacity
              style={styles.digitalButton}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate("VehicleInformation")
              }
            >
              <Text style={styles.digitalButtonText}>
                View Vehicle Details
              </Text>

              <Ionicons
                name="arrow-forward"
                size={17}
                color="#003366"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* PAYMENT SECURITY */}
        <View style={styles.securityCard}>
          <Ionicons
            name="shield-checkmark-outline"
            size={24}
            color="#2E7D32"
          />

          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>
              Secure Payments
            </Text>

            <Text style={styles.securityText}>
              Payments are securely processed. Keep your payment receipt for
              your records.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },

  content: {
    padding: 16,
    paddingBottom: 35,
  },

  header: {
    marginTop: 10,
    marginBottom: 20,
  },

  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#E8EEF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#003366",
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#666",
    marginTop: 6,
  },

  infoCard: {
    backgroundColor: "#EAF2FB",
    borderRadius: 14,
    padding: 15,
    flexDirection: "row",
    marginBottom: 25,
  },

  infoContent: {
    flex: 1,
    marginLeft: 11,
  },

  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#003366",
    marginBottom: 4,
  },

  infoText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#555",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#003366",
    marginBottom: 11,
  },

  vehicleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  vehicleHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  vehicleIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#EAF0F6",
    alignItems: "center",
    justifyContent: "center",
  },

  vehicleHeaderText: {
    flex: 1,
    marginLeft: 12,
  },

  vehicleName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#222",
  },

  registration: {
    fontSize: 13,
    color: "#777",
    marginTop: 3,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  validBadge: {
    backgroundColor: "#E8F5E9",
  },

  warningBadge: {
    backgroundColor: "#FFF3E0",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },

  validText: {
    color: "#2E7D32",
  },

  warningText: {
    color: "#E65100",
  },

  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 15,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  detailRight: {
    alignItems: "flex-end",
  },

  detailLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 3,
  },

  detailValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222",
  },

  payButton: {
    marginTop: 16,
    backgroundColor: "#003366",
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  payButtonText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 9,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 30,
    alignItems: "center",
    marginBottom: 25,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginTop: 10,
  },

  emptyText: {
    textAlign: "center",
    color: "#777",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },

  digitalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 16,
    flexDirection: "row",
    marginBottom: 15,
  },

  digitalIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EAF0F6",
    alignItems: "center",
    justifyContent: "center",
  },

  digitalContent: {
    flex: 1,
    marginLeft: 12,
  },

  digitalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#222",
  },

  digitalText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#666",
    marginTop: 4,
  },

  digitalButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  digitalButtonText: {
    color: "#003366",
    fontSize: 13,
    fontWeight: "700",
    marginRight: 5,
  },

  securityCard: {
    backgroundColor: "#F0F8F1",
    borderRadius: 14,
    padding: 15,
    flexDirection: "row",
    marginTop: 5,
  },

  securityContent: {
    flex: 1,
    marginLeft: 10,
  },

  securityTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2E7D32",
  },

  securityText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#555",
    marginTop: 3,
  },
});
