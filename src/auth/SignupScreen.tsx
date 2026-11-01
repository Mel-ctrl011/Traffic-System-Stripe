import React, { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Linking,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import FaceVerificationScanner from "../components/FaceVerificationScanner";
import { getDeviceInfo } from "../utils/device";
import { verifyUser } from "../services/authService";

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

type MessageType = "success" | "error" | "info" | "";

export default function VerifyAccountScreen({
  navigation,
}: any) {
  // =========================================================
  // STATE
  // =========================================================

  const [idNumber, setIdNumber] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<MessageType>("");

  const [idVerified, setIdVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] =
    useState(false);

  const [faceVerified, setFaceVerified] =
    useState(false);

  const [faceModalVisible, setFaceModalVisible] =
    useState(false);

  const shakeAnim = useRef(
    new Animated.Value(0)
  ).current;

  // =========================================================
  // MESSAGE
  // =========================================================

  const showMessage = (
    text: string,
    type: "success" | "error" | "info"
  ) => {
    setMessage(text);
    setMessageType(type);
  };

  // =========================================================
  // SHAKE ANIMATION
  // =========================================================

  const shake = () => {
    shakeAnim.setValue(0);

    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 1,
        duration: 60,
        useNativeDriver: true,
      }),

      Animated.timing(shakeAnim, {
        toValue: -1,
        duration: 60,
        useNativeDriver: true,
      }),

      Animated.timing(shakeAnim, {
        toValue: 1,
        duration: 60,
        useNativeDriver: true,
      }),

      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    if (messageType === "error") {
      shake();
    }
  }, [message, messageType]);

  const shakeStyle = {
    transform: [
      {
        translateX: shakeAnim.interpolate({
          inputRange: [-1, 1],
          outputRange: [-8, 8],
        }),
      },
    ],
  };

  // =========================================================
  // VERIFY ID + PHONE
  // =========================================================

  const handleVerify = async () => {
    const cleanId = idNumber.trim();
    const cleanPhone = phone.trim();

    // -----------------------------------------
    // BASIC VALIDATION
    // -----------------------------------------

    if (!cleanId || !cleanPhone) {
      showMessage(
        "Please enter your ID number and phone number.",
        "error"
      );
      return;
    }

    // South African ID = exactly 13 digits
    if (!/^\d{13}$/.test(cleanId)) {
      showMessage(
        "Your South African ID number must contain exactly 13 digits.",
        "error"
      );
      return;
    }

    if (cleanPhone.length < 9) {
      showMessage(
        "Please enter a valid registered phone number.",
        "error"
      );
      return;
    }

    // -----------------------------------------
    // START VERIFICATION
    // -----------------------------------------

    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      console.log("=================================");
      console.log("🔐 STARTING ACCOUNT VERIFICATION");
      console.log("=================================");

      const device = await getDeviceInfo();

      console.log(
        "📱 DEVICE INFORMATION RECEIVED"
      );

      const result = await verifyUser(
        cleanId,
        cleanPhone,
        device
      );

      console.log(
        "🔎 VERIFY USER RESULT:",
        result
      );

      // -----------------------------------------
      // SUCCESS
      // -----------------------------------------

      if (result.success) {
        setIdVerified(true);
        setPhoneVerified(true);

        showMessage(
          result.message ||
            "Your ID number and registered phone number have been verified.",
          "success"
        );

        console.log(
          "✅ ID + PHONE VERIFICATION SUCCESSFUL"
        );
      }

      // -----------------------------------------
      // FAILED
      // -----------------------------------------

      else {
        setIdVerified(false);
        setPhoneVerified(false);
        setFaceVerified(false);

        showMessage(
          result.message ||
            "We could not verify your account.",
          "error"
        );

        console.log(
          "❌ ID + PHONE VERIFICATION FAILED"
        );
      }
    } catch (error: any) {
      console.log(
        "❌ Verification error:",
        error
      );

      setIdVerified(false);
      setPhoneVerified(false);
      setFaceVerified(false);

      showMessage(
        error?.message ||
          "Something went wrong while verifying your account. Please try again.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // FACE VERIFICATION
  // =========================================================

  const handleFaceVerification = () => {
    if (!idVerified || !phoneVerified) {
      showMessage(
        "Please verify your ID and registered phone number first.",
        "error"
      );

      return;
    }

    setMessage("");
    setMessageType("");

    setFaceModalVisible(true);
  };

  // =========================================================
  // FACE VERIFICATION SUCCESS
  // =========================================================

  const handleFaceSuccess = (
    imageUri?: string
  ) => {
    console.log(
      "================================="
    );

    console.log(
      "✅ FACE VERIFICATION SUCCESSFUL"
    );

    if (imageUri) {
      console.log(
        "📸 FACE IMAGE:",
        imageUri
      );
    }

    console.log(
      "================================="
    );

    setFaceModalVisible(false);
    setFaceVerified(true);

    showMessage(
      "Your face has been successfully verified.",
      "success"
    );
  };

  // =========================================================
  // FACE VERIFICATION CANCEL
  // =========================================================

  const handleFaceCancel = () => {
    console.log(
      "ℹ️ FACE VERIFICATION CANCELLED"
    );

    setFaceModalVisible(false);
  };

  // =========================================================
  // ALL VERIFIED
  // =========================================================

  const allVerified =
    idVerified &&
    phoneVerified &&
    faceVerified;

  // =========================================================
  // COMPLETE VERIFICATION
  // =========================================================

  const handleContinue = () => {
    if (!allVerified) {
      showMessage(
        "Please complete all three verification steps.",
        "error"
      );

      return;
    }

    console.log(
      "================================="
    );

    console.log(
      "✅ ACCOUNT FULLY VERIFIED"
    );

    console.log(
      "================================="
    );

    navigation.replace("Login");
  };

  // =========================================================
  // SUPPORT
  // =========================================================

  const handleSupport = async () => {
    const supportNumber = "27760000000";

    const supportMessage =
      "Hi, I need help with account verification.";

    const url =
      `https://wa.me/${supportNumber}` +
      `?text=${encodeURIComponent(
        supportMessage
      )}`;

    try {
      const supported =
        await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        showMessage(
          "WhatsApp is not available on this device.",
          "error"
        );
      }
    } catch (error) {
      console.log(
        "WhatsApp error:",
        error
      );

      showMessage(
        "Unable to open WhatsApp.",
        "error"
      );
    }
  };

  // =========================================================
  // MESSAGE COLOR
  // =========================================================

  const getMessageColor = () => {
    if (messageType === "success") {
      return COLORS.success;
    }

    if (messageType === "error") {
      return COLORS.danger;
    }

    return COLORS.primary;
  };

  // =========================================================
  // STEP COMPONENT
  // =========================================================

  const renderStep = (
    number: number,
    title: string,
    description: string,
    verified: boolean,
    required: boolean,
    disabled: boolean = false
  ) => {
    return (
      <View
        style={[
          styles.stepRow,
          disabled && styles.stepDisabled,
        ]}
      >
        {/* STEP NUMBER */}
        <View
          style={[
            styles.stepCircle,
            verified &&
              styles.stepCircleVerified,
            disabled &&
              styles.stepCircleDisabled,
          ]}
        >
          {verified ? (
            <Ionicons
              name="checkmark"
              size={17}
              color="#FFFFFF"
            />
          ) : (
            <Text
              style={[
                styles.stepNumber,
                disabled &&
                  styles.stepNumberDisabled,
              ]}
            >
              {number}
            </Text>
          )}
        </View>

        {/* STEP INFORMATION */}
        <View style={styles.stepInformation}>
          <View style={styles.stepTitleRow}>
            <Text
              style={[
                styles.stepTitle,
                disabled &&
                  styles.stepTitleDisabled,
              ]}
            >
              {title}
            </Text>

            {/* VERIFIED */}
            {verified && (
              <View
                style={
                  styles.verifiedBadge
                }
              >
                <Text
                  style={
                    styles.verifiedBadgeText
                  }
                >
                  VERIFIED
                </Text>
              </View>
            )}

            {/* REQUIRED */}
            {!verified &&
              required &&
              !disabled && (
                <View
                  style={
                    styles.requiredBadge
                  }
                >
                  <Text
                    style={
                      styles.requiredText
                    }
                  >
                    REQUIRED
                  </Text>
                </View>
              )}
          </View>

          <Text
            style={[
              styles.stepDescription,
              disabled &&
                styles.stepDescriptionDisabled,
            ]}
          >
            {description}
          </Text>
        </View>
      </View>
    );
  };

  // =========================================================
  // SCREEN
  // =========================================================

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
          {/* =====================================================
              HEADER
          ===================================================== */}

          <View style={styles.header}>
            <View
              style={styles.logoContainer}
            >
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
              Verify Your Account
            </Text>

            <Text style={styles.subtitle}>
              Complete three security checks
              to link your government record
              and activate your citizen
              account.
            </Text>
          </View>

          {/* =====================================================
              VERIFICATION CARD
          ===================================================== */}

          <Animated.View
            style={[
              styles.verifyCard,
              messageType === "error" &&
                shakeStyle,
            ]}
          >
            {/* CARD HEADER */}

            <View style={styles.cardHeader}>
              <View
                style={
                  styles.cardHeaderIcon
                }
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={21}
                  color={COLORS.primary}
                />
              </View>

              <View
                style={
                  styles.cardHeaderInformation
                }
              >
                <Text
                  style={styles.cardTitle}
                >
                  Citizen Verification
                </Text>

                <Text
                  style={
                    styles.cardDescription
                  }
                >
                  Complete all three checks
                  to verify your identity.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* PROGRESS */}

            <View
              style={
                styles.progressHeader
              }
            >
              <Text
                style={
                  styles.progressTitle
                }
              >
                Verification Progress
              </Text>

              <Text
                style={
                  styles.progressSubtitle
                }
              >
                {allVerified
                  ? "All verification checks completed."
                  : "Three checks are required to continue."}
              </Text>
            </View>

            {/* STEP 1 */}

            {renderStep(
              1,
              "South African ID",
              idVerified
                ? "Your 13-digit ID number has been verified."
                : "Verify your 13-digit South African ID number.",
              idVerified,
              true
            )}

            <View style={styles.stepLine} />

            {/* STEP 2 */}

            {renderStep(
              2,
              "Registered Phone Number",
              phoneVerified
                ? "Your registered phone number has been verified."
                : "Verify the phone number linked to your record.",
              phoneVerified,
              true
            )}

            <View style={styles.stepLine} />

            {/* STEP 3 */}

            {renderStep(
              3,
              "Face Verification",
              faceVerified
                ? "Your face has been successfully verified."
                : idVerified &&
                  phoneVerified
                ? "Confirm your identity using your face."
                : "Complete the ID and phone checks first.",
              faceVerified,
              true,
              !idVerified ||
                !phoneVerified
            )}

            {/* =================================================
                ID + PHONE FORM
            ================================================= */}

            {!idVerified && (
              <>
                <View
                  style={
                    styles.sectionDivider
                  }
                />

                {/* ID NUMBER */}

                <View
                  style={styles.inputGroup}
                >
                  <Text
                    style={
                      styles.inputLabel
                    }
                  >
                    ID NUMBER
                  </Text>

                  <View
                    style={
                      styles.inputContainer
                    }
                  >
                    <Ionicons
                      name="card-outline"
                      size={20}
                      color={
                        COLORS.textLight
                      }
                    />

                    <TextInput
                      placeholder="South African ID Number"
                      placeholderTextColor="#8A949D"
                      value={idNumber}
                      onChangeText={(value) => {
                        const numbersOnly =
                          value.replace(
                            /\D/g,
                            ""
                          );

                        setIdNumber(
                          numbersOnly
                        );

                        if (message) {
                          setMessage("");
                          setMessageType("");
                        }
                      }}
                      keyboardType="number-pad"
                      maxLength={13}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.input}
                    />
                  </View>

                  <Text
                    style={
                      styles.inputHint
                    }
                  >
                    Enter your 13-digit South
                    African ID number.
                  </Text>
                </View>

                {/* PHONE */}

                <View
                  style={styles.inputGroup}
                >
                  <Text
                    style={
                      styles.inputLabel
                    }
                  >
                    REGISTERED PHONE NUMBER
                  </Text>

                  <View
                    style={
                      styles.inputContainer
                    }
                  >
                    <Ionicons
                      name="call-outline"
                      size={20}
                      color={
                        COLORS.textLight
                      }
                    />

                    <TextInput
                      placeholder="Registered Phone Number"
                      placeholderTextColor="#8A949D"
                      value={phone}
                      onChangeText={(value) => {
                        const cleaned =
                          value.replace(
                            /[^\d+]/g,
                            ""
                          );

                        setPhone(cleaned);

                        if (message) {
                          setMessage("");
                          setMessageType("");
                        }
                      }}
                      keyboardType="phone-pad"
                      style={styles.input}
                    />
                  </View>

                  <Text
                    style={
                      styles.inputHint
                    }
                  >
                    Use the phone number registered
                    with your government record.
                  </Text>
                </View>

                {/* MESSAGE */}

                {message !== "" && (
                  <View
                    style={[
                      styles.messageContainer,

                      messageType ===
                        "success" &&
                        styles.successMessage,

                      messageType ===
                        "error" &&
                        styles.errorMessage,

                      messageType ===
                        "info" &&
                        styles.infoMessage,
                    ]}
                  >
                    <Ionicons
                      name={
                        messageType ===
                        "success"
                          ? "checkmark-circle-outline"
                          : messageType ===
                            "error"
                          ? "alert-circle-outline"
                          : "information-circle-outline"
                      }
                      size={18}
                      color={
                        getMessageColor()
                      }
                    />

                    <Text
                      style={[
                        styles.messageText,
                        {
                          color:
                            getMessageColor(),
                        },
                      ]}
                    >
                      {message}
                    </Text>
                  </View>
                )}

                {/* VERIFY BUTTON */}

                <TouchableOpacity
                  onPress={
                    handleVerify
                  }
                  disabled={loading}
                  activeOpacity={0.8}
                  style={[
                    styles.verifyButton,
                    loading &&
                      styles.verifyButtonDisabled,
                  ]}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator
                        color="#FFFFFF"
                        size="small"
                      />

                      <Text
                        style={
                          styles.verifyButtonText
                        }
                      >
                        Verifying...
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text
                        style={
                          styles.verifyButtonText
                        }
                      >
                        Verify ID & Phone
                      </Text>

                      <Ionicons
                        name="arrow-forward"
                        size={18}
                        color="#FFFFFF"
                      />
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* =================================================
                FACE VERIFICATION
            ================================================= */}

            {idVerified &&
              phoneVerified &&
              !faceVerified && (
                <>
                  <View
                    style={
                      styles.faceSection
                    }
                  >
                    <View
                      style={
                        styles.faceSectionHeader
                      }
                    >
                      <Ionicons
                        name="scan-outline"
                        size={18}
                        color={
                          COLORS.primary
                        }
                      />

                      <Text
                        style={
                          styles.faceSectionTitle
                        }
                      >
                        Final Security Check
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.faceSectionDescription
                      }
                    >
                      Your ID and registered
                      phone number are verified.
                      Complete the final face
                      verification to activate
                      your account.
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={
                      handleFaceVerification
                    }
                    activeOpacity={0.8}
                    style={
                      styles.faceButton
                    }
                  >
                    <View
                      style={
                        styles.faceIcon
                      }
                    >
                      <Ionicons
                        name="scan-outline"
                        size={22}
                        color={
                          COLORS.primary
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.faceInformation
                      }
                    >
                      <Text
                        style={
                          styles.faceTitle
                        }
                      >
                        Verify Your Face
                      </Text>

                      <Text
                        style={
                          styles.faceDescription
                        }
                      >
                        Scan and confirm your
                        face to complete
                        verification.
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={19}
                      color={
                        COLORS.textLight
                      }
                    />
                  </TouchableOpacity>
                </>
              )}

            {/* =================================================
                ALL VERIFIED
            ================================================= */}

            {allVerified && (
              <>
                <View
                  style={
                    styles.accountVerified
                  }
                >
                  <View
                    style={
                      styles.accountVerifiedIcon
                    }
                  >
                    <Ionicons
                      name="checkmark"
                      size={26}
                      color="#FFFFFF"
                    />
                  </View>

                  <Text
                    style={
                      styles.accountVerifiedTitle
                    }
                  >
                    Account Verified
                  </Text>

                  <Text
                    style={
                      styles.accountVerifiedText
                    }
                  >
                    Your identity has
                    successfully passed all
                    three verification checks.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={
                    handleContinue
                  }
                  activeOpacity={0.8}
                  style={
                    styles.continueButton
                  }
                >
                  <Text
                    style={
                      styles.continueButtonText
                    }
                  >
                    Continue to Login
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </>
            )}
          </Animated.View>

          {/* =====================================================
              SECURITY NOTICE
          ===================================================== */}

          <View
            style={styles.securityNotice}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={19}
              color={COLORS.primary}
            />

            <Text
              style={styles.securityText}
            >
              Your information is securely
              encrypted and only used to
              verify your government record
              and activate your citizen
              account.
            </Text>
          </View>

          {/* =====================================================
              SUPPORT
          ===================================================== */}

          <TouchableOpacity
            onPress={handleSupport}
            activeOpacity={0.7}
            style={styles.supportButton}
          >
            <View
              style={styles.supportIcon}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color={COLORS.primary}
              />
            </View>

            <View
              style={
                styles.supportInformation
              }
            >
              <Text
                style={styles.supportTitle}
              >
                Need Help?
              </Text>

              <Text
                style={
                  styles.supportDescription
                }
              >
                Contact support for
                assistance with account
                verification.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={COLORS.textLight}
            />
          </TouchableOpacity>

          {/* =====================================================
              FOOTER
          ===================================================== */}

          <Text style={styles.footer}>
            TrafficConnect SA
          </Text>

          <Text
            style={styles.footerSubtext}
          >
            Secure Citizen Services
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* =========================================================
          FACE VERIFICATION MODAL
      ========================================================= */}

      <Modal
        visible={faceModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={
          handleFaceCancel
        }
      >
        <SafeAreaView
          style={
            styles.faceModalContainer
          }
        >
          {/* MODAL HEADER */}

          <View
            style={
              styles.faceModalHeader
            }
          >
            <TouchableOpacity
              onPress={
                handleFaceCancel
              }
              style={
                styles.faceBackButton
              }
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color={COLORS.text}
              />
            </TouchableOpacity>

            <View
              style={
                styles.faceModalHeaderText
              }
            >
              <Text
                style={
                  styles.faceModalTitle
                }
              >
                Face Verification
              </Text>

              <Text
                style={
                  styles.faceModalSubtitle
                }
              >
                Final identity check
              </Text>
            </View>

            <View
              style={
                styles.faceHeaderSpacer
              }
            />
          </View>

          {/* FACE SCANNER */}

          <View
            style={
              styles.faceVerificationContainer
            }
          >
<FaceVerificationScanner
  visible={faceModalVisible}
  onClose={handleFaceCancel}
  onVerified={(imageUri) => {
    console.log("✅ FACE VERIFIED:", imageUri);
    handleFaceSuccess(imageUri);
  }}
/>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// =============================================================
// STYLES
// =============================================================

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboard: {
    flex: 1,
  },

  container: {
    paddingHorizontal: 18,
    paddingTop: 30,
    paddingBottom: 35,
  },

  // ===========================================================
  // HEADER
  // ===========================================================

  header: {
    alignItems: "center",
    marginBottom: 24,
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
    maxWidth: 335,
    color: COLORS.textLight,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },

  // ===========================================================
  // CARD
  // ===========================================================

  verifyCard: {
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

  // ===========================================================
  // PROGRESS
  // ===========================================================

  progressHeader: {
    marginBottom: 14,
  },

  progressTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },

  progressSubtitle: {
    marginTop: 3,
    fontSize: 9,
    lineHeight: 14,
    color: COLORS.textLight,
  },

  // ===========================================================
  // STEPS
  // ===========================================================

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
  },

  stepDisabled: {
    opacity: 0.55,
  },

  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  stepCircleVerified: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },

  stepCircleDisabled: {
    backgroundColor: "#F4F6F8",
  },

  stepNumber: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textLight,
  },

  stepNumberDisabled: {
    color: "#AAB3BA",
  },

  stepInformation: {
    flex: 1,
    marginLeft: 10,
  },

  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },

  stepTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },

  stepTitleDisabled: {
    color: "#8A949D",
  },

  stepDescription: {
    marginTop: 2,
    fontSize: 9,
    lineHeight: 14,
    color: COLORS.textLight,
  },

  stepDescriptionDisabled: {
    color: "#9AA4AC",
  },

  stepLine: {
    width: 1,
    height: 18,
    backgroundColor: COLORS.border,
    marginLeft: 15,
    marginVertical: 4,
  },

  verifiedBadge: {
    marginLeft: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: COLORS.softGreen,
  },

  verifiedBadgeText: {
    fontSize: 6.5,
    fontWeight: "800",
    letterSpacing: 0.4,
    color: COLORS.success,
  },

  requiredBadge: {
    marginLeft: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: COLORS.softBlue,
  },

  requiredText: {
    fontSize: 6.5,
    fontWeight: "800",
    letterSpacing: 0.4,
    color: COLORS.primary,
  },

  // ===========================================================
  // INPUT
  // ===========================================================

  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },

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
    lineHeight: 13,
    color: COLORS.textLight,
  },

  // ===========================================================
  // MESSAGE
  // ===========================================================

  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },

  successMessage: {
    backgroundColor: COLORS.softGreen,
    borderColor: "#B7E3CA",
  },

  errorMessage: {
    backgroundColor: COLORS.softRed,
    borderColor: "#F3C7C3",
  },

  infoMessage: {
    backgroundColor: COLORS.softBlue,
    borderColor: "#C7DDED",
  },

  messageText: {
    flex: 1,
    marginLeft: 7,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "600",
  },

  // ===========================================================
  // VERIFY BUTTON
  // ===========================================================

  verifyButton: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 9,
    marginTop: 2,
  },

  verifyButtonDisabled: {
    opacity: 0.7,
  },

  verifyButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    marginRight: 8,
  },

  // ===========================================================
  // FACE
  // ===========================================================

  faceSection: {
    backgroundColor: COLORS.softBlue,
    borderWidth: 1,
    borderColor: "#C7DDED",
    borderRadius: 10,
    padding: 11,
    marginTop: 15,
  },

  faceSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  faceSectionTitle: {
    marginLeft: 7,
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary,
  },

  faceSectionDescription: {
    marginTop: 6,
    fontSize: 9,
    lineHeight: 14,
    color: COLORS.text,
  },

  faceButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    padding: 11,
    marginTop: 10,
  },

  faceIcon: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  faceInformation: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },

  faceTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primary,
  },

  faceDescription: {
    marginTop: 2,
    fontSize: 9,
    lineHeight: 14,
    color: COLORS.textLight,
  },

  // ===========================================================
  // ACCOUNT VERIFIED
  // ===========================================================

  accountVerified: {
    alignItems: "center",
    backgroundColor: COLORS.softGreen,
    borderWidth: 1,
    borderColor: "#B7E3CA",
    borderRadius: 10,
    padding: 16,
    marginTop: 16,
  },

  accountVerifiedIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  accountVerifiedTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.success,
  },

  accountVerifiedText: {
    marginTop: 4,
    textAlign: "center",
    fontSize: 9,
    lineHeight: 14,
    color: COLORS.text,
  },

  continueButton: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.success,
    borderRadius: 9,
    marginTop: 10,
  },

  continueButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    marginRight: 8,
  },

  // ===========================================================
  // SECURITY
  // ===========================================================

  securityNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.softBlue,
    borderWidth: 1,
    borderColor: "#C7DDED",
    borderRadius: 9,
    padding: 11,
    marginTop: 18,
  },

  securityText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 9,
    lineHeight: 15,
    color: COLORS.text,
  },

  // ===========================================================
  // SUPPORT
  // ===========================================================

  supportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 11,
    marginTop: 10,
  },

  supportIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  supportInformation: {
    flex: 1,
    marginLeft: 9,
    marginRight: 7,
  },

  supportTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
  },

  supportDescription: {
    marginTop: 2,
    fontSize: 9,
    lineHeight: 13,
    color: COLORS.textLight,
  },

  // ===========================================================
  // FOOTER
  // ===========================================================

  footer: {
    marginTop: 24,
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

  // ===========================================================
  // FACE MODAL
  // ===========================================================

  faceModalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  faceModalHeader: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  faceBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  faceModalHeaderText: {
    flex: 1,
    alignItems: "center",
  },

  faceModalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },

  faceModalSubtitle: {
    marginTop: 2,
    fontSize: 9,
    color: COLORS.textLight,
  },

  faceHeaderSpacer: {
    width: 40,
  },

  faceVerificationContainer: {
    flex: 1,
  },
});