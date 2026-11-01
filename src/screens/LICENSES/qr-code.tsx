
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { useAuth } from "../../context/AuthContext";

export default function QRCodeScreen() {
  const { user } = useAuth();

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialCommunityIcons
          name="qrcode-scan"
          size={45}
          color="#003366"
        />

        <Text style={styles.loadingTitle}>Loading License</Text>

        <Text style={styles.loadingText}>
          Preparing your driver's license verification code...
        </Text>
      </View>
    );
  }

  const initials =
    user.fullName
      ?.split(" ")
      .filter(Boolean)
      .map((x) => x[0])
      .join("")
      .toUpperCase() ?? "";

  const qrData = {
    fullName: user.fullName ?? "",
    initials,
    idNumber: user.idNumber ?? "",
    licenseNumber: user.driverLicense?.number ?? "",
    licenseCategory: user.driverLicense?.class ?? "",
    issueDate: user.driverLicense?.issueDate ?? "",
    expiryDate: user.driverLicense?.expiryDate ?? "",
    status: user.driverLicense?.status ?? "Unknown",
    gender: user.gender ?? "",
    birthDate: user.birthDate ?? "",
    qrToken: user.digitalLicense?.qrToken ?? "",
  };

  const qrValue = JSON.stringify(qrData);

  const isValid =
    user.driverLicense?.status?.toLowerCase() === "valid";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons
            name="shield-check"
            size={25}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerSmall}>
            DEPARTMENT OF TRANSPORT
          </Text>

          <Text style={styles.headerTitle}>
            License Verification
          </Text>
        </View>
      </View>

      {/* =====================================================
          INTRO
      ===================================================== */}

      <View style={styles.intro}>
        <Text style={styles.pageTitle}>
          Driver License QR Code
        </Text>

        <Text style={styles.pageSubtitle}>
          Present this QR code to an authorised traffic officer
          for secure verification of your driver's license.
        </Text>
      </View>

      {/* =====================================================
          QR CARD
      ===================================================== */}

      <View style={styles.qrCard}>
        <View style={styles.qrHeader}>
          <View>
            <Text style={styles.qrHeaderTitle}>
              DIGITAL VERIFICATION
            </Text>

            <Text style={styles.qrHeaderSubtitle}>
              Official license verification code
            </Text>
          </View>

          <View style={styles.verifiedIcon}>
            <Ionicons
              name="shield-checkmark"
              size={22}
              color="#2E7D32"
            />
          </View>
        </View>

        <View style={styles.qrWrapper}>
          <QRCode
            value={qrValue}
            size={220}
            backgroundColor="#FFFFFF"
            color="#111111"
          />
        </View>

        <View style={styles.scanIndicator}>
          <MaterialCommunityIcons
            name="qrcode-scan"
            size={18}
            color="#003366"
          />

          <Text style={styles.scanText}>
            Scan to verify license information
          </Text>
        </View>
      </View>

      {/* =====================================================
          LICENSE STATUS
      ===================================================== */}

      <View style={styles.statusCard}>
        <View style={styles.statusIcon}>
          <Ionicons
            name={isValid ? "checkmark-circle" : "alert-circle"}
            size={27}
            color={isValid ? "#2E7D32" : "#E65100"}
          />
        </View>

        <View style={styles.statusContent}>
          <Text style={styles.statusLabel}>
            LICENSE STATUS
          </Text>

          <Text
            style={[
              styles.statusValue,
              {
                color: isValid ? "#2E7D32" : "#E65100",
              },
            ]}
          >
            {user.driverLicense?.status?.toUpperCase() ??
              "UNKNOWN"}
          </Text>
        </View>
      </View>

      {/* =====================================================
          LICENSE INFORMATION
      ===================================================== */}

      <Text style={styles.sectionTitle}>
        License Information
      </Text>

      <View style={styles.infoCard}>
        <InfoRow
          icon="person-outline"
          label="License Holder"
          value={user.fullName ?? "Not Available"}
        />

        <InfoRow
          icon="card-outline"
          label="License Number"
          value={user.driverLicense?.number ?? "Not Available"}
          highlight
        />

        <InfoRow
          icon="car-outline"
          label="License Category"
          value={user.driverLicense?.class ?? "Not Available"}
        />

        <InfoRow
          icon="calendar-outline"
          label="Issue Date"
          value={user.driverLicense?.issueDate ?? "Not Available"}
        />

        <InfoRow
          icon="calendar-number-outline"
          label="Expiry Date"
          value={user.driverLicense?.expiryDate ?? "Not Available"}
          last
        />
      </View>

      {/* =====================================================
          VERIFICATION TOKEN
      ===================================================== */}

      <Text style={styles.sectionTitle}>
        Verification Security
      </Text>

      <View style={styles.securityCard}>
        <View style={styles.securityIcon}>
          <MaterialCommunityIcons
            name="shield-lock-outline"
            size={25}
            color="#003366"
          />
        </View>

        <View style={styles.securityContent}>
          <Text style={styles.securityTitle}>
            Secure Verification
          </Text>

          <Text style={styles.securityText}>
            This QR code contains your digital license
            verification information. Only authorised
            personnel should scan this code.
          </Text>
        </View>
      </View>

      {/* =====================================================
          QR TOKEN
      ===================================================== */}

      {user.digitalLicense?.qrToken ? (
        <View style={styles.tokenCard}>
          <Text style={styles.tokenLabel}>
            VERIFICATION TOKEN
          </Text>

          <Text style={styles.tokenValue}>
            {user.digitalLicense.qrToken}
          </Text>
        </View>
      ) : null}

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <View style={styles.footer}>
        <MaterialCommunityIcons
          name="shield-check"
          size={20}
          color="#003366"
        />

        <Text style={styles.footerText}>
          Verified digital document • Republic of South Africa
        </Text>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

