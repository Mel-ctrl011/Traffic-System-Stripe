
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

export default function VehicleRegistrationFeesScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const vehicles = user?.vehicles ?? [];

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
            name="receipt-long"
            size={28}
            color="#003366"
          />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.title}>
            Vehicle Registration Fees
          </Text>

          <Text style={styles.subtitle}>
            View registration information and manage fees
            associated with your registered vehicles.
          </Text>
        </View>
      </View>

      {/* OVERVIEW */}
      <View style={styles.overviewCard}>
        <View style={styles.overviewIcon}>
          <MaterialIcons
            name="directions-car"
            size={25}
            color="#003366"
          />
        </View>

        <View style={styles.overviewContent}>
          <Text style={styles.overviewLabel}>
            Registered Vehicles
          </Text>

          <Text style={styles.overviewValue}>
            {vehicles.length}
          </Text>

          <Text style={styles.overviewDescription}>
            Vehicle registration information linked to your
            citizen profile.
          </Text>
        </View>
      </View>

      {/* PAYMENT INFORMATION */}
      <SectionHeader
        title="Registration Payment"
        subtitle="Your registration fee information"
      />

      <View style={styles.paymentCard}>
        <View style={styles.paymentTop}>
          <View style={styles.paymentIcon}>
            <MaterialIcons
              name="payments"
              size={24}
              color="#003366"
            />
          </View>

          <View style={styles.paymentContent}>
            <Text style={styles.paymentTitle}>
              Registration Fees
            </Text>

            <Text style={styles.paymentDescription}>
              Registration fee amounts will appear here when
              payment information is available for your
              vehicles.
            </Text>
          </View>
        </View>

        <View style={styles.paymentStatus}>
          <Ionicons
            name="information-circle-outline"
            size={19}
            color="#003366"
          />

          <Text style={styles.paymentStatusText}>
            No registration balance is currently available.
          </Text>
        </View>
      </View>

      {/* VEHICLES */}
      <SectionHeader
        title="Your Vehicles"
        subtitle="Select a vehicle to review its registration details"
      />

      {vehicles.length === 0 ? (
        <EmptyState />
      ) : (
        vehicles.map((vehicle, index) => (
          <VehicleRegistrationCard
            key={vehicle.vehicleId || index}
            vehicle={vehicle}
            onPress={() =>
              navigation.navigate("VehicleInformation")
            }
          />
        ))
      )}

      {/* HOW IT WORKS */}
      <SectionHeader
        title="How Registration Fees Work"
        subtitle="Important information"
      />

      <View style={styles.infoCard}>
        <InfoItem
          number="1"
          title="Select your vehicle"
          description="Choose the vehicle you want to manage from your registered vehicles."
        />

        <InfoItem
          number="2"
          title="Review the details"
          description="Check the vehicle registration and licence information before making a payment."
        />

        <InfoItem
          number="3"
          title="Make your payment"
          description="When a registration balance is available, you will be able to proceed with payment securely."
        />

        <InfoItem
          number="4"
          title="Keep your receipt"
          description="Your payment confirmation and receipt can be accessed from your payment history."
        />
      </View>

      {/* PAYMENT HISTORY */}
      <TouchableOpacity
        style={styles.historyButton}
        activeOpacity={0.8}
        onPress={() => navigation.navigate("PaymentHistory")}
      >
        <MaterialIcons
          name="history"
          size={21}
          color="#FFFFFF"
        />

        <Text style={styles.historyButtonText}>
          View Payment History
        </Text>

        <Ionicons
          name="arrow-forward"
          size={18}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </ScrollView>
  );
}

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      <Text style={styles.sectionSubtitle}>
        {subtitle}
      </Text>
    </View>
  );
}

/* =========================================================
   VEHICLE REGISTRATION CARD
========================================================= */

function VehicleRegistrationCard({
  vehicle,
  onPress,
}: {
  vehicle: any;
  onPress: () => void;
}) {
  const registrationNumber =
    vehicle?.registrationNumber || "Not available";

  const make = vehicle?.make || "Unknown";
  const model = vehicle?.model || "Vehicle";

  const registrationStatus =
    vehicle?.verified === true
      ? "Verified"
      : "Registered";

  return (
    <View style={styles.vehicleCard}>
      {/* HEADER */}
      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleIcon}>
          <MaterialIcons
            name="directions-car"
            size={25}
            color="#003366"
          />
        </View>

        <View style={styles.vehicleHeaderContent}>
          <Text style={styles.vehicleName}>
            {make} {model}
          </Text>

          <Text style={styles.registrationNumber}>
            {registrationNumber}
          </Text>
        </View>

        <View style={styles.registeredBadge}>
          <Text style={styles.registeredBadgeText}>
            {registrationStatus}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* DETAILS */}
      <DetailRow
        icon="confirmation-number"
        label="Vehicle ID"
        value={vehicle?.vehicleId || "Not available"}
      />

      <DetailRow
        icon="calendar-today"
        label="Year"
        value={
          vehicle?.year
            ? String(vehicle.year)
            : "Not available"
        }
      />

      <DetailRow
        icon="palette"
        label="Colour"
        value={vehicle?.colour || "Not available"}
      />

      <DetailRow
        icon="verified"
        label="Ownership"
        value={
          vehicle?.ownership?.owner
            ? "Registered Owner"
            : "Not confirmed"
        }
      />

      <DetailRow
        icon="receipt-long"
        label="Licence Disk"
        value={
          vehicle?.licenceDisk?.number ||
          "Not available"
        }
      />

      <DetailRow
        icon="event"
        label="Licence Expiry"
        value={
          vehicle?.licenceDisk?.expiryDate ||
          "Not available"
        }
      />

      {/* PAYMENT */}
      <View style={styles.vehiclePaymentBox}>
        <MaterialIcons
          name="payments"
          size={20}
          color="#003366"
        />

        <View style={styles.vehiclePaymentContent}>
          <Text style={styles.vehiclePaymentTitle}>
            Registration Fee
          </Text>

          <Text style={styles.vehiclePaymentValue}>
            Amount unavailable
          </Text>

          <Text style={styles.vehiclePaymentDescription}>
            No registration fee has been provided for this
            vehicle yet.
          </Text>
        </View>
      </View>

      {/* BUTTON */}
      <TouchableOpacity
        style={styles.detailsButton}
        activeOpacity={0.8}
        onPress={onPress}
      >
        <Text style={styles.detailsButtonText}>
          View Vehicle Details
        </Text>

        <Ionicons
          name="chevron-forward"
          size={18}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </View>
  );
}

