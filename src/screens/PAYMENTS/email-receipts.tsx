import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";

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
  danger: "#B42318",
  softRed: "#FEF3F2",
};

/* =========================================================
   TYPES
========================================================= */

type ReceiptType = "latest" | "all";

type PaymentRecord = {
  id: string;
  reference: string;
  description: string;
  method: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: Date | null;
  receiptId: string;
  source: string;
};

/* =========================================================
   HELPERS
========================================================= */

const formatMoney = (
  amount: number,
  currency: string = "ZAR"
) => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  try {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: currency || "ZAR",
    }).format(safeAmount);
  } catch {
    return `R${safeAmount.toFixed(2)}`;
  }
};

const formatDate = (date: Date | null) => {
  if (!date) return "Date unavailable";

  return date.toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toDate = (value: any): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value?.toDate === "function") {
    const result = value.toDate();

    return result instanceof Date &&
      !Number.isNaN(result.getTime())
      ? result
      : null;
  }

  if (typeof value === "number" || typeof value === "string") {
    const result = new Date(value);

    return Number.isNaN(result.getTime()) ? null : result;
  }

  return null;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const isSuccessfulPayment = (status: unknown) => {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase();

  return [
    "success",
    "successful",
    "completed",
    "paid",
  ].includes(normalized);
};

/* =========================================================
   SCREEN
========================================================= */

