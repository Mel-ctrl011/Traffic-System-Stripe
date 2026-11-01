import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

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
  softBlue: "#EAF3FA",
  softGreen: "#ECFDF3",
};

/* =========================================================
   BANKS
========================================================= */

const BANKS = [
  {
    id: "standard",
    name: "Standard Bank",
    icon: "bank-outline" as const,
  },
  {
    id: "fnb",
    name: "FNB",
    icon: "bank-outline" as const,
  },
  {
    id: "absa",
    name: "ABSA",
    icon: "bank-outline" as const,
  },
  {
    id: "nedbank",
    name: "Nedbank",
    icon: "bank-outline" as const,
  },
  {
    id: "capitec",
    name: "Capitec",
    icon: "bank-outline" as const,
  },
];

/* =========================================================
   SCREEN
========================================================= */

export default function InstantEFTScreen() {
  const navigation = useNavigation<any>();

  const [selectedBank, setSelectedBank] = useState<string | null>(
    null
  );

  const [processing, setProcessing] = useState(false);

  /* =======================================================
     CONTINUE PAYMENT
  ======================================================= */

  const handleContinue = async () => {
    if (!selectedBank) {
      Alert.alert(
        "Select your bank",
        "Please select the bank you want to use for this payment."
      );
      return;
    }

    try {
      setProcessing(true);

      /*
       * -----------------------------------------------------
       * REAL PAYMENT PROVIDER INTEGRATION GOES HERE
       * -----------------------------------------------------
       *
       * For example:
       *
       * const checkout = await createInstantEFTCheckout({
       *   amount: 150,
       *   bank: selectedBank,
       * });
       *
       * Then open the secure payment-provider checkout.
       *
       * Do NOT collect or store the user's banking password,
       * PIN or OTP inside this app.
       */

      await new Promise((resolve) =>
        setTimeout(resolve, 1200)
      );

      Alert.alert(
        "Continue to payment",
        `You selected ${
          BANKS.find((bank) => bank.id === selectedBank)?.name
        }.`,
        [
          {
            text: "Continue",
            onPress: () => {
              // Replace this with your real EFT checkout.
              console.log(
                "Starting Instant EFT:",
                selectedBank
              );
            },
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={COLORS.text}
            />
          </TouchableOpacity>

          <View>
            <Text style={styles.headerTitle}>
              Instant EFT
            </Text>

            <Text style={styles.headerSubtitle}>
              Secure bank payment
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* =================================================
              PAYMENT SUMMARY
          ================================================= */}

          <View style={styles.amountCard}>
            <View style={styles.amountIcon}>
              <MaterialCommunityIcons
                name="bank-transfer"
                size={27}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.amountInformation}>
              <Text style={styles.amountLabel}>
                Amount to pay
              </Text>

              <Text style={styles.amount}>
                R150.00
              </Text>

              <Text style={styles.amountDescription}>
                Transport service payment
              </Text>
            </View>
          </View>

          {/* =================================================
              HOW IT WORKS
          ================================================= */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              How Instant EFT works
            </Text>

            <Text style={styles.sectionDescription}>
              Pay directly from your bank account.
            </Text>
          </View>

          <View style={styles.stepsCard}>
            <PaymentStep
              number="1"
              icon="bank-outline"
              title="Select your bank"
              description="Choose the bank you use for this payment."
            />

            <View style={styles.stepLine} />

            <PaymentStep
              number="2"
              icon="shield-checkmark-outline"
              title="Secure bank login"
              description="You will be redirected to a secure banking page."
            />

            <View style={styles.stepLine} />

            <PaymentStep
              number="3"
              icon="checkmark-circle-outline"
              title="Confirm payment"
              description="Approve the transaction with your bank."
            />
          </View>

          {/* =================================================
              BANK SELECTION
          ================================================= */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Select your bank
            </Text>

            <Text style={styles.sectionDescription}>
              Choose the bank account you want to use.
            </Text>
          </View>

          <View style={styles.bankList}>
            {BANKS.map((bank) => {
              const selected = selectedBank === bank.id;

              return (
                <TouchableOpacity
                  key={bank.id}
                  style={[
                    styles.bankCard,
                    selected && styles.bankCardSelected,
                  ]}
                  activeOpacity={0.8}
                  onPress={() =>
                    setSelectedBank(bank.id)
                  }
                >
                  <View
                    style={[
                      styles.bankIcon,
                      selected &&
                        styles.bankIconSelected,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={bank.icon}
                      size={23}
                      color={
                        selected
                          ? "#FFFFFF"
                          : COLORS.primary
                      }
                    />
                  </View>

                  <Text
                    style={[
                      styles.bankName,
                      selected &&
                        styles.bankNameSelected,
                    ]}
                  >
                    {bank.name}
                  </Text>

                  <View
                    style={[
                      styles.radio,
                      selected && styles.radioSelected,
                    ]}
                  >
                    {selected && (
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color="#FFFFFF"
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* =================================================
              SECURITY NOTICE
          ================================================= */}

          <View style={styles.securityCard}>
            <View style={styles.securityIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={21}
                color={COLORS.success}
              />
            </View>

            <View style={styles.securityInformation}>
              <Text style={styles.securityTitle}>
                Secure banking
              </Text>

              <Text style={styles.securityDescription}>
                Your banking credentials are entered
                directly on your bank's secure platform.
                They are never stored by this app.
              </Text>
            </View>
          </View>

          {/* =================================================
              PAYMENT BUTTON
          ================================================= */}

          <TouchableOpacity
            style={[
              styles.continueButton,
              processing &&
                styles.continueButtonDisabled,
            ]}
            activeOpacity={0.85}
            disabled={processing}
            onPress={handleContinue}
          >
            {processing ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <>
                <Ionicons
                  name="arrow-forward-circle-outline"
                  size={21}
                  color="#FFFFFF"
                />

                <Text style={styles.continueButtonText}>
                  Continue to bank
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* =================================================
              CANCEL
          ================================================= */}

          <TouchableOpacity
            style={styles.cancelButton}
            activeOpacity={0.8}
            disabled={processing}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>
              Cancel payment
            </Text>
          </TouchableOpacity>

          {/* =================================================
              FOOTER
          ================================================= */}

          <View style={styles.footer}>
            <Ionicons
              name="lock-closed-outline"
              size={14}
              color={COLORS.textLight}
            />

            <Text style={styles.footerText}>
              Secure payment processing
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* =========================================================
   PAYMENT STEP
========================================================= */

type PaymentStepProps = {
  number: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
};

function PaymentStep({
  number,
  icon,
  title,
  description,
}: PaymentStepProps) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>
          {number}
        </Text>
      </View>

      <View style={styles.stepIcon}>
        <MaterialCommunityIcons
          name={icon}
          size={21}
          color={COLORS.primary}
        />
      </View>

      <View style={styles.stepInformation}>
        <Text style={styles.stepTitle}>
          {title}
        </Text>

        <Text style={styles.stepDescription}>
          {description}
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
    backgroundColor: COLORS.background,
  },

  container: {
    flex: 1,
  },

  /* HEADER */

  header: {
    height: 72,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.text,
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textLight,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 35,
  },

  /* AMOUNT */

  amountCard: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
  },

  amountIcon: {
    width: 53,
    height: 53,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  amountInformation: {
    flex: 1,
    marginLeft: 15,
  },

  amountLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DCEBFA",
  },

  amount: {
    marginTop: 2,
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  amountDescription: {
    marginTop: 2,
    fontSize: 12,
    color: "#DCEBFA",
  },

  /* SECTION */

  sectionHeader: {
    marginTop: 25,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },

  sectionDescription: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.textLight,
  },

  /* STEPS */

  stepsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  step: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 62,
  },

  stepNumber: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  stepNumberText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary,
  },

  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginLeft: 10,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  stepInformation: {
    flex: 1,
    marginLeft: 11,
  },

  stepTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },

  stepDescription: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textLight,
  },

  stepLine: {
    height: 18,
    width: 1,
    marginLeft: 29,
    backgroundColor: COLORS.border,
  },

  /* BANKS */

  bankList: {
    gap: 9,
  },

  bankCard: {
    minHeight: 64,
    paddingHorizontal: 13,
    borderRadius: 15,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },

  bankCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.softBlue,
  },

  bankIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  bankIconSelected: {
    backgroundColor: COLORS.primary,
  },

  bankName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },

  bankNameSelected: {
    color: COLORS.primaryDark,
  },

  radio: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  radioSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  /* SECURITY */

  securityCard: {
    marginTop: 17,
    padding: 15,
    borderRadius: 16,
    backgroundColor: COLORS.softGreen,
    flexDirection: "row",
    alignItems: "center",
  },

  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  securityInformation: {
    flex: 1,
    marginLeft: 11,
  },

  securityTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.success,
  },

  securityDescription: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: "#3D6B56",
  },

  /* BUTTON */

  continueButton: {
    height: 54,
    marginTop: 22,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  continueButtonDisabled: {
    opacity: 0.65,
  },

  continueButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  cancelButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textLight,
  },

  /* FOOTER */

  footer: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  footerText: {
    fontSize: 10,
    color: COLORS.textLight,
  },
});