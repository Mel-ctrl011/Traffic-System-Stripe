
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
} from "react-native-reanimated";

import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { sha256 } from "js-sha256";

import { useAuth } from "../context/AuthContext";

export default function DriverLicenseCard() {
  const [expanded, setExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [fingerprint, setFingerprint] = useState("");

  const { user } = useAuth();

  const license = user?.driverLicense;

  const fullName = user?.fullName || "Citizen";
  const idNumber = user?.idNumber || "Not available";
  const profilePhoto = user?.profilePhoto;

  const licenseNumber = license?.number || "Not available";
  const licenseStatus = license?.status || "UNKNOWN";
  const licenseClass = license?.class || "Not available";
  const issueDate = license?.issueDate || "Not available";
  const expiryDate = license?.expiryDate || "Not available";
  const cardNumber = license?.cardNumber || "Not available";

  const digitalLicense = user?.digitalLicense;

  const isValid =
    licenseStatus.toLowerCase() === "valid" ||
    licenseStatus.toLowerCase() === "active";

  const statusText = isValid
    ? "VALID"
    : licenseStatus.toUpperCase();

  // Escape values before inserting them into HTML.
  const escapeHtml = (value: unknown): string =>
    String(value ?? "Not available")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  // Generate a deterministic fingerprint of the licence data.
  // This is not an official issuer signature.
  const createRecordFingerprint = () => {
    const record = {
      fullName,
      idNumber,
      licenseNumber,
      licenseStatus,
      licenseClass,
      issueDate,
      expiryDate,
      cardNumber,
      profilePhoto: profilePhoto || "",
      qrToken: digitalLicense?.qrToken || "",
    };

    return sha256(JSON.stringify(record));
  };

  // Generate the downloadable PDF.
  const createLicencePdf = async () => {
    if (!user?.driverLicense) {
      Alert.alert(
        "Licence unavailable",
        "No driving licence record is available to export."
      );
      return null;
    }

    try {
      const recordFingerprint = createRecordFingerprint();

      const photoHtml = profilePhoto
        ? `<img class="photo" src="${escapeHtml(
            profilePhoto
          )}" />`
        : `<div class="photo-placeholder">PROFILE</div>`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport"
                content="width=device-width, initial-scale=1" />

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, sans-serif;
              color: #17212B;
              padding: 24px;
              font-size: 12px;
            }

            .header {
              background: #083B68;
              color: white;
              padding: 22px;
              border-radius: 10px;
            }

            .eyebrow {
              font-size: 10px;
              letter-spacing: 1px;
              font-weight: bold;
            }

            h1 {
              font-size: 23px;
              margin: 12px 0 8px;
            }

            .subtitle {
              font-size: 11px;
              line-height: 1.6;
            }

            .profile {
              display: flex;
              align-items: center;
              gap: 16px;
              margin: 24px 0;
            }

            .photo {
              width: 82px;
              height: 82px;
              object-fit: cover;
              border-radius: 8px;
            }

            .photo-placeholder {
              width: 82px;
              height: 82px;
              background: #EAF3FA;
              color: #083B68;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
              font-size: 10px;
            }

            h2 {
              font-size: 18px;
              margin: 7px 0;
            }

            .label {
              font-size: 9px;
              color: #66737F;
              font-weight: bold;
              letter-spacing: 0.5px;
              margin-bottom: 5px;
            }

            .value {
              font-size: 12px;
              overflow-wrap: anywhere;
            }

            .row {
              padding: 12px 0;
              border-bottom: 1px solid #D9E0E6;
            }

            .fingerprint {
              margin-top: 22px;
              padding: 14px;
              border: 1px solid #D9E0E6;
              background: #F3F5F7;
              border-radius: 8px;
            }

            .hash {
              margin-top: 8px;
              font-size: 9px;
              line-height: 1.7;
              overflow-wrap: anywhere;
              word-break: break-all;
            }

            .notice {
              margin-top: 22px;
              padding-top: 12px;
              border-top: 1px solid #D9E0E6;
              color: #66737F;
              font-size: 9px;
              line-height: 1.7;
            }

            .status {
              display: inline-block;
              margin-top: 8px;
              padding: 6px 9px;
              background: #EAF3FA;
              border-radius: 5px;
              font-weight: bold;
            }
          </style>
        </head>

        <body>
          <div class="header">
            <div class="eyebrow">
              TRAFFIC CONNECT SYSTEM
            </div>

            <h1>Digital Driver Licence Record</h1>

            <div class="subtitle">
              Personal licence record
            </div>

            <div class="status">
              STATUS: ${escapeHtml(statusText)}
            </div>
          </div>

          <div class="profile">
            ${photoHtml}

            <div>
              <div class="label">LICENCE HOLDER</div>
              <h2>${escapeHtml(fullName)}</h2>
              <div class="value">
                Licence No: ${escapeHtml(licenseNumber)}
              </div>
            </div>
          </div>

          <div class="row">
            <div class="label">IDENTITY NUMBER</div>
            <div class="value">${escapeHtml(idNumber)}</div>
          </div>

          <div class="row">
            <div class="label">DRIVING CODE</div>
            <div class="value">${escapeHtml(licenseClass)}</div>
          </div>

          <div class="row">
            <div class="label">ISSUE DATE</div>
            <div class="value">${escapeHtml(issueDate)}</div>
          </div>

          <div class="row">
            <div class="label">EXPIRY DATE</div>
            <div class="value">${escapeHtml(expiryDate)}</div>
          </div>

          <div class="row">
            <div class="label">CARD NUMBER</div>
            <div class="value">${escapeHtml(cardNumber)}</div>
          </div>

          <div class="row">
            <div class="label">VERIFICATION TOKEN</div>
            <div class="value">${escapeHtml(
              digitalLicense?.qrToken || "Not available"
            )}</div>
          </div>

          <div class="fingerprint">
            <div class="label">
              SHA-256 RECORD FINGERPRINT
            </div>

            <div class="hash">${recordFingerprint}</div>
          </div>

          <div class="notice">
            Exported from TrafficConnectSystem.

            This fingerprint identifies the licence data used
            to generate this document. It does not prove that
            the document was issued by a government authority
            or independently establish licence validity.

            Verify the record through a trusted verification
            service before relying on it.
          </div>
        </body>
        </html>
      `;

      const pdf = await Print.printToFileAsync({ html });

      setFingerprint(recordFingerprint);

      console.log("LICENCE_PDF_CREATED:", pdf.uri);
      console.log(
        "LICENCE_RECORD_SHA256:",
        recordFingerprint
      );

      return {
        uri: pdf.uri,
        fingerprint: recordFingerprint,
      };
    } catch (error) {
      console.error("LICENCE_PDF_ERROR:", error);

      Alert.alert(
        "PDF generation failed",
        "Could not create your licence PDF. Please try again."
      );

      return null;
    }
  };

  // Download/save PDF.
  const handleDownload = async () => {
    if (isExporting) return;

    setIsExporting(true);

    try {
      const result = await createLicencePdf();

      if (!result) return;

      if (Platform.OS === "android") {
        const permission =
          await FileSystem.StorageAccessFramework
            .requestDirectoryPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            "Save cancelled",
            "Choose a folder to save your PDF."
          );
          return;
        }

        const destination =
          await FileSystem.StorageAccessFramework
            .createFileAsync(
              permission.directoryUri,
              "TrafficConnect_Driver_Licence.pdf",
              "application/pdf"
            );

        const base64 = await FileSystem.readAsStringAsync(
          result.uri,
          {
            encoding: FileSystem.EncodingType.Base64,
          }
        );

        await FileSystem.writeAsStringAsync(
          destination,
          base64,
          {
            encoding: FileSystem.EncodingType.Base64,
          }
        );

        console.log("LICENCE_PDF_SAVED:", destination);

        Alert.alert(
          "Download complete",
          "Your licence PDF has been saved successfully."
        );
      } else {
        const available = await Sharing.isAvailableAsync();

        if (!available) {
          Alert.alert(
            "Export unavailable",
            "The system sharing menu is unavailable."
          );
          return;
        }

        await Sharing.shareAsync(result.uri, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
          dialogTitle: "Save your licence PDF",
        });
      }
    } catch (error) {
      console.error("LICENCE_DOWNLOAD_ERROR:", error);

      Alert.alert(
        "Download failed",
        "Could not save the PDF. Please try again."
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Share PDF using the phone's native share menu.
  const handleShare = async () => {
    if (isExporting) return;

    setIsExporting(true);

    try {
      const result = await createLicencePdf();

      if (!result) return;

      const available = await Sharing.isAvailableAsync();

      if (!available) {
        Alert.alert(
          "Sharing unavailable",
          "Sharing is not supported on this device."
        );
        return;
      }

      await Sharing.shareAsync(result.uri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
        dialogTitle: "Share your licence PDF",
      });

      console.log("LICENCE_PDF_SHARED_FROM:", result.uri);
    } catch (error) {
      console.error("LICENCE_SHARE_ERROR:", error);

      Alert.alert(
        "Sharing failed",
        "Could not share the licence PDF. Please try again."
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Animated.View
      layout={Layout.springify()}
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={styles.container}
    >
      {/* COLLAPSED SUMMARY */}

      <TouchableOpacity
        style={styles.summary}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.85}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryIcon}>
            <MaterialIcons
              name="badge"
              size={23}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.summaryInformation}>
            <View style={styles.titleRow}>
              <Text style={styles.summaryTitle}>
                Driver Licence
              </Text>

              <View
                style={[
                  styles.validBadge,
                  !isValid && styles.invalidBadge,
                ]}
              >
                <View
                  style={[
                    styles.validDot,
                    !isValid && styles.invalidDot,
                  ]}
                />

                <Text
                  style={[
                    styles.validText,
                    !isValid && styles.invalidText,
                  ]}
                >
                  {statusText}
                </Text>
              </View>
            </View>

            <Text style={styles.summarySubtitle}>
              {isValid
                ? `Valid • Expires ${expiryDate}`
                : `Status • ${statusText}`}
            </Text>

            <Text style={styles.summaryMeta}>
              Code {licenseClass} • {licenseNumber}
            </Text>
          </View>

          <View style={styles.expandButton}>
            <Ionicons
              name={
                expanded ? "chevron-up" : "chevron-down"
              }
              size={18}
              color={COLORS.primary}
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* EXPANDED DIGITAL LICENCE */}

      {expanded && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.licenceWrapper}
        >
          {/* HEADER */}

          <View style={styles.licenceHeader}>
            <View style={styles.govIcon}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={25}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.govInformation}>
              <Text style={styles.govCountry}>
                TRAFFIC CONNECT SYSTEM
              </Text>

              <Text style={styles.govDepartment}>
                DIGITAL LICENCE RECORD
              </Text>
            </View>

            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                DIGITAL
              </Text>
            </View>
          </View>

          {/* TITLE */}

          <View style={styles.licenceTitleSection}>
            <View>
              <Text style={styles.licenceEyebrow}>
                PERSONAL RECORD
              </Text>

              <Text style={styles.licenceTitle}>
                Driver Licence
              </Text>
            </View>

            <View
              style={[
                styles.statusLarge,
                !isValid && styles.invalidStatusLarge,
              ]}
            >
              <View
                style={[
                  styles.statusLargeDot,
                  !isValid && styles.invalidDot,
                ]}
              />

              <Text
                style={[
                  styles.statusLargeText,
                  !isValid && styles.invalidText,
                ]}
              >
                {statusText}
              </Text>
            </View>
          </View>

          {/* PROFILE */}

          <View style={styles.profileSection}>
            {profilePhoto ? (
              <Image
                source={{ uri: profilePhoto }}
                style={styles.photo}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoInitial}>
                  {fullName
                    .split(" ")
                    .map((name) => name.charAt(0))
                    .join("")
                    .substring(0, 2)
                    .toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.profileInformation}>
              <Text style={styles.profileLabel}>
                LICENCE HOLDER
              </Text>

              <Text style={styles.name}>
                {fullName}
              </Text>

              <Text style={styles.profileSecondary}>
                Driver profile record
              </Text>
            </View>
          </View>

          {/* LICENCE NUMBER */}

          <View style={styles.licenceNumberCard}>
            <View>
              <Text style={styles.detailLabel}>
                LICENCE NUMBER
              </Text>

              <Text style={styles.licenceNumber}>
                {licenseNumber}
              </Text>
            </View>

            <MaterialIcons
              name="verified"
              size={24}
              color={COLORS.primary}
            />
          </View>

          {/* LICENCE DETAILS */}

          <View style={styles.detailsSection}>
            <Text style={styles.sectionLabel}>
              LICENCE INFORMATION
            </Text>

            <View style={styles.detailsGrid}>
              <Detail
                label="ID NUMBER"
                value={idNumber}
              />

              <Detail
                label="DRIVING CODE"
                value={licenseClass}
              />

              <Detail
                label="ISSUE DATE"
                value={issueDate}
              />

              <Detail
                label="EXPIRY DATE"
                value={expiryDate}
                valueColor={
                  isValid ? COLORS.success : COLORS.danger
                }
              />

              <Detail
                label="CARD NUMBER"
                value={cardNumber}
              />

              <Detail
                label="STATUS"
                value={statusText}
                valueColor={
                  isValid ? COLORS.success : COLORS.danger
                }
              />
            </View>
          </View>

          {/* VERIFICATION */}

          <View style={styles.verificationSection}>
            <View style={styles.verificationHeader}>
              <View>
                <Text style={styles.sectionLabel}>
                  DIGITAL VERIFICATION
                </Text>

                <Text style={styles.verificationTitle}>
                  Verification token
                </Text>
              </View>

              <View style={styles.secureBadge}>
                <Ionicons
                  name="shield-checkmark"
                  size={14}
                  color={COLORS.success}
                />

                <Text style={styles.secureText}>
                  RECORD
                </Text>
              </View>
            </View>

            <View style={styles.qrContainer}>
              <View style={styles.qrBox}>
                <Ionicons
                  name="qr-code-outline"
                  size={70}
                  color={COLORS.primaryDark}
                />
              </View>

              <View style={styles.qrInformation}>
                <Text style={styles.qrTitle}>
                  Verification Code
                </Text>

                <Text style={styles.qrCode}>
                  {digitalLicense?.qrToken ||
                    "Verification unavailable"}
                </Text>

                <Text style={styles.qrDescription}>
                  This token is included in your exported
                  record. A trusted verification service is
                  required to independently verify it.
                </Text>
              </View>
            </View>
          </View>

          {/* DIGITAL FINGERPRINT */}

          {fingerprint ? (
            <TouchableOpacity
              style={styles.fingerprintCard}
              activeOpacity={0.8}
              onPress={() => {
                Alert.alert(
                  "SHA-256 record fingerprint",
                  fingerprint
                );
              }}
            >
              <View style={styles.fingerprintHeader}>
                <MaterialCommunityIcons
                  name="fingerprint"
                  size={24}
                  color={COLORS.primary}
                />

                <Text style={styles.sectionLabel}>
                  DIGITAL FINGERPRINT
                </Text>
              </View>

              <Text
                selectable
                style={styles.fingerprintText}
              >
                {fingerprint}
              </Text>

              <Text style={styles.fingerprintHint}>
                Tap to view the complete fingerprint.
                This identifies the record data, not the
                authenticity of the issuing authority.
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* STATUS NOTICE */}

          <View
            style={[
              styles.verificationNotice,
              !isValid && styles.invalidNotice,
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
                isValid ? COLORS.success : COLORS.danger
              }
            />

            <View style={styles.noticeInformation}>
              <Text
                style={[
                  styles.noticeTitle,
                  !isValid && styles.invalidText,
                ]}
              >
                {isValid
                  ? "Record marked active"
                  : "Record requires attention"}
              </Text>

              <Text style={styles.noticeDescription}>
                {isValid
                  ? "The stored licence status is active."
                  : "Check the stored licence status."}
              </Text>
            </View>

            <Text style={styles.noticeDate}>
              {digitalLicense?.lastGenerated
                ? formatDate(digitalLicense.lastGenerated)
                : ""}
            </Text>
          </View>

          {/* DOWNLOAD AND SHARE */}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                isExporting && styles.disabledButton,
              ]}
              activeOpacity={0.8}
              onPress={handleDownload}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.primary}
                />
              ) : (
                <Ionicons
                  name="download-outline"
                  size={19}
                  color={COLORS.primary}
                />
              )}

              <Text style={styles.secondaryButtonText}>
                {isExporting ? "Preparing..." : "Download PDF"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                isExporting && styles.disabledButton,
              ]}
              activeOpacity={0.8}
              onPress={handleShare}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Ionicons
                  name="share-social-outline"
                  size={19}
                  color="#FFFFFF"
                />
              )}

              <Text style={styles.primaryButtonText}>
                {isExporting ? "Preparing..." : "Share Licence"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* FOOTER */}

          <View style={styles.footer}>
            <Ionicons
              name="information-circle-outline"
              size={15}
              color={COLORS.textLight}
            />

            <Text style={styles.footerText}>
              This is a digital record linked to the
              registered profile. It is not, by itself,
              proof of official government issuance.
            </Text>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

// DETAIL COMPONENT

function Detail({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text
        selectable
        style={[
          styles.detailValue,
          valueColor ? { color: valueColor } : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// DATE FORMATTER

function formatDate(value: string) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// COLOURS

const COLORS = {
  primary: "#0B4F8A",
  primaryDark: "#083B68",
  background: "#F3F5F7",
  white: "#FFFFFF",
  text: "#17212B",
  textLight: "#66737F",
  border: "#D9E0E6",
  success: "#18794E",
  danger: "#B42318",
  softBlue: "#EAF3FA",
  softGreen: "#ECFDF3",
};

// STYLES

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },

  summary: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 13,
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 9,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryInformation: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },

  summaryTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  validBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.softGreen,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginLeft: 8,
  },

  invalidBadge: {
    backgroundColor: "#FEF3F2",
  },

  validDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 4,
  },

  invalidDot: {
    backgroundColor: COLORS.danger,
  },

  validText: {
    fontSize: 8,
    fontWeight: "900",
    color: COLORS.success,
  },

  invalidText: {
    color: COLORS.danger,
  },

  summarySubtitle: {
    marginTop: 4,
    fontSize: 10,
    color: COLORS.textLight,
  },

  summaryMeta: {
    marginTop: 3,
    fontSize: 9,
    color: "#87929C",
  },

  expandButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  licenceWrapper: {
    marginTop: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    overflow: "hidden",
  },

  licenceHeader: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  govIcon: {
    width: 39,
    height: 39,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  govInformation: {
    flex: 1,
  },

  govCountry: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  govDepartment: {
    marginTop: 3,
    color: "#C9D9E7",
    fontSize: 8,
    fontWeight: "600",
    letterSpacing: 0.4,
  },

  headerBadge: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  headerBadgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
  },

  licenceTitleSection: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  licenceEyebrow: {
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 0.7,
  },

  licenceTitle: {
    marginTop: 2,
    fontSize: 19,
    fontWeight: "900",
    color: COLORS.text,
  },

  statusLarge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.softGreen,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  invalidStatusLarge: {
    backgroundColor: "#FEF3F2",
  },

  statusLargeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 5,
  },

  statusLargeText: {
    fontSize: 8,
    fontWeight: "900",
    color: COLORS.success,
  },

  profileSection: {
    marginHorizontal: 15,
    padding: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  photo: {
    width: 68,
    height: 68,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.white,
  },

  photoPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  photoInitial: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "900",
  },

  profileInformation: {
    flex: 1,
    marginLeft: 12,
  },

  profileLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 0.6,
  },

  name: {
    marginTop: 3,
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.text,
  },

  profileSecondary: {
    marginTop: 3,
    fontSize: 9,
    color: COLORS.textLight,
  },

  licenceNumberCard: {
    marginHorizontal: 15,
    marginTop: 10,
    padding: 12,
    backgroundColor: COLORS.softBlue,
    borderWidth: 1,
    borderColor: "#C7DDED",
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  detailLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.textLight,
    letterSpacing: 0.5,
  },

  licenceNumber: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: COLORS.primaryDark,
  },

  detailsSection: {
    marginHorizontal: 15,
    marginTop: 16,
  },

  sectionLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: COLORS.primary,
  },

  detailsGrid: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: COLORS.border,
  },

  detail: {
    width: "50%",
    padding: 10,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },

  detailValue: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
  },

  verificationSection: {
    marginHorizontal: 15,
    marginTop: 16,
    padding: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
  },

  verificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  verificationTitle: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
  },

  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.softGreen,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },

  secureText: {
    marginLeft: 4,
    fontSize: 7,
    fontWeight: "900",
    color: COLORS.success,
  },

  qrContainer: {
    marginTop: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  qrBox: {
    width: 96,
    height: 96,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  qrInformation: {
    flex: 1,
    marginLeft: 12,
  },

  qrTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
  },

  qrCode: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.primary,
    letterSpacing: 0.5,
  },

  qrDescription: {
    marginTop: 6,
    fontSize: 9,
    lineHeight: 14,
    color: COLORS.textLight,
  },

  fingerprintCard: {
    marginHorizontal: 15,
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    borderRadius: 9,
  },

  fingerprintHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  fingerprintText: {
    marginTop: 8,
    fontSize: 10,
    lineHeight: 16,
    color: COLORS.primaryDark,
  },

  fingerprintHint: {
    marginTop: 8,
    fontSize: 9,
    lineHeight: 14,
    color: COLORS.textLight,
  },

  verificationNotice: {
    marginHorizontal: 15,
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#CFE8D9",
    backgroundColor: COLORS.softGreen,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  invalidNotice: {
    borderColor: "#F3C7C4",
    backgroundColor: "#FEF3F2",
  },

  noticeInformation: {
    flex: 1,
    marginLeft: 8,
  },

  noticeTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.success,
  },

  noticeDescription: {
    marginTop: 2,
    fontSize: 8,
    color: COLORS.textLight,
  },

  noticeDate: {
    fontSize: 8,
    color: COLORS.textLight,
  },

  actions: {
    flexDirection: "row",
    paddingHorizontal: 15,
    marginTop: 12,
  },

  secondaryButton: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginRight: 5,
    backgroundColor: COLORS.white,
  },

  secondaryButtonText: {
    marginLeft: 7,
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primary,
  },

  primaryButton: {
    flex: 1.35,
    minHeight: 42,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: 5,
    backgroundColor: COLORS.primary,
  },

  primaryButtonText: {
    marginLeft: 7,
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.white,
  },

  disabledButton: {
    opacity: 0.6,
  },

  footer: {
    paddingHorizontal: 15,
    paddingTop: 11,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  footerText: {
    flex: 1,
    marginLeft: 6,
    fontSize: 8,
    lineHeight: 13,
    color: COLORS.textLight,
  },
});