export default function EmailReceiptsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [email, setEmail] = useState(
    String((user as any)?.email ?? "")
  );

  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [receiptType, setReceiptType] =
    useState<ReceiptType>("latest");

  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  /* =======================================================
     FETCH REAL PAYMENT HISTORY
  ======================================================= */

  const loadPaymentHistory = useCallback(async () => {
    const citizenId = String(
      (user as any)?.idNumber ?? ""
    ).trim();

    const userId = String(
      (user as any)?.id ?? ""
    ).trim();

    if (!citizenId && !userId) {
      setPayments([]);
      setLoadError(
        "We couldn't identify your account. Please sign in again."
      );
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoadError("");

      const paymentCollection = collection(
        db,
        "paymentHistory"
      );

      const snapshots = new Map<string, any>();

      /*
       * Support the existing paymentHistory schemas:
       * userId = citizen ID
       * citizenId = citizen ID
       *
       * No orderBy is used, so this does not require a
       * composite ordering index.
       */

      const identifiers = Array.from(
        new Set([citizenId, userId].filter(Boolean))
      );

      for (const identifier of identifiers) {
        for (const field of ["userId", "citizenId"]) {
          try {
            const paymentQuery = query(
              paymentCollection,
              where(field, "==", identifier)
            );

            const result = await getDocs(paymentQuery);

            result.forEach((documentSnapshot) => {
              snapshots.set(
                documentSnapshot.id,
                documentSnapshot
              );
            });
          } catch (queryError) {
            console.warn(
              `Could not query paymentHistory by ${field}:`,
              queryError
            );
          }
        }
      }

      const records: PaymentRecord[] = [];

      snapshots.forEach((documentSnapshot) => {
        const data = documentSnapshot.data();

        // Only display successful/paid transactions.
        if (!isSuccessfulPayment(data.status)) {
          return;
        }

        const rawAmount = Number(data.amount ?? 0);

        const amount = Number.isFinite(rawAmount)
          ? rawAmount
          : 0;

        const date = toDate(
          data.paidAt ??
            data.createdAt ??
            data.timestamp
        );

        const reference = String(
          data.receiptId ??
            data.reference ??
            data.paymentId ??
            data.requestId ??
            documentSnapshot.id
        );

        const description = String(
          data.description ??
            data.type ??
            data.source ??
            "Transport service payment"
        );

        const method = String(
          data.methodLabel ??
            data.method ??
            data.cardUsed ??
            "Not specified"
        );

        records.push({
          id: documentSnapshot.id,
          reference,
          receiptId: String(
            data.receiptId ?? reference
          ),
          description,
          method,
          amount,
          currency: String(data.currency ?? "ZAR"),
          status: String(data.status ?? ""),
          createdAt: date,
          source: String(data.source ?? ""),
        });
      });

      // Newest payment first.
      records.sort((a, b) => {
        const timeA = a.createdAt?.getTime() ?? 0;
        const timeB = b.createdAt?.getTime() ?? 0;

        return timeB - timeA;
      });

      setPayments(records);
    } catch (error) {
      console.error(
        "Payment history loading error:",
        error
      );

      setLoadError(
        "We couldn't load your payment history. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadPaymentHistory();
  }, [loadPaymentHistory]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPaymentHistory();
  };

  /* =======================================================
     SELECT RECEIPTS
  ======================================================= */

  const selectedPayments =
    receiptType === "latest"
      ? payments.slice(0, 1)
      : payments;

  const previewPayment = payments[0] ?? null;

  /* =======================================================
     BUILD EMAIL CONTENT
  ======================================================= */

  const buildReceiptEmail = (
    selected: PaymentRecord[]
  ) => {
    const receiptRows = selected
      .map(
        (payment) => `
          <tr>
            <td style="padding:12px;border-bottom:1px solid #E5E7EB;">
              ${escapeHtml(payment.reference)}
            </td>
            <td style="padding:12px;border-bottom:1px solid #E5E7EB;">
              ${escapeHtml(payment.description)}
            </td>
            <td style="padding:12px;border-bottom:1px solid #E5E7EB;">
              ${escapeHtml(payment.method)}
            </td>
            <td style="padding:12px;border-bottom:1px solid #E5E7EB;text-align:right;">
              ${escapeHtml(
                formatMoney(
                  payment.amount,
                  payment.currency
                )
              )}
            </td>
            <td style="padding:12px;border-bottom:1px solid #E5E7EB;">
              ${escapeHtml(formatDate(payment.createdAt))}
            </td>
          </tr>
        `
      )
      .join("");

    const total = selected.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    const currency = selected[0]?.currency ?? "ZAR";

    return `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:24px;background:#F3F5F7;font-family:Arial,sans-serif;color:#17212B;">
          <div style="max-width:850px;margin:0 auto;background:#FFFFFF;border-radius:14px;overflow:hidden;">
            <div style="padding:28px;background:#0B4F8A;color:#FFFFFF;">
              <h1 style="margin:0;font-size:24px;">
                TrafficConnect SA
              </h1>
              <p style="margin:8px 0 0;">
                ${receiptType === "latest"
                  ? "Your latest payment receipt"
                  : "Your payment receipt history"}
              </p>
            </div>

            <div style="padding:24px;">
              <p>
                Hello,
              </p>

              <p>
                Here ${
                  receiptType === "latest"
                    ? "is your latest successful payment receipt"
                    : "are your available successful payment receipts"
                }.
              </p>

              <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead>
                  <tr style="background:#EAF3FA;text-align:left;">
                    <th style="padding:12px;">Reference</th>
                    <th style="padding:12px;">Service</th>
                    <th style="padding:12px;">Method</th>
                    <th style="padding:12px;text-align:right;">Amount</th>
                    <th style="padding:12px;">Date</th>
                  </tr>
                </thead>

                <tbody>
                  ${receiptRows}
                </tbody>
              </table>

              <div style="margin-top:20px;padding:16px;background:#ECFDF3;border-radius:10px;">
                <strong>
                  ${
                    receiptType === "latest"
                      ? "Receipt amount"
                      : "Total of listed payments"
                  }:
                  ${escapeHtml(formatMoney(total, currency))}
                </strong>
              </div>

              <p style="margin-top:24px;font-size:12px;color:#66737F;">
                This email contains payment information
                recorded in TrafficConnect SA.
                Keep it for your records.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  /* =======================================================
     SEND / QUEUE RECEIPT EMAIL
  ======================================================= */

  const handleSendReceipt = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      Alert.alert(
        "Email required",
        "Please enter an email address."
      );
      return;
    }

    const emailIsValid =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        trimmedEmail
      );

    if (!emailIsValid) {
      Alert.alert(
        "Invalid email",
        "Please enter a valid email address."
      );
      return;
    }

    if (loading) {
      Alert.alert(
        "Please wait",
        "Your payment history is still loading."
      );
      return;
    }

    if (selectedPayments.length === 0) {
      Alert.alert(
        "No receipts available",
        "There are no successful payments available to email."
      );
      return;
    }

    try {
      setSending(true);

      const subject =
        receiptType === "latest"
          ? "Your Latest TrafficConnect SA Payment Receipt"
          : "Your TrafficConnect SA Payment Receipts";

      const html = buildReceiptEmail(
        selectedPayments
      );

      /*
       * Firebase Trigger Email extension:
       *
       * A document created in the "mail" collection is
       * processed by the extension and sent using the
       * email provider configured in Firebase.
       *
       * This requires the Trigger Email extension to be
       * installed and configured in your Firebase project.
       */

      await addDoc(collection(db, "mail"), {
        to: trimmedEmail,
        message: {
          subject,
          html,
        },
        metadata: {
          source: "TrafficConnect SA",
          receiptType,
          paymentCount: selectedPayments.length,
        },
      });

      Alert.alert(
        "Receipt request queued",
        `Your ${
          receiptType === "latest"
            ? "latest receipt"
            : `${selectedPayments.length} receipts`
        } has been queued for delivery to ${trimmedEmail}.\n\nEmail delivery depends on your Firebase email service being configured.`,
        [
          {
            text: "Done",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error(
        "Receipt email queue error:",
        error
      );

      Alert.alert(
        "Unable to request receipt",
        "The receipt email could not be queued. Check your internet connection and Firebase permissions, then try again."
      );
    } finally {
      setSending(false);
    }
  };

  /* =======================================================
     SCREEN
  ======================================================= */

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* HEADER */}

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
              Email Receipts
            </Text>

            <Text style={styles.headerSubtitle}>
              Your actual payment records
            </Text>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={loading || refreshing || sending}
          >
            <Ionicons
              name="refresh"
              size={20}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* HERO */}

          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons
                name="email-check-outline"
                size={30}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.heroTitle}>
              Your receipts, delivered
            </Text>

            <Text style={styles.heroDescription}>
              Choose a receipt from your real payment
              history and send it to your email address.
            </Text>

            <View style={styles.heroCount}>
              <Ionicons
                name="receipt-outline"
                size={16}
                color="#FFFFFF"
              />

              <Text style={styles.heroCountText}>
                {payments.length} successful{" "}
                {payments.length === 1
                  ? "payment"
                  : "payments"}{" "}
                available
              </Text>
            </View>
          </View>

          {/* LOADING */}

          {loading && (
            <View style={styles.stateCard}>
              <ActivityIndicator
                size="large"
                color={COLORS.primary}
              />

              <Text style={styles.stateTitle}>
                Loading payment history
              </Text>

              <Text style={styles.stateDescription}>
                Fetching your successful payments from
                TrafficConnect SA.
              </Text>
            </View>
          )}

          {/* ERROR */}

          {!loading && !!loadError && (
            <View style={styles.errorCard}>
              <Ionicons
                name="alert-circle-outline"
                size={25}
                color={COLORS.danger}
              />

              <View style={styles.stateInformation}>
                <Text style={styles.errorTitle}>
                  Unable to load receipts
                </Text>

                <Text style={styles.errorText}>
                  {loadError}
                </Text>

                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRefresh}
                >
                  <Text style={styles.retryText}>
                    Try again
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* EMAIL ADDRESS */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Email address
            </Text>

            <Text style={styles.sectionDescription}>
              Where should we send your receipt?
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>
              Recipient email
            </Text>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={COLORS.textLight}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="example@email.com"
                placeholderTextColor="#9AA5AE"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!sending}
              />
            </View>
          </View>

          {/* RECEIPT TYPE */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Select receipts
            </Text>

            <Text style={styles.sectionDescription}>
              Choose which successful payments to email.
            </Text>
          </View>

          <View style={styles.optionsCard}>
            <ReceiptOption
              selected={receiptType === "latest"}
              icon="receipt-outline"
              title="Latest receipt"
              description={
                payments.length > 0
                  ? "Send your most recent successful payment."
                  : "No successful payment is currently available."
              }
              disabled={
                loading || payments.length === 0
              }
              onPress={() => setReceiptType("latest")}
            />

            <View style={styles.optionDivider} />

            <ReceiptOption
              selected={receiptType === "all"}
              icon="documents-outline"
              title="Payment history"
              description={`Send all ${payments.length} available successful payment receipts.`}
              disabled={
                loading || payments.length === 0
              }
              onPress={() => setReceiptType("all")}
            />
          </View>

          {/* RECEIPT PREVIEW */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Receipt preview
            </Text>

            <Text style={styles.sectionDescription}>
              This information comes from Firestore.
            </Text>
          </View>

          {loading ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator color={COLORS.primary} />

              <Text style={styles.emptyText}>
                Preparing your receipt preview...
              </Text>
            </View>
          ) : previewPayment ? (
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <View style={styles.previewIcon}>
                  <Ionicons
                    name="document-text-outline"
                    size={21}
                    color={COLORS.primary}
                  />
                </View>

                <View style={styles.previewHeaderInfo}>
                  <Text style={styles.previewTitle}>
                    {receiptType === "latest"
                      ? "Latest payment"
                      : "Most recent payment"}
                  </Text>

                  <Text style={styles.previewSubtitle}>
                    TrafficConnect SA
                  </Text>
                </View>

                <View style={styles.paidBadge}>
                  <Text style={styles.paidText}>
                    PAID
                  </Text>
                </View>
              </View>

              <View style={styles.previewDivider} />

              <ReceiptRow
                label="Reference"
                value={previewPayment.reference}
              />

              <ReceiptRow
                label="Service"
                value={previewPayment.description}
              />

              <ReceiptRow
                label="Payment method"
                value={previewPayment.method}
              />

              <ReceiptRow
                label="Payment date"
                value={formatDate(
                  previewPayment.createdAt
                )}
              />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Amount
                </Text>

                <Text style={styles.totalValue}>
                  {formatMoney(
                    previewPayment.amount,
                    previewPayment.currency
                  )}
                </Text>
              </View>

              {receiptType === "all" && (
                <View style={styles.selectionNote}>
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color={COLORS.primary}
                  />

                  <Text style={styles.selectionNoteText}>
                    Your email will contain all{" "}
                    {payments.length} successful payments.
                    The preview above shows the most recent
                    one.
                  </Text>
                </View>
              )}
            </View>
          ) : (
            !loading &&
            !loadError && (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="receipt-outline"
                    size={29}
                    color={COLORS.primary}
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  No receipts yet
                </Text>

                <Text style={styles.emptyText}>
                  Successful payments associated with your
                  account will appear here.
                </Text>

                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRefresh}
                >
                  <Text style={styles.retryText}>
                    Refresh payments
                  </Text>
                </TouchableOpacity>
              </View>
            )
          )}

          {/* SECURITY */}

          <View style={styles.securityCard}>
            <View style={styles.securityIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color={COLORS.success}
              />
            </View>

            <View style={styles.securityInformation}>
              <Text style={styles.securityTitle}>
                Your information matters
              </Text>

              <Text style={styles.securityText}>
                Only successful payments loaded for your
                account are included. Never send card PINs
                or banking passwords by email.
              </Text>
            </View>
          </View>

          {/* SEND */}

          <TouchableOpacity
            style={[
              styles.sendButton,
              (sending ||
                loading ||
                !!loadError ||
                selectedPayments.length === 0) &&
                styles.sendButtonDisabled,
            ]}
            activeOpacity={0.85}
            disabled={
              sending ||
              loading ||
              !!loadError ||
              selectedPayments.length === 0
            }
            onPress={handleSendReceipt}
          >
            {sending ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <>
                <Ionicons
                  name="send-outline"
                  size={20}
                  color="#FFFFFF"
                />

                <Text style={styles.sendButtonText}>
                  {receiptType === "latest"
                    ? "Email latest receipt"
                    : `Email ${selectedPayments.length} receipts`}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* CANCEL */}

          <TouchableOpacity
            style={styles.cancelButton}
            activeOpacity={0.8}
            disabled={sending}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>
              Cancel
            </Text>
          </TouchableOpacity>

          {/* FOOTER */}

          <View style={styles.footer}>
            <Ionicons
              name="mail-outline"
              size={14}
              color={COLORS.textLight}
            />

            <Text style={styles.footerText}>
              Email delivery requires a configured Firebase
              email service.
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* =========================================================
   RECEIPT OPTION
========================================================= */

type ReceiptOptionProps = {
  selected: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  disabled?: boolean;
  onPress: () => void;
};

function ReceiptOption({
  selected,
  icon,
  title,
  description,
  disabled = false,
  onPress,
}: ReceiptOptionProps) {
  return (
    <TouchableOpacity
      style={[
        styles.receiptOption,
        selected && styles.receiptOptionSelected,
        disabled && styles.optionDisabled,
      ]}
      activeOpacity={0.8}
      disabled={disabled}
      onPress={onPress}
    >
      <View
        style={[
          styles.receiptOptionIcon,
          selected && styles.receiptOptionIconSelected,
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={selected ? "#FFFFFF" : COLORS.primary}
        />
      </View>

      <View style={styles.receiptOptionInformation}>
        <Text
          style={[
            styles.receiptOptionTitle,
            selected && styles.receiptOptionTitleSelected,
          ]}
        >
          {title}
        </Text>

        <Text style={styles.receiptOptionDescription}>
          {description}
        </Text>
      </View>

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
}

/* =========================================================
   RECEIPT ROW
========================================================= */

type ReceiptRowProps = {
  label: string;
  value: string;
};

function ReceiptRow({
  label,
  value,
}: ReceiptRowProps) {
  return (
    <View style={styles.receiptRow}>
      <Text style={styles.receiptRowLabel}>
        {label}
      </Text>

      <Text style={styles.receiptRowValue}>
        {value || "Not available"}
      </Text>
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

  header: {
    minHeight: 72,
    paddingHorizontal: 18,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
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

  refreshButton: {
    marginLeft: "auto",
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 35,
  },

  heroCard: {
    padding: 20,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: "center",
  },

  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  heroTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },

  heroDescription: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 18,
    color: "#DCEBFA",
    textAlign: "center",
    paddingHorizontal: 10,
  },

  heroCount: {
    marginTop: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  heroCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  sectionHeader: {
    marginTop: 24,
    marginBottom: 11,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },

  sectionDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textLight,
  },

  formCard: {
    padding: 17,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  inputLabel: {
    marginBottom: 7,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },

  inputWrapper: {
    minHeight: 53,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FAFBFC",
    flexDirection: "row",
    alignItems: "center",
  },

  inputIcon: {
    marginLeft: 14,
  },

  input: {
    flex: 1,
    minHeight: 51,
    paddingHorizontal: 11,
    fontSize: 15,
    color: COLORS.text,
  },

  optionsCard: {
    padding: 7,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  receiptOption: {
    minHeight: 74,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  receiptOptionSelected: {
    backgroundColor: COLORS.softBlue,
  },

  optionDisabled: {
    opacity: 0.5,
  },

  receiptOptionIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  receiptOptionIconSelected: {
    backgroundColor: COLORS.primary,
  },

  receiptOptionInformation: {
    flex: 1,
    marginLeft: 12,
  },

  receiptOptionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },

  receiptOptionTitleSelected: {
    color: COLORS.primaryDark,
  },

  receiptOptionDescription: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.textLight,
  },

  optionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 10,
  },

  radio: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  radioSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  previewCard: {
    padding: 17,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  previewHeaderInfo: {
    flex: 1,
    marginLeft: 11,
  },

  previewTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },

  previewSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: COLORS.textLight,
  },

  paidBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: COLORS.softGreen,
  },

  paidText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.success,
  },

  previewDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },

  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },

  receiptRowLabel: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textLight,
  },

  receiptRowValue: {
    flex: 1.5,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "right",
  },

  totalRow: {
    marginTop: 5,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  totalLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },

  totalValue: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.primary,
  },

  selectionNote: {
    marginTop: 15,
    padding: 11,
    borderRadius: 11,
    backgroundColor: COLORS.softBlue,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  selectionNoteText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.primaryDark,
  },

  securityCard: {
    marginTop: 16,
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

  securityText: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: "#3D6B56",
  },

  sendButton: {
    minHeight: 54,
    marginTop: 22,
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  sendButtonDisabled: {
    opacity: 0.5,
  },

  sendButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  cancelButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textLight,
  },

  footer: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  footerText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.textLight,
    textAlign: "center",
  },

  stateCard: {
    marginTop: 18,
    padding: 24,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },

  stateInformation: {
    flex: 1,
    marginLeft: 12,
  },

  stateTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },

  stateDescription: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textLight,
    textAlign: "center",
  },

  errorCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 15,
    backgroundColor: COLORS.softRed,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  errorTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.danger,
  },

  errorText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.text,
  },

  retryButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: COLORS.softBlue,
  },

  retryText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primary,
  },

  emptyCard: {
    padding: 24,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },

  emptyText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textLight,
    textAlign: "center",
  },
});