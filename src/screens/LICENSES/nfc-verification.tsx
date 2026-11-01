
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";

export default function NFCVerificationScreen() {
  const { user } = useAuth();

  if (!user) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <MaterialIcons name="nfc" size={50} color="#003366" />

        <Text style={styles.loadingTitle}>
          Loading Digital Licence
        </Text>

        <Text style={styles.loadingText}>
          Preparing your licence verification information...
        </Text>
      </SafeAreaView>
    );
  }

  const license = {
    fullName: user.fullName ?? "Not Available",

    initials:
      user.fullName
        ?.split(" ")
        .filter(Boolean)
        .map((name) => name.charAt(0))
        .join("")
        .toUpperCase() ?? "",

    licenseNumber:
      user.driverLicense?.number ?? "Not Available",

    category:
      user.driverLicense?.class ?? "Not Available",

    expiryDate:
      user.driverLicense?.expiryDate ?? "Not Available",

    issueDate:
      user.driverLicense?.issueDate ?? "Not Available",

    status:
      user.driverLicense?.status ?? "Unknown",

    idNumber:
      user.idNumber ?? "Not Available",

    gender:
      user.gender ?? "Not Available",

    birthDate:
      user.birthDate ?? "Not Available",

    qrToken:
      user.digitalLicense?.qrToken ?? "Not Available",
  };

  const isValid =
    license.status.toLowerCase() === "valid";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MaterialIcons
              name="account-balance"
              size={24}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.department}>
              DEPARTMENT OF TRANSPORT
            </Text>

            <Text style={styles.headerTitle}>
              Digital Licence
            </Text>
          </View>
        </View>

        {/* PAGE INTRO */}
        <View style={styles.intro}>
          <Text style={styles.pageTitle}>
            NFC Verification
          </Text>

          <Text style={styles.pageSubtitle}>
            Securely verify your digital driver's licence
            using an authorized NFC reader.
          </Text>
        </View>

        {/* NFC STATUS CARD */}
        <View style={styles.nfcCard}>

          <View style={styles.nfcCircleOuter}>
            <View style={styles.nfcCircleMiddle}>
              <View style={styles.nfcCircleInner}>
                <MaterialIcons
                  name="nfc"
                  size={58}
                  color="#003366"
                />
              </View>
            </View>
          </View>

          <Text style={styles.nfcTitle}>
            Ready for Verification
          </Text>

          <Text style={styles.nfcDescription}>
            Hold your phone near an authorized traffic
            officer's NFC reader to begin verification.
          </Text>

          <View style={styles.readyBadge}>
            <View style={styles.readyDot} />

            <Text style={styles.readyText}>
              NFC READY
            </Text>
          </View>

        </View>

        {/* LICENCE HOLDER */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Licence Holder
          </Text>
        </View>

        <View style={styles.profileCard}>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {license.initials || "?"}
            </Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {license.fullName}
            </Text>

            <Text style={styles.profileLicence}>
              Licence No. {license.licenseNumber}
            </Text>

            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                CATEGORY {license.category}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isValid
                  ? "#E8F5E9"
                  : "#FFEBEE",
              },
            ]}
          >
            <Ionicons
              name={
                isValid
                  ? "checkmark-circle"
                  : "alert-circle"
              }
              size={18}
              color={
                isValid
                  ? "#2E7D32"
                  : "#C62828"
              }
            />

            <Text
              style={[
                styles.statusText,
                {
                  color: isValid
                    ? "#2E7D32"
                    : "#C62828",
                },
              ]}
            >
              {license.status.toUpperCase()}
            </Text>
          </View>

        </View>

        {/* LICENCE INFORMATION */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Licence Information
          </Text>
        </View>

        <View style={styles.infoCard}>

          <InfoRow
            icon="badge"
            label="ID Number"
            value={license.idNumber}
          />

          <InfoRow
            icon="person"
            label="Gender"
            value={license.gender}
          />

          <InfoRow
            icon="cake"
            label="Date of Birth"
            value={license.birthDate}
          />

          <InfoRow
            icon="event"
            label="Issue Date"
            value={license.issueDate}
          />

          <InfoRow
            icon="event-available"
            label="Expiry Date"
            value={license.expiryDate}
            last
          />

        </View>

        {/* VERIFICATION TOKEN */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Verification Security
          </Text>
        </View>

        <View style={styles.securityCard}>

          <View style={styles.securityIcon}>
            <MaterialIcons
              name="verified-user"
              size={25}
              color="#003366"
            />
          </View>

          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>
              Digital Verification Token
            </Text>

            <Text style={styles.securityToken}>
              {license.qrToken}
            </Text>

            <Text style={styles.securityDescription}>
              This token is associated with your digital
              driver's licence and is used during
              authorized verification.
            </Text>
          </View>

        </View>

        {/* VERIFY BUTTON */}
        <TouchableOpacity
          style={styles.verifyButton}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="nfc"
            size={25}
            color="#FFFFFF"
          />

          <Text style={styles.verifyButtonText}>
            Hold Near NFC Reader
          </Text>

          <Ionicons
            name="chevron-forward"
            size={22}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        {/* SECURITY NOTICE */}
        <View style={styles.noticeCard}>

          <View style={styles.noticeIcon}>
            <MaterialIcons
              name="security"
              size={24}
              color="#2E7D32"
            />
          </View>

          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>
              Secure Verification
            </Text>

            <Text style={styles.noticeText}>
              Your licence information is intended for
              authorized verification only. Personal
              information should only be accessed when
              a legitimate NFC verification request is
              received.
            </Text>
          </View>

        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <MaterialIcons
            name="verified"
            size={18}
            color="#2E7D32"
          />

          <Text style={styles.footerText}>
            Digital licence issued by the Department
            of Transport
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   INFO ROW
========================================================= */

function InfoRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
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
        <MaterialIcons
          name={icon}
          size={21}
          color="#003366"
        />
      </View>

      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>
          {label}
        </Text>

        <Text style={styles.infoValue}>
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
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: "#F4F6F8",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  loadingTitle: {
    marginTop: 15,
    fontSize: 20,
    fontWeight: "700",
    color: "#003366",
  },

  loadingText: {
    marginTop: 8,
    textAlign: "center",
    color: "#777",
    fontSize: 14,
  },

  /* HEADER */

  header: {
    backgroundColor: "#003366",
    marginHorizontal: -16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  headerText: {
    marginLeft: 12,
  },

  department: {
    color: "#BFD8EE",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },

  /* INTRO */

  intro: {
    paddingTop: 24,
    paddingBottom: 18,
  },

  pageTitle: {
    fontSize: 27,
    fontWeight: "800",
    color: "#111827",
  },

  pageSubtitle: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 21,
  },

  /* NFC */

  nfcCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 3,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  nfcCircleOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#EAF2F9",
    justifyContent: "center",
    alignItems: "center",
  },

  nfcCircleMiddle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#DCEAF6",
    justifyContent: "center",
    alignItems: "center",
  },

  nfcCircleInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },

  nfcTitle: {
    marginTop: 18,
    fontSize: 21,
    fontWeight: "800",
    color: "#2E7D32",
  },

  nfcDescription: {
    marginTop: 8,
    textAlign: "center",
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 320,
  },

  readyBadge: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
  },

  readyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2E7D32",
    marginRight: 7,
  },

  readyText: {
    color: "#2E7D32",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  /* SECTION */

  sectionHeader: {
    marginTop: 24,
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  /* PROFILE */

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#E8F1FB",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "#003366",
    fontSize: 20,
    fontWeight: "800",
  },

  profileInfo: {
    flex: 1,
    marginLeft: 13,
  },

  profileName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  profileLicence: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 4,
  },

  categoryBadge: {
    alignSelf: "flex-start",
    marginTop: 7,
    backgroundColor: "#EEF4F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  categoryText: {
    color: "#003366",
    fontSize: 10,
    fontWeight: "800",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: 8,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 4,
  },

  /* INFO */

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    elevation: 2,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },

  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F2",
  },

  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EEF4F9",
    justifyContent: "center",
    alignItems: "center",
  },

  infoText: {
    flex: 1,
    marginLeft: 12,
  },

  infoLabel: {
    fontSize: 11,
    color: "#8A8F98",
    fontWeight: "600",
  },

  infoValue: {
    marginTop: 3,
    fontSize: 14,
    color: "#111827",
    fontWeight: "700",
  },

  /* SECURITY */

  securityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    elevation: 2,
  },

  securityIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#EEF4F9",
    justifyContent: "center",
    alignItems: "center",
  },

  securityContent: {
    flex: 1,
    marginLeft: 12,
  },

  securityTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  securityToken: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#003366",
  },

  securityDescription: {
    marginTop: 7,
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 18,
  },

  /* BUTTON */

  verifyButton: {
    marginTop: 20,
    backgroundColor: "#003366",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
  },

  verifyButtonText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 10,
  },

  /* NOTICE */

  noticeCard: {
    marginTop: 14,
    backgroundColor: "#F1F8F3",
    borderRadius: 14,
    padding: 15,
    flexDirection: "row",
  },

  noticeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  noticeContent: {
    flex: 1,
    marginLeft: 11,
  },

  noticeTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#245B2A",
  },

  noticeText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: "#55705A",
  },

  /* FOOTER */

  footer: {
    marginTop: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 20,
  },

  footerText: {
    marginLeft: 6,
    color: "#777",
    fontSize: 11,
    textAlign: "center",
  },
});
