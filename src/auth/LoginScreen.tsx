
import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { verifyLogin } from "../services/authService";
import { getDeviceInfo } from "../utils/device";

/* =========================================================
   COLOURS
========================================================= */

const COLORS = {
  primary: "#0B4F8A",
  primaryDark: "#083B68",

  background: "#F3F5F7",
  card: "#FFFFFF",

  text: "#17212B",
  textLight: "#66737F",

  border: "#D9E0E6",

  success: "#18794E",
  warning: "#A16207",
  danger: "#B42318",

  softBlue: "#EAF3FA",
  softGreen: "#ECFDF3",
  softYellow: "#FFF8E6",
  softRed: "#FEF3F2",
};

/* =========================================================
   SCREEN
========================================================= */

export default function LoginScreen({
  navigation,
  setIsLoggedIn,
}: any) {
  const [idNumber, setIdNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  /* =======================================================
     LOGIN
  ======================================================= */

  const handleLogin = async () => {
    if (!idNumber.trim()) {
      setMessage("Please enter your ID Number");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // 📱 Get device information
      const device = await getDeviceInfo();

      // 🔐 Verify login against Firebase
      const result = await verifyLogin(
        idNumber.trim(),
        device
      );

      if (result.success) {
        await AsyncStorage.setItem(
          "userId",
          idNumber.trim()
        );

        setIsLoggedIn(true);
      } else {
        setMessage(
          result.message ||
            "Unable to sign in. Please check your details."
        );
      }
    } catch (error: any) {
      console.log("Login error:", error);
      setMessage(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     SCREEN
  ======================================================= */

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            styles.container
          }
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons
                name="shield-checkmark-outline"
                size={31}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.eyebrow}>
              TRAFFICCONNECT SA
            </Text>

            <Text style={styles.title}>
              Welcome Back
            </Text>

            <Text style={styles.subtitle}>
              Sign in to access your traffic department
              services, licences, vehicles and payments.
            </Text>
          </View>

          {/* =================================================
              LOGIN CARD
          ================================================= */}

          <View style={styles.loginCard}>
            {/* CARD HEADER */}

            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Ionicons
                  name="person-outline"
                  size={21}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.cardHeaderInformation}>
                <Text style={styles.cardTitle}>
                  Citizen Login
                </Text>

                <Text style={styles.cardDescription}>
                  Enter your South African ID number
                  to continue.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* =================================================
                ID NUMBER
            ================================================= */}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                ID NUMBER
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="card-outline"
                  size={20}
                  color={COLORS.textLight}
                />

                <TextInput
                  placeholder="South African ID Number"
                  placeholderTextColor="#8A949D"
                  value={idNumber}
                  onChangeText={(value) => {
                    setIdNumber(value);
                    if (message) {
                      setMessage("");
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={13}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>

              <Text style={styles.inputHint}>
                Enter your 13-digit South African ID
                number.
              </Text>
            </View>

            {/* =================================================
                ERROR MESSAGE
            ================================================= */}

            {message !== "" && (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={COLORS.danger}
                />

                <Text style={styles.errorText}>
                  {message}
                </Text>
              </View>
            )}

            {/* =================================================
                LOGIN BUTTON
            ================================================= */}

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
              style={[
                styles.loginButton,
                loading &&
                  styles.loginButtonDisabled,
              ]}
            >
              {loading ? (
                <>
                  <ActivityIndicator
                    color="#FFFFFF"
                    size="small"
                  />

                  <Text style={styles.loginButtonText}>
                    Signing in...
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.loginButtonText}>
                    Login
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color="#FFFFFF"
                  />
                </>
              )}
            </TouchableOpacity>

            {/* =================================================
                BIOMETRIC
            ================================================= */}

            <TouchableOpacity
              onPress={() =>
                console.log(
                  "Biometric login"
                )
              }
              activeOpacity={0.8}
              style={styles.biometricButton}
            >
              <View
                style={
                  styles.biometricIcon
                }
              >
                <Ionicons
                  name="finger-print-outline"
                  size={21}
                  color={COLORS.primary}
                />
              </View>

              <View
                style={
                  styles.biometricInformation
                }
              >
                <Text
                  style={
                    styles.biometricTitle
                  }
                >
                  Use Fingerprint / Face ID
                </Text>

                <Text
                  style={
                    styles.biometricDescription
                  }
                >
                  Quick and secure sign in
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.textLight}
              />
            </TouchableOpacity>
          </View>

          {/* =================================================
              ACCOUNT ACTIONS
          ================================================= */}

          <View style={styles.accountActions}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate(
                  "ForgotPassword"
                )
              }
              activeOpacity={0.7}
            >
              <Text
                style={
                  styles.forgotPassword
                }
              >
                Forgot password?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                navigation.navigate("Signup")
              }
              activeOpacity={0.7}
              style={styles.activateButton}
            >
              <Text
                style={
                  styles.activateText
                }
              >
                Activate Account
              </Text>

              <Ionicons
                name="arrow-forward"
                size={14}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>

          {/* =================================================
              SECURITY NOTICE
          ================================================= */}

          <View style={styles.securityNotice}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={COLORS.primary}
            />

            <Text style={styles.securityText}>
              Your account is protected using secure
              device verification. Only your registered
              device can access your citizen account.
            </Text>
          </View>

          {/* =================================================
              FOOTER
          ================================================= */}

          <Text style={styles.footer}>
            TrafficConnect SA
          </Text>

          <Text style={styles.footerSubtext}>
            Secure Citizen Services
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =======================================================
     SAFE AREA
  ======================================================= */

  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboard: {
    flex: 1,
  },

  container: {
    paddingHorizontal: 18,
    paddingTop: 50,
    paddingBottom: 65,
  },

  /* =======================================================
     HEADER
  ======================================================= */

  header: {
    alignItems: "center",
    marginBottom: 25,
  },

  logoContainer: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  eyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.primary,
  },

  title: {
    marginTop: 3,
    fontSize: 25,
    fontWeight: "800",
    color: COLORS.text,
  },

  subtitle: {
    marginTop: 6,
    maxWidth: 330,
    color: COLORS.textLight,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },

  /* =======================================================
     LOGIN CARD
  ======================================================= */

  loginCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  cardHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 9,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  cardHeaderInformation: {
    flex: 1,
    marginLeft: 10,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },

  cardDescription: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.textLight,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 15,
  },

  /* =======================================================
     INPUT
  ======================================================= */

  inputGroup: {
    marginBottom: 15,
  },

  inputLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: COLORS.textLight,
    marginBottom: 6,
  },

  inputContainer: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFBFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    paddingHorizontal: 12,
  },

  input: {
    flex: 1,
    marginLeft: 9,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
    paddingVertical: 0,
  },

  inputHint: {
    marginTop: 5,
    fontSize: 9,
    color: COLORS.textLight,
  },

  /* =======================================================
     ERROR
  ======================================================= */

  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.softRed,
    borderWidth: 1,
    borderColor: "#F3C7C3",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },

  errorText: {
    flex: 1,
    marginLeft: 7,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.danger,
  },

  /* =======================================================
     LOGIN BUTTON
  ======================================================= */

  loginButton: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 9,
    marginBottom: 10,
  },

  loginButtonDisabled: {
    opacity: 0.7,
  },

  loginButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    marginRight: 8,
  },

  /* =======================================================
     BIOMETRIC
  ======================================================= */

  biometricButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 9,
    padding: 10,
  },

  biometricIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  biometricInformation: {
    flex: 1,
    marginLeft: 9,
    marginRight: 7,
  },

  biometricTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary,
  },

  biometricDescription: {
    marginTop: 2,
    fontSize: 9,
    color: COLORS.textLight,
  },

  /* =======================================================
     ACCOUNT ACTIONS
  ======================================================= */

  accountActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 17,
    paddingHorizontal: 2,
  },

  forgotPassword: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textLight,
  },

  activateButton: {
    flexDirection: "row",
    alignItems: "center",
  },

  activateText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary,
    marginRight: 4,
  },

  /* =======================================================
     SECURITY NOTICE
  ======================================================= */

  securityNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.softBlue,
    borderWidth: 1,
    borderColor: "#C7DDED",
    borderRadius: 9,
    padding: 11,
    marginTop: 20,
  },

  securityText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 9,
    lineHeight: 15,
    color: COLORS.text,
  },

  /* =======================================================
     FOOTER
  ======================================================= */

  footer: {
    marginTop: 25,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primary,
  },

  footerSubtext: {
    marginTop: 2,
    textAlign: "center",
    fontSize: 9,
    color: COLORS.textLight,
  },
});
