
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";

export default function VehiclePaymentsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const vehicles = user?.vehicles ?? [];
  const vehicleCount = user?.vehicleCount ?? vehicles.length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialIcons
            name="directions-car"
            size={28}
            color="#003366"
          />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.title}>Vehicle Payments</Text>

          <Text style={styles.subtitle}>
            Manage vehicle-related payments, licence disks and
            registration fees.
          </Text>
        </View>
      </View>

      {/* SUMMARY */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <MaterialIcons
            name="account-balance-wallet"
            size={25}
            color="#003366"
          />
        </View>

        <View style={styles.summaryContent}>
          <Text style={styles.summaryLabel}>
            Vehicle Payment Overview
          </Text>

          <Text style={styles.summaryValue}>
            {vehicleCount}{" "}
            {vehicleCount === 1 ? "Vehicle" : "Vehicles"}
          </Text>

          <Text style={styles.summaryDescription}>
            Your registered vehicles are shown below. Payment
            balances will appear here when payment information is
            available.
          </Text>
        </View>
      </View>

      {/* PAYMENT ACTIONS */}
      <SectionTitle
        title="Payment Services"
        subtitle="Quick access to vehicle-related payments"
      />

      <ActionCard
        icon="receipt-long"
        title="Vehicle Registration Fees"
        description="View and settle fees associated with vehicle registration."
        onPress={() =>
          navigation.navigate("VehicleRegistrationFees")
        }
      />

      <ActionCard
        icon="credit-card"
        title="Licence Disk Payments"
        description="Manage payments related to your vehicle licence disk."
        onPress={() =>
          navigation.navigate("LicenseDiskPayments")
        }
      />

      <ActionCard
        icon="history"
        title="Payment History"
        description="Review previous vehicle-related payments and transactions."
        onPress={() =>
          navigation.navigate("PaymentHistory")
        }
      />

      {/* VEHICLES */}
      <SectionTitle
        title="Your Vehicles"
        subtitle="Payment and licence information for your registered vehicles"
      />

      {vehicles.length === 0 ? (
        <EmptyState />
      ) : (
        vehicles.map((vehicle, index) => (
          <VehicleCard
            key={vehicle.vehicleId || index}
            vehicle={vehicle}
            onView={() =>
              navigation.navigate("VehicleInformation")
            }
          />
        ))
      )}

      {/* INFORMATION */}
      <View style={styles.infoCard}>
        <View style={styles.infoIcon}>
          <Ionicons
            name="information-circle-outline"
            size={24}
            color="#003366"
          />
        </View>

        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>
            About Vehicle Payments
          </Text>

          <Text style={styles.infoText}>
            Vehicle payments may include licence renewal,
            registration fees and other applicable charges.
            Always verify the amount and vehicle details before
            making a payment.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

/* =========================================================
   SECTION TITLE
========================================================= */

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <Text style={styles.sectionSubtitle}>
        {subtitle}
      </Text>
    </View>
  );
}

/* =========================================================
   ACTION CARD
========================================================= */

function ActionCard({
  icon,
  title,
  description,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.actionCard}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={styles.actionIcon}>
        <MaterialIcons
          name={icon}
          size={23}
          color="#003366"
        />
      </View>

      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{title}</Text>

        <Text style={styles.actionDescription}>
          {description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color="#999"
      />
    </TouchableOpacity>
  );
}

/* =========================================================
   VEHICLE CARD
========================================================= */

function VehicleCard({
  vehicle,
  onView,
}: {
  vehicle: any;
  onView: () => void;
}) {
  const licenceDisk = vehicle?.licenceDisk;

  const licenceStatus =
    licenceDisk?.status ?? "Unknown";

  const isValid =
    licenceStatus.toLowerCase() === "valid";

  return (
    <View style={styles.vehicleCard}>
      {/* VEHICLE HEADER */}
      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleIcon}>
          <MaterialIcons
            name="directions-car"
            size={25}
            color="#003366"
          />
        </View>

        <View style={styles.vehicleTitleContainer}>
          <Text style={styles.vehicleTitle}>
            {vehicle?.make || "Unknown"}{" "}
            {vehicle?.model || "Vehicle"}
          </Text>

          <Text style={styles.registration}>
            {vehicle?.registrationNumber || "Registration unavailable"}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            isValid
              ? styles.statusGood
              : styles.statusWarning,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              isValid
                ? styles.statusTextGood
                : styles.statusTextWarning,
            ]}
          >
            {licenceStatus}
          </Text>
        </View>
      </View>

      {/* VEHICLE DETAILS */}
      <View style={styles.divider} />

      <InfoRow
        icon="event"
        label="Licence Disk"
        value={
          licenceDisk?.number || "Not available"
        }
      />

      <InfoRow
        icon="event"
        label="Expiry Date"
        value={
          licenceDisk?.expiryDate || "Not available"
        }
      />

      <InfoRow
        icon="verified"
        label="Ownership"
        value={
          vehicle?.ownership?.owner
            ? "Registered Owner"
            : "Not confirmed"
        }
      />

      <InfoRow
        icon="build"
        label="Roadworthy"
        value={
          vehicle?.roadworthy
            ? "Roadworthy"
            : "Not Roadworthy"
        }
      />

      {/* PAYMENT NOTICE */}
      <View style={styles.paymentNotice}>
        <MaterialIcons
          name="payments"
          size={20}
          color="#003366"
        />

        <View style={styles.paymentNoticeContent}>
          <Text style={styles.paymentNoticeTitle}>
            Payment Balance
          </Text>

          <Text style={styles.paymentNoticeText}>
            No payment balance is currently available
            for this vehicle.
          </Text>
        </View>
      </View>

      {/* VIEW BUTTON */}
      <TouchableOpacity
        style={styles.viewButton}
        activeOpacity={0.8}
        onPress={onView}
      >
        <Text style={styles.viewButtonText}>
          View Vehicle Details
        </Text>

        <Ionicons
          name="arrow-forward"
          size={18}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </View>
  );
}