/* =========================================================
   INFO ROW
========================================================= */

function InfoRow({
  icon,
  label,
  value,
  highlight,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  highlight?: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        !last && styles.infoRowBorder,
      ]}
    >
      <View style={styles.infoIcon}>
        <Ionicons
          name={icon}
          size={20}
          color="#003366"
        />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>
          {label}
        </Text>

        <Text
          style={[
            styles.infoValue,
            highlight && styles.highlightValue,
          ]}
        >
          {value}
        </Text>
      </View>
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
  },

  /* ================= HEADER ================= */

  header: {
    backgroundColor: "#003366",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  headerTextContainer: {
    flex: 1,
  },

  headerSmall: {
    color: "#BFD4E8",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 3,
  },

  /* ================= INTRO ================= */

  intro: {
    marginBottom: 18,
  },

  pageTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: "#003366",
  },

  pageSubtitle: {
    marginTop: 6,
    color: "#666",
    fontSize: 14,
    lineHeight: 21,
  },

  /* ================= QR CARD ================= */

  qrCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  qrHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  qrHeaderTitle: {
    color: "#003366",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  qrHeaderSubtitle: {
    color: "#888",
    fontSize: 12,
    marginTop: 3,
  },

  verifiedIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },

  qrWrapper: {
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  scanIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },

  scanText: {
    color: "#003366",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 7,
  },

  /* ================= STATUS ================= */

  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  statusIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: "#F1F8F3",
    justifyContent: "center",
    alignItems: "center",
  },

  statusContent: {
    marginLeft: 12,
  },

  statusLabel: {
    color: "#888",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },

  statusValue: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 3,
  },

  /* ================= SECTIONS ================= */

  sectionTitle: {
    color: "#003366",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
  },

  /* ================= INFORMATION ================= */

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 15,
    marginBottom: 24,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },

  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: "#EEF4F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    color: "#888",
    fontSize: 11,
    fontWeight: "600",
  },

  infoValue: {
    color: "#222",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 3,
  },

  highlightValue: {
    color: "#003366",
    fontSize: 16,
  },

  /* ================= SECURITY ================= */

  securityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    marginBottom: 14,
  },

  securityIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: "#EEF4F9",
    alignItems: "center",
    justifyContent: "center",
  },

  securityContent: {
    flex: 1,
    marginLeft: 12,
  },

  securityTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#222",
  },

  securityText: {
    color: "#666",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },

  /* ================= TOKEN ================= */

  tokenCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 15,
    marginBottom: 22,
  },

  tokenLabel: {
    color: "#888",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  tokenValue: {
    color: "#003366",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 5,
    letterSpacing: 0.5,
  },

  /* ================= FOOTER ================= */

  footer: {
    alignItems: "center",
    paddingTop: 5,
  },

  footerText: {
    color: "#888",
    fontSize: 11,
    marginTop: 6,
    textAlign: "center",
  },

  /* ================= LOADING ================= */

  loadingContainer: {
    flex: 1,
    backgroundColor: "#F4F6F8",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  loadingTitle: {
    color: "#003366",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 15,
  },

  loadingText: {
    color: "#777",
    textAlign: "center",
    fontSize: 14,
    marginTop: 7,
    lineHeight: 20,
  },
});
