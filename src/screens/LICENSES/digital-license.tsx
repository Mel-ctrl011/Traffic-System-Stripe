
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as ScreenOrientation from "expo-screen-orientation";
import * as MediaLibrary from "expo-media-library";
import { captureRef } from "react-native-view-shot";
import { useNavigation } from "@react-navigation/native";

import { useAuth } from "../../context/AuthContext";

export default function DigitalLicenseScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const licenseCardRef = useRef<View>(null);

  const { width, height } = useWindowDimensions();
  const isSmallLandscape = width > height && height < 450;

  const [downloading, setDownloading] = useState(false);

  /*
   * =========================================================
   * FORCE LANDSCAPE
   * =========================================================
   */

  useEffect(() => {
    const enableLandscape = async () => {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE
        );
      } catch (error) {
        console.log("Could not lock landscape:", error);
      }
    };

    enableLandscape();

    return () => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT
      ).catch((error) => {
        console.log("Could not restore portrait:", error);
      });
    };
  }, []);

  /*
   * =========================================================
   * DOWNLOAD THE COMPLETE LICENCE CARD
   * =========================================================
   */

  const downloadLicense = async () => {
    if (!licenseCardRef.current || downloading) {
      return;
    }

    try {
      setDownloading(true);

      // Capture the entire licence card as a PNG image.
      const imageUri = await captureRef(licenseCardRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      // Request gallery permission.
      const permission =
        await MediaLibrary.requestPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Please allow photo access so your digital licence can be saved to your gallery."
        );
        return;
      }

      // Save the complete image to the device gallery.
      await MediaLibrary.saveToLibraryAsync(imageUri);

      Alert.alert(
        "Licence downloaded",
        "Your digital licence has been saved to your phone's gallery."
      );
    } catch (error) {
      console.error("Digital licence download failed:", error);

      Alert.alert(
        "Download failed",
        "We could not save your digital licence. Please try again."
      );
    } finally {
      setDownloading(false);
    }
  };

  /*
   * =========================================================
   * USER LOADING
   * =========================================================
   */

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar hidden />

        <MaterialIcons
          name="credit-card"
          size={45}
          color="#003366"
        />

        <Text style={styles.loadingText}>
          Loading digital licence...
        </Text>
      </View>
    );
  }

  /*
   * =========================================================
   * LICENCE DATA
   * =========================================================
   */

  const fullName = user.fullName ?? "";

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((x) => x[0])
      .join("")
      .toUpperCase() || "--";

  const licenseNumber =
    user.driverLicense?.number ?? "N/A";

  const licenseCategory =
    user.driverLicense?.class ?? "N/A";

  const issueDate =
    user.driverLicense?.issueDate ?? "N/A";

  const expiryDate =
    user.driverLicense?.expiryDate ?? "N/A";

  const status =
    user.driverLicense?.status ?? "Unknown";

  const documentNumber =
    user.idNumber ?? "N/A";

  const gender =
    user.gender ?? "N/A";

  const birthDate =
    user.birthDate ?? "N/A";

  /*
   * =========================================================
   * QR INFORMATION
   * =========================================================
   */

  const qrValue = JSON.stringify({
    fullName,
    initials,
    licenseNumber,
    licenseCategory,
    expiryDate,
    status,
  });

  /*
   * =========================================================
   * SCREEN
   * =========================================================
   */

  return (
    <View
      style={[
        styles.screen,
        isSmallLandscape && styles.landscapeScreen,
      ]}
    >
      <StatusBar hidden />

      {/* BACK BUTTON */}

      <TouchableOpacity
        style={[
          styles.backButton,
          isSmallLandscape && styles.backButtonCompact,
        ]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Ionicons
          name="arrow-back"
          size={22}
          color="#FFFFFF"
        />

        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {/* =====================================================
          COMPLETE LICENCE CARD
          This entire view is captured for downloading.
      ===================================================== */}

      <View
        ref={licenseCardRef}
        collapsable={false}
        style={[
          styles.licenseCard,
          isSmallLandscape && styles.licenseCardCompact,
        ]}
      >
        {/* HEADER */}

        <View
          style={[
            styles.header,
            isSmallLandscape && styles.headerCompact,
          ]}
        >
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.govIcon,
                isSmallLandscape && styles.govIconCompact,
              ]}
            >
              <MaterialIcons
                name="account-balance"
                size={28}
                color="#FFFFFF"
              />
            </View>

            <View>
              <Text style={styles.department}>
                DEPARTMENT OF TRANSPORT
              </Text>

              <Text style={styles.country}>
                REPUBLIC OF SOUTH AFRICA
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <Ionicons
              name="shield-checkmark"
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.digitalText}>
              DIGITAL DRIVER'S LICENCE
            </Text>
          </View>
        </View>

        {/* MAIN CONTENT */}

        <View
          style={[
            styles.mainContent,
            isSmallLandscape && styles.mainContentCompact,
          ]}
        >
          {/* PROFILE */}

          <View
            style={[
              styles.profileSection,
              isSmallLandscape && styles.profileSectionCompact,
            ]}
          >
            <View
              style={[
                styles.photo,
                isSmallLandscape && styles.photoCompact,
              ]}
            >
              <MaterialIcons
                name="person"
                size={isSmallLandscape ? 48 : 65}
                color="#003366"
              />
            </View>

            <Text style={styles.initials}>
              {initials}
            </Text>

            <Text
              style={styles.fullName}
              numberOfLines={2}
              adjustsFontSizeToFit
            >
              {fullName || "Not Available"}
            </Text>

            <View
              style={[
                styles.statusBadge,
                status.toLowerCase() === "valid"
                  ? styles.valid
                  : styles.invalid,
                isSmallLandscape && styles.statusBadgeCompact,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  status.toLowerCase() === "valid"
                    ? styles.validDot
                    : styles.invalidDot,
                ]}
              />

              <Text
                style={[
                  styles.statusText,
                  status.toLowerCase() === "valid"
                    ? styles.validText
                    : styles.invalidText,
                ]}
              >
                {status.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* DETAILS */}

          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>
              DRIVER INFORMATION
            </Text>

            <View style={styles.detailsGrid}>
              <Info
                label="Licence Number"
                value={licenseNumber}
              />

              <Info
                label="Category"
                value={licenseCategory}
              />

              <Info
                label="ID / Document Number"
                value={documentNumber}
              />

              <Info
                label="Gender"
                value={gender}
              />

              <Info
                label="Date of Birth"
                value={birthDate}
              />

              <Info
                label="Issue Date"
                value={issueDate}
              />

              <Info
                label="Expiry Date"
                value={expiryDate}
              />
            </View>
          </View>

          {/* QR CODE */}

          <View
            style={[
              styles.qrSection,
              isSmallLandscape && styles.qrSectionCompact,
            ]}
          >
            <View
              style={[
                styles.qrContainer,
                isSmallLandscape && styles.qrContainerCompact,
              ]}
            >
              <QRCode
                value={qrValue}
                size={isSmallLandscape ? 92 : 125}
                backgroundColor="#FFFFFF"
                color="#111111"
              />
            </View>

            <View style={styles.verifyRow}>
              <Ionicons
                name="shield-checkmark"
                size={16}
                color="#2E7D32"
              />

              <Text style={styles.verifyText}>
                VERIFIED
              </Text>
            </View>

            <Text style={styles.scanText}>
              Scan to verify
            </Text>
          </View>
        </View>

        {/* FOOTER */}

        <View
          style={[
            styles.footer,
            isSmallLandscape && styles.footerCompact,
          ]}
        >
          <View style={styles.footerLeft}>
            <MaterialIcons
              name="verified-user"
              size={17}
              color="#003366"
            />

            <Text style={styles.footerText}>
              Government-issued digital credential
            </Text>
          </View>

          <Text
            style={styles.footerLicense}
            numberOfLines={1}
          >
            Licence No. {licenseNumber}
          </Text>

          <Text style={styles.footerCountry}>
            SOUTH AFRICA
          </Text>
        </View>
      </View>

      {/* =====================================================
          DOWNLOAD BUTTON
      ===================================================== */}

      <TouchableOpacity
        style={[
          styles.downloadButton,
          isSmallLandscape && styles.downloadButtonCompact,
          downloading && styles.downloadButtonDisabled,
        ]}
        onPress={downloadLicense}
        disabled={downloading}
        activeOpacity={0.85}
      >
        {downloading ? (
          <ActivityIndicator
            size="small"
            color="#FFFFFF"
          />
        ) : (
          <MaterialIcons
            name="file-download"
            size={22}
            color="#FFFFFF"
          />
        )}

        <Text style={styles.downloadButtonText}>
          {downloading
            ? "Downloading..."
            : "Download Licence"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/*
 * =========================================================
 * INFORMATION COMPONENT
 * =========================================================
 */

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text
        style={styles.infoValue}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles = StyleSheet.create({
  /*
   * SCREEN
   */

  screen: {
    flex: 1,
    backgroundColor: "#111820",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },

  landscapeScreen: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  /*
   * BACK
   */

  backButton: {
    position: "absolute",
    top: 15,
    left: 18,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },

  backButtonCompact: {
    top: 4,
    left: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  backText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 5,
  },

  /*
   * LICENCE CARD
   */

  licenseCard: {
    width: "100%",
    maxWidth: 900,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },

  licenseCardCompact: {
    maxWidth: 900,
    borderRadius: 12,
  },

  /*
   * HEADER
   */

  header: {
    minHeight: 68,
    backgroundColor: "#003366",
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerCompact: {
    minHeight: 48,
    paddingHorizontal: 12,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  govIcon: {
    width: 43,
    height: 43,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  govIconCompact: {
    width: 34,
    height: 34,
    borderRadius: 8,
    marginRight: 8,
  },

  department: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  country: {
    color: "#C9D8E8",
    fontSize: 9,
    marginTop: 3,
    letterSpacing: 0.8,
  },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  digitalText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 6,
    letterSpacing: 0.5,
  },

  /*
   * MAIN CONTENT
   */

  mainContent: {
    minHeight: 235,
    flexDirection: "row",
    paddingHorizontal: 22,
    paddingVertical: 18,
  },

  mainContentCompact: {
    minHeight: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  /*
   * PROFILE
   */

  profileSection: {
    width: "24%",
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    paddingRight: 18,
  },

  profileSectionCompact: {
    paddingRight: 8,
  },

  photo: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: "#E8F1FB",
    borderWidth: 1,
    borderColor: "#D4E1ED",
    justifyContent: "center",
    alignItems: "center",
  },

  photoCompact: {
    width: 58,
    height: 58,
    borderRadius: 9,
  },

  initials: {
    color: "#777",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 5,
  },

  fullName: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 4,
  },

  /*
   * STATUS
   */

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 9,
  },

  statusBadgeCompact: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginTop: 5,
  },

  valid: {
    backgroundColor: "#E8F5E9",
  },

  invalid: {
    backgroundColor: "#FFF3E0",
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },

  validDot: {
    backgroundColor: "#2E7D32",
  },

  invalidDot: {
    backgroundColor: "#E65100",
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },

  validText: {
    color: "#2E7D32",
  },

  invalidText: {
    color: "#E65100",
  },

  /*
   * DETAILS
   */

  detailsSection: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    justifyContent: "center",
  },

  sectionTitle: {
    color: "#7A8794",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 13,
  },

  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  infoItem: {
    width: "50%",
    marginBottom: 14,
    paddingRight: 8,
  },

  infoLabel: {
    color: "#7A8794",
    fontSize: 9,
    textTransform: "uppercase",
    marginBottom: 3,
  },

  infoValue: {
    color: "#17202A",
    fontSize: 13,
    fontWeight: "800",
  },

  /*
   * QR CODE
   */

  qrSection: {
    width: "19%",
    minWidth: 130,
    borderLeftWidth: 1,
    borderLeftColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 15,
  },

  qrSectionCompact: {
    width: 105,
    minWidth: 105,
    paddingLeft: 8,
  },

  qrContainer: {
    padding: 7,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E5E9",
    borderRadius: 8,
  },

  qrContainerCompact: {
    padding: 4,
    borderRadius: 6,
  },

  verifyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  verifyText: {
    color: "#2E7D32",
    fontSize: 9,
    fontWeight: "800",
    marginLeft: 4,
  },

  scanText: {
    color: "#777",
    fontSize: 9,
    marginTop: 3,
  },

  /*
   * FOOTER
   */

  footer: {
    minHeight: 42,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  footerCompact: {
    minHeight: 30,
    paddingHorizontal: 10,
  },

  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  footerText: {
    color: "#68727D",
    fontSize: 9,
    marginLeft: 6,
  },

  footerLicense: {
    color: "#68727D",
    fontSize: 9,
    fontWeight: "700",
  },

  footerCountry: {
    color: "#003366",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },

  /*
   * DOWNLOAD BUTTON
   */

  downloadButton: {
    width: "100%",
    maxWidth: 900,
    minHeight: 46,
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: "#003366",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 4,
  },

  downloadButtonCompact: {
    minHeight: 36,
    marginTop: 5,
    paddingVertical: 5,
    borderRadius: 9,
  },

  downloadButtonDisabled: {
    opacity: 0.7,
  },

  downloadButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 8,
  },

  /*
   * LOADING
   */

  loadingContainer: {
    flex: 1,
    backgroundColor: "#111820",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#FFFFFF",
    marginTop: 12,
    fontSize: 15,
    fontWeight: "600",
  },
});
