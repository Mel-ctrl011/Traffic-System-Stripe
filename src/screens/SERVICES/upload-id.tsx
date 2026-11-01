
import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import { useNavigation } from "@react-navigation/native";

const COLORS = {
  primary: "#1D4ED8",
  primaryDark: "#1E3A8A",
  background: "#F5F7FA",
  text: "#172033",
  textSecondary: "#5F6B7A",
  border: "#DCE2EA",
  card: "#FFFFFF",
  success: "#15803D",
  successBackground: "#ECFDF3",
  warning: "#B45309",
  warningBackground: "#FFFBEB",
  danger: "#B91C1C",
  dangerBackground: "#FEF2F2",
  muted: "#EEF2F7",
};

const UploadIDScreen: React.FC = () => {
  const navigation = useNavigation();

  const [selectedFile, setSelectedFile] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);

  /* =====================================================
     PICK DOCUMENT
  ===================================================== */

  const handleUploadID = async (): Promise<void> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "image/jpeg",
          "image/png",
        ],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        return;
      }

      setSelectedFile(result.assets[0]);
    } catch (error) {
      console.error("ID upload error:", error);

      Alert.alert(
        "Unable to Select Document",
        "There was a problem selecting your identity document. Please try again."
      );
    }
  };

  /* =====================================================
     REMOVE DOCUMENT
  ===================================================== */

  const handleRemove = (): void => {
    Alert.alert(
      "Remove Document",
      "Are you sure you want to remove this identity document?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setSelectedFile(null);
          },
        },
      ]
    );
  };

  /* =====================================================
     CONTINUE
  ===================================================== */

  const handleContinue = (): void => {
    if (!selectedFile) {
      Alert.alert(
        "Identity Document Required",
        "Please upload your South African ID or valid passport before continuing."
      );

      return;
    }

    /*
      When navigation is ready:

      navigation.navigate("UploadDocuments" as never);
    */

    Alert.alert(
      "Document Ready",
      "Your identity document has been selected successfully."
    );
  };

  /* =====================================================
     FILE SIZE
  ===================================================== */

  const getFileSize = (size?: number): string => {
    if (size === undefined || size === null) {
      return "Size unavailable";
    }

    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  /* =====================================================
     FILE EXTENSION
  ===================================================== */

  const getFileExtension = (fileName: string): string => {
    const parts = fileName.split(".");

    if (parts.length < 2) {
      return "FILE";
    }

    return parts[parts.length - 1].toUpperCase();
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="shield-checkmark-outline"
              size={24}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.headerContent}>
            <Text style={styles.eyebrow}>
              IDENTITY VERIFICATION
            </Text>

            <Text style={styles.title}>
              Identity Document
            </Text>

            <Text style={styles.subtitle}>
              Submit a clear copy of your South African ID
              or valid passport to verify your identity.
            </Text>
          </View>
        </View>

        {/* =================================================
            APPLICATION STEP
        ================================================= */}

        <View style={styles.stepCard}>
          <View style={styles.stepLeft}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>

            <View>
              <Text style={styles.stepLabel}>
                Application requirement
              </Text>

              <Text style={styles.stepDescription}>
                Identity verification
              </Text>
            </View>
          </View>

          <View style={styles.requiredBadge}>
            <Text style={styles.requiredBadgeText}>
              REQUIRED
            </Text>
          </View>
        </View>

        {/* =================================================
            REQUIREMENTS
        ================================================= */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Document Requirements
          </Text>

          <Text style={styles.sectionDescription}>
            Please make sure the document meets the
            following requirements before submitting it.
          </Text>

          <View style={styles.requirementList}>
            <View style={styles.requirementRow}>
              <View style={styles.checkIcon}>
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={COLORS.success}
                />
              </View>

              <Text style={styles.requirementText}>
                Clear and readable document
              </Text>
            </View>

            <View style={styles.requirementRow}>
              <View style={styles.checkIcon}>
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={COLORS.success}
                />
              </View>

              <Text style={styles.requirementText}>
                All personal details must be visible
              </Text>
            </View>

            <View style={styles.requirementRow}>
              <View style={styles.checkIcon}>
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={COLORS.success}
                />
              </View>

              <Text style={styles.requirementText}>
                Accepted formats: PDF, JPG or PNG
              </Text>
            </View>

            <View style={styles.requirementRow}>
              <View style={styles.checkIcon}>
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={COLORS.success}
                />
              </View>

              <Text style={styles.requirementText}>
                Document must belong to the applicant
              </Text>
            </View>
          </View>
        </View>

        {/* =================================================
            IMPORTANT NOTICE
        ================================================= */}

        <View style={styles.noticeCard}>
          <View style={styles.noticeIcon}>
            <Ionicons
              name="information"
              size={17}
              color={COLORS.warning}
            />
          </View>

          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>
              Important
            </Text>

            <Text style={styles.noticeText}>
              Do not upload an expired, damaged or
              unreadable identity document. Your application
              may be delayed if the document cannot be verified.
            </Text>
          </View>
        </View>

        {/* =================================================
            UPLOAD SECTION
        ================================================= */}

        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>
              Identity Document
            </Text>

            <Text style={styles.requiredLabel}>
              Required
            </Text>
          </View>
        </View>

        {!selectedFile ? (
          <TouchableOpacity
            style={styles.uploadCard}
            onPress={handleUploadID}
            activeOpacity={0.85}
          >
            <View style={styles.uploadIcon}>
              <Ionicons
                name="cloud-upload-outline"
                size={30}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.uploadTitle}>
              Select Identity Document
            </Text>

            <Text style={styles.uploadDescription}>
              Choose an ID copy or valid passport from
              your device.
            </Text>

            <View style={styles.selectButton}>
              <Ionicons
                name="document-outline"
                size={17}
                color="#FFFFFF"
              />

              <Text style={styles.selectButtonText}>
                Select Document
              </Text>
            </View>

            <Text style={styles.uploadFormats}>
              PDF • JPG • PNG
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.fileCard}>
            {/* FILE HEADER */}

            <View style={styles.fileHeader}>
              <View style={styles.fileIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={24}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.fileInformation}>
                <Text
                  style={styles.fileName}
                  numberOfLines={2}
                >
                  {selectedFile.name}
                </Text>

                <Text style={styles.fileMeta}>
                  {getFileExtension(selectedFile.name)} •{" "}
                  {getFileSize(selectedFile.size)}
                </Text>
              </View>

              <View style={styles.successIcon}>
                <Ionicons
                  name="checkmark"
                  size={17}
                  color={COLORS.success}
                />
              </View>
            </View>

            {/* STATUS */}

            <View style={styles.uploadedStatus}>
              <Ionicons
                name="checkmark-circle"
                size={17}
                color={COLORS.success}
              />

              <Text style={styles.uploadedStatusText}>
                Document selected successfully
              </Text>
            </View>

            {/* ACTIONS */}

            <View style={styles.fileActions}>
              <TouchableOpacity
                style={styles.replaceButton}
                onPress={handleUploadID}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="refresh-outline"
                  size={16}
                  color={COLORS.primary}
                />

                <Text style={styles.replaceButtonText}>
                  Replace
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.removeButton}
                onPress={handleRemove}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={COLORS.danger}
                />

                <Text style={styles.removeButtonText}>
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* =================================================
            SECURITY
        ================================================= */}

        <View style={styles.securityCard}>
          <View style={styles.securityIcon}>
            <Ionicons
              name="lock-closed-outline"
              size={19}
              color={COLORS.success}
            />
          </View>

          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>
              Your document is protected
            </Text>

            <Text style={styles.securityText}>
              Your identity document will only be used for
              verification and processing of your application.
            </Text>
          </View>
        </View>

        {/* =================================================
            CONTINUE
        ================================================= */}

        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedFile &&
              styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>
            Continue
          </Text>

          <Ionicons
            name="arrow-forward"
            size={19}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        {/* =================================================
            FOOTER
        ================================================= */}

        <Text style={styles.footerText}>
          By continuing, you confirm that the identity
          document belongs to the applicant.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 45,
  },

  /* HEADER */

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 22,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#E8F0FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  headerContent: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.primary,
    marginBottom: 3,
  },

  title: {
    fontSize: 25,
    fontWeight: "800",
    color: COLORS.text,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    marginTop: 5,
  },

  /* STEP */

  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 13,
    marginBottom: 24,
  },

  stepLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  stepNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  stepLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  stepDescription: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 2,
  },

  requiredBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  requiredBadgeText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  /* SECTIONS */

  section: {
    marginBottom: 22,
  },

  sectionHeaderRow: {
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
  },

  sectionDescription: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 13,
  },

  requiredLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.danger,
    marginTop: 3,
  },

  /* REQUIREMENTS */

  requirementList: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },

  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  checkIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.successBackground,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  requirementText: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.text,
  },

  /* NOTICE */

  noticeCard: {
    flexDirection: "row",
    backgroundColor: COLORS.warningBackground,
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    padding: 13,
    marginBottom: 24,
  },

  noticeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  noticeContent: {
    flex: 1,
  },

  noticeTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.warning,
    marginBottom: 3,
  },

  noticeText: {
    fontSize: 11.5,
    lineHeight: 17,
    color: "#6B7280",
  },

  /* UPLOAD */

  uploadCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: "#9DB7ED",
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 25,
    paddingHorizontal: 18,
    alignItems: "center",
  },

  uploadIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#E8F0FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  uploadTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },

  uploadDescription: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 5,
    marginBottom: 17,
    maxWidth: 270,
  },

  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: COLORS.primary,
    borderRadius: 9,
    paddingHorizontal: 19,
    paddingVertical: 11,
  },

  selectButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  uploadFormats: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  /* FILE */

  fileCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
  },

  fileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  fileIcon: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: "#E8F0FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  fileInformation: {
    flex: 1,
  },

  fileName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    lineHeight: 18,
  },

  fileMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  successIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.successBackground,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  uploadedStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.successBackground,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginTop: 13,
  },

  uploadedStatusText: {
    color: COLORS.success,
    fontSize: 11.5,
    fontWeight: "700",
    marginLeft: 6,
  },

  fileActions: {
    flexDirection: "row",
    marginTop: 11,
    gap: 8,
  },

  replaceButton: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  replaceButtonText: {
    color: COLORS.primary,
    fontSize: 12.5,
    fontWeight: "700",
  },

  removeButton: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    backgroundColor: COLORS.dangerBackground,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  removeButtonText: {
    color: COLORS.danger,
    fontSize: 12.5,
    fontWeight: "700",
  },

  /* SECURITY */

  securityCard: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 13,
    marginTop: 20,
  },

  securityIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.successBackground,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  securityContent: {
    flex: 1,
  },

  securityTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 3,
  },

  securityText: {
    fontSize: 11.5,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },

  /* CONTINUE */

  continueButton: {
    height: 52,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },

  continueButtonDisabled: {
    opacity: 0.45,
  },

  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  /* FOOTER */

  footerText: {
    textAlign: "center",
    fontSize: 10.5,
    lineHeight: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
    paddingHorizontal: 15,
  },
});

export default UploadIDScreen;