/* =========================================================
   DETAIL ROW
========================================================= */

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <MaterialIcons
        name={icon}
        size={18}
        color="#777"
      />

      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoNumber}>
        <Text style={styles.infoNumberText}>
          {number}
        </Text>
      </View>

      <View style={styles.infoItemContent}>
        <Text style={styles.infoItemTitle}>
          {title}
        </Text>

        <Text style={styles.infoItemDescription}>
          {description}
        </Text>
      </View>
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
        No Vehicles Found
      </Text>

      <Text style={styles.emptyText}>
        There are currently no vehicles linked to your
        citizen profile.
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
    marginBottom: 22,
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

  headerContent: {
    flex: 1,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#003366",
  },

  subtitle: {
    fontSize: 13,
    color: "#666",
    lineHeight: 19,
    marginTop: 4,
  },

  /* OVERVIEW */

  overviewCard: {
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

  overviewIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: "#E7EEF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  overviewContent: {
    flex: 1,
  },

  overviewLabel: {
    fontSize: 13,
    color: "#777",
    fontWeight: "600",
  },

  overviewValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#003366",
    marginTop: 2,
  },

  overviewDescription: {
    fontSize: 12,
    color: "#777",
    lineHeight: 18,
    marginTop: 3,
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

  /* PAYMENT */

  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 16,
    marginBottom: 25,
  },

  paymentTop: {
    flexDirection: "row",
  },

  paymentIcon: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: "#E7EEF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  paymentContent: {
    flex: 1,
  },

  paymentTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#222",
  },

  paymentDescription: {
    fontSize: 12,
    color: "#777",
    lineHeight: 18,
    marginTop: 4,
  },

  paymentStatus: {
    marginTop: 14,
    backgroundColor: "#F4F7FA",
    borderRadius: 10,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
  },

  paymentStatusText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: "#666",
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

  vehicleHeaderContent: {
    flex: 1,
  },

  vehicleName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#222",
  },

  registrationNumber: {
    fontSize: 13,
    color: "#777",
    marginTop: 3,
  },

  registeredBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  registeredBadgeText: {
    color: "#2E7D32",
    fontSize: 10,
    fontWeight: "800",
  },

  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 14,
  },

  /* DETAILS */

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
  },

  detailLabel: {
    marginLeft: 8,
    fontSize: 13,
    color: "#777",
  },

  detailValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
  },

  /* VEHICLE PAYMENT */

  vehiclePaymentBox: {
    marginTop: 12,
    backgroundColor: "#F4F7FA",
    borderRadius: 11,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  vehiclePaymentContent: {
    flex: 1,
    marginLeft: 9,
  },

  vehiclePaymentTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#003366",
  },

  vehiclePaymentValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#555",
    marginTop: 2,
  },

  vehiclePaymentDescription: {
    fontSize: 11,
    color: "#777",
    lineHeight: 16,
    marginTop: 2,
  },

  /* BUTTON */

  detailsButton: {
    marginTop: 14,
    backgroundColor: "#003366",
    borderRadius: 11,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  detailsButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginRight: 7,
  },

  /* INFO */

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },

  infoItem: {
    flexDirection: "row",
    marginBottom: 17,
  },

  infoItemContent: {
    flex: 1,
    marginLeft: 11,
  },

  infoNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E7EEF5",
    alignItems: "center",
    justifyContent: "center",
  },

  infoNumberText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#003366",
  },

  infoItemTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#333",
  },

  infoItemDescription: {
    fontSize: 12,
    color: "#777",
    lineHeight: 18,
    marginTop: 3,
  },

  /* HISTORY */

  historyButton: {
    backgroundColor: "#003366",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
  },

  historyButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
    marginHorizontal: 8,
  },

  /* EMPTY */

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 25,
    alignItems: "center",
    marginBottom: 20,
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