/* =========================================================
   INFO ROW
========================================================= */

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <MaterialIcons
        name={icon}
        size={18}
        color="#777"
      />

      <Text style={styles.infoRowLabel}>
        {label}
      </Text>

      <Text style={styles.infoRowValue}>
        {value}
      </Text>
    </View>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState() {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <MaterialIcons
          name="directions-car"
          size={32}
          color="#777"
        />
      </View>

      <Text style={styles.emptyTitle}>
        No Vehicles Registered
      </Text>

      <Text style={styles.emptyText}>
        You currently don't have any vehicles linked
        to your profile.
      </Text>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },

  content: {
    padding: 16,
    paddingBottom: 35,
  },

  /* HEADER */

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },

  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#E7EEF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 25,
    fontWeight: "800",
    color: "#003366",
  },

  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    lineHeight: 20,
  },

  /* SUMMARY */

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    marginBottom: 25,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: "#E7EEF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  summaryContent: {
    flex: 1,
  },

  summaryLabel: {
    fontSize: 13,
    color: "#777",
    fontWeight: "600",
  },

  summaryValue: {
    fontSize: 21,
    fontWeight: "800",
    color: "#003366",
    marginTop: 3,
  },

  summaryDescription: {
    fontSize: 13,
    color: "#777",
    lineHeight: 18,
    marginTop: 5,
  },

  /* SECTION */

  sectionHeader: {
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#003366",
  },

  sectionSubtitle: {
    fontSize: 13,
    color: "#777",
    marginTop: 3,
  },

  /* ACTION */

  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#E7EEF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  actionContent: {
    flex: 1,
  },

  actionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },

  actionDescription: {
    fontSize: 12,
    color: "#777",
    lineHeight: 17,
    marginTop: 3,
  },

  /* VEHICLE */

  vehicleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
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
    borderRadius: 13,
    backgroundColor: "#E7EEF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  vehicleTitleContainer: {
    flex: 1,
  },

  vehicleTitle: {
    fontSize: 16,
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

  statusGood: {
    backgroundColor: "#E8F5E9",
  },

  statusWarning: {
    backgroundColor: "#FFF3E0",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },

  statusTextGood: {
    color: "#2E7D32",
  },

  statusTextWarning: {
    color: "#E65100",
  },

  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 14,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
  },

  infoRowLabel: {
    fontSize: 13,
    color: "#777",
    marginLeft: 8,
  },

  infoRowValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
  },

  /* PAYMENT NOTICE */

  paymentNotice: {
    marginTop: 12,
    padding: 12,
    borderRadius: 11,
    backgroundColor: "#F4F7FA",
    flexDirection: "row",
    alignItems: "center",
  },

  paymentNoticeContent: {
    flex: 1,
    marginLeft: 9,
  },

  paymentNoticeTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#003366",
  },

  paymentNoticeText: {
    fontSize: 12,
    color: "#777",
    lineHeight: 17,
    marginTop: 2,
  },

  /* BUTTON */

  viewButton: {
    marginTop: 14,
    backgroundColor: "#003366",
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  viewButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginRight: 8,
  },

  /* INFO */

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 15,
    marginTop: 10,
    flexDirection: "row",
  },

  infoIcon: {
    marginRight: 10,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#003366",
    marginBottom: 4,
  },

  infoText: {
    fontSize: 12,
    color: "#777",
    lineHeight: 18,
  },

  /* EMPTY */

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 25,
    alignItems: "center",
    marginBottom: 15,
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#EEEEEE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#333",
  },

  emptyText: {
    fontSize: 13,
    color: "#777",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 5,
  },
});
