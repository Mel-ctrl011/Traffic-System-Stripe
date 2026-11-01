
import React, { useCallback, useEffect, useState } from "react";
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
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";

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
  warning: "#92400E",
  softWarning: "#FEF3C7",
};

type PaymentReceipt = {
  id: string;
  reference: string;
  service: string;
  date: Date | null;
  amount: number;
  method: string;
  status: string;
  currency: string;
  simulated: boolean;
  fineId?: string;
  ticketId?: string;
  registrationNumber?: string;
};

function formatAmount(amount: number, currency = "ZAR") {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
  }).format(amount);
}

function formatDate(date: Date | null) {
  if (!date || Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getPaymentDate(value: any): Date | null {
  if (!value) return null;

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getPaymentMethod(data: any) {
  if (data.methodLabel) return String(data.methodLabel);

  switch (data.method) {
    case "card":
      return "Card payment";
    case "eft":
      return "Instant EFT";
    case "wallet":
      return "Digital wallet";
    default:
      return data.method ? String(data.method) : "Not specified";
  }
}

function isSuccessful(status: string) {
  return ["completed", "paid", "successful"].includes(
    status.toLowerCase()
  );
}

export default function DownloadReceiptsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] =
    useState<PaymentReceipt | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const citizenId = user?.idNumber;

    if (!citizenId) {
      setReceipts([]);
      setLoading(false);
      setLoadError("Your citizen ID could not be found. Please sign in again.");
      return;
    }

    setLoading(true);
    setLoadError("");

    const paymentsQuery = query(
      collection(db, "paymentHistory"),
      where("citizenId", "==", citizenId)
    );

    const unsubscribe = onSnapshot(
      paymentsQuery,
      (snapshot) => {
        const records: PaymentReceipt[] = snapshot.docs.map((item) => {
          const data = item.data();

          const rawAmount = Number(data.amount ?? 0);

          return {
            id: item.id,
            reference: String(
              data.reference ?? data.paymentId ?? item.id
            ),
            service: String(
              data.description ?? data.type ?? "Government service payment"
            ),
            date: getPaymentDate(data.createdAt),
            amount: Number.isFinite(rawAmount) ? rawAmount : 0,
            method: getPaymentMethod(data),
            status: String(data.status ?? "unknown"),
            currency: String(data.currency ?? "ZAR"),
            simulated: data.simulated === true,
            fineId: data.fineId ? String(data.fineId) : undefined,
            ticketId: data.ticketId ? String(data.ticketId) : undefined,
            registrationNumber: data.registrationNumber
              ? String(data.registrationNumber)
              : undefined,
          };
        });

        records.sort((a, b) => {
          return (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0);
        });

        setReceipts(records);
        setSelectedReceipt((previous) => {
          if (!previous) return null;
          return records.find((item) => item.id === previous.id) ?? null;
        });

        setLoading(false);
      },
      (error) => {
        console.error("Payment history error:", error);
        setLoadError(
          "We couldn't load your payment records. Please check your connection and try again."
        );
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.idNumber]);

  const successfulReceipts = receipts.filter((receipt) =>
    isSuccessful(receipt.status)
  );

  const totalPaid = successfulReceipts.reduce(
    (total, receipt) => total + receipt.amount,
    0
  );

  const generatePdf = useCallback(async () => {
    if (!selectedReceipt) {
      Alert.alert("Select a receipt", "Please select a payment first.");
      return;
    }

    if (!isSuccessful(selectedReceipt.status)) {
      Alert.alert(
        "Receipt unavailable",
        "A receipt can only be generated for a completed payment."
      );
      return;
    }

    try {
      setDownloading(true);

      const receipt = selectedReceipt;
      const citizenName = user?.fullName || "Citizen";
      const citizenId = user?.idNumber || "Not available";

      const optionalDetails = [
        receipt.ticketId
          ? `<tr><td>Traffic ticket</td><td>${escapeHtml(receipt.ticketId)}</td></tr>`
          : "",
        receipt.registrationNumber
          ? `<tr><td>Vehicle registration</td><td>${escapeHtml(receipt.registrationNumber)}</td></tr>`
          : "",
        receipt.fineId
          ? `<tr><td>Fine record</td><td>${escapeHtml(receipt.fineId)}</td></tr>`
          : "",
      ].join("");

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              * { box-sizing: border-box; }
              body {
                font-family: Arial, Helvetica, sans-serif;
                color: #17212B;
                margin: 0;
                padding: 32px;
                font-size: 12px;
              }
              .header {
                background: #0B4F8A;
                color: white;
                padding: 25px;
                border-radius: 12px;
              }
              .brand { font-size: 23px; font-weight: bold; }
              .subtitle { margin-top: 7px; color: #EAF3FA; }
              .status {
                display: inline-block;
                margin-top: 20px;
                padding: 7px 12px;
                border-radius: 6px;
                background: #ECFDF3;
                color: #18794E;
                font-weight: bold;
              }
              .notice {
                margin-top: 18px;
                padding: 12px;
                background: #FEF3C7;
                color: #92400E;
                border-radius: 7px;
                line-height: 1.5;
              }
              h2 { margin-top: 28px; font-size: 15px; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; }
              td {
                padding: 13px 8px;
                border-bottom: 1px solid #D9E0E6;
                vertical-align: top;
                overflow-wrap: anywhere;
              }
              td:first-child { width: 40%; color: #66737F; }
              td:last-child { font-weight: bold; }
              .total {
                margin-top: 22px;
                padding: 18px;
                background: #EAF3FA;
                border-radius: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              .amount { color: #0B4F8A; font-size: 21px; font-weight: bold; }
              .footer {
                margin-top: 35px;
                padding-top: 15px;
                border-top: 1px solid #D9E0E6;
                color: #66737F;
                line-height: 1.6;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="brand">TrafficConnect SA</div>
              <div class="subtitle">Payment receipt and transaction record</div>
              <div class="status">PAYMENT ${escapeHtml(receipt.status.toUpperCase())}</div>
            </div>

            ${
              receipt.simulated
                ? `<div class="notice"><strong>DEMO TRANSACTION:</strong> This record was marked as simulated by the application. It is not proof that real money was transferred.</div>`
                : ""
            }

            <h2>Receipt details</h2>
            <table>
              <tr><td>Payment reference</td><td>${escapeHtml(receipt.reference)}</td></tr>
              <tr><td>Payment date</td><td>${escapeHtml(formatDate(receipt.date))}</td></tr>
              <tr><td>Service / description</td><td>${escapeHtml(receipt.service)}</td></tr>
              <tr><td>Payment method</td><td>${escapeHtml(receipt.method)}</td></tr>
              <tr><td>Citizen name</td><td>${escapeHtml(citizenName)}</td></tr>
              <tr><td>Citizen ID</td><td>${escapeHtml(citizenId)}</td></tr>
              ${optionalDetails}
            </table>

            <div class="total">
              <span>Total recorded</span>
              <span class="amount">${escapeHtml(formatAmount(receipt.amount, receipt.currency))}</span>
            </div>

            <div class="footer">
              <strong>Important information</strong><br />
              This document was generated from the payment record available in
              TrafficConnect SA. It is not a government-issued tax invoice or
              proof of bank settlement. Verify the transaction with the relevant
              payment provider where necessary.
              <br /><br />
              Generated on ${escapeHtml(formatDate(new Date()))}
            </div>
          </body>
        </html>
      `;

      const file = await Print.printToFileAsync({ html });

      const sharingAvailable = await Sharing.isAvailableAsync();

      if (sharingAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
          dialogTitle: `Receipt ${receipt.reference}`,
        });
      } else {
        Alert.alert(
          "PDF created",
          `Your PDF was created at:\n${file.uri}\n\nThis device does not support the sharing menu.`
        );
      }
    } catch (error) {
      console.error("Receipt PDF error:", error);
      Alert.alert(
        "PDF generation failed",
        "We couldn't generate or share this receipt. Please try again."
      );
    } finally {
      setDownloading(false);
    }
  }, [selectedReceipt, user?.fullName, user?.idNumber]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Download Receipts</Text>
            <Text style={styles.headerSubtitle}>
              Your recorded payment transactions
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons
                name="file-pdf-box"
                size={32}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.heroInformation}>
              <Text style={styles.heroTitle}>Your payment receipts</Text>
              <Text style={styles.heroDescription}>
                Select a completed transaction to create and share its PDF receipt.
              </Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Ionicons
                name="wallet-outline"
                size={22}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.summaryText}>
              <Text style={styles.summaryLabel}>Total recorded as paid</Text>
              <Text style={styles.summaryAmount}>
                {formatAmount(totalPaid)}
              </Text>
              <Text style={styles.summaryCaption}>
                {successfulReceipts.length} completed payment
                {successfulReceipts.length === 1 ? "" : "s"}
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment history</Text>
            <Text style={styles.sectionDescription}>
              Choose a transaction to view its details.
            </Text>
          </View>

          {loading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.stateText}>Loading your payment history...</Text>
            </View>
          ) : loadError ? (
            <View style={styles.stateCard}>
              <Ionicons
                name="alert-circle-outline"
                size={34}
                color="#B42318"
              />
              <Text style={styles.stateTitle}>Unable to load receipts</Text>
              <Text style={styles.stateText}>{loadError}</Text>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setLoadError("");
                  setLoading(true);
                  // The Firestore listener will also report any connection error.
                }}
              >
                <Text style={styles.secondaryButtonText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : receipts.length === 0 ? (
            <View style={styles.stateCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="receipt-outline"
                  size={31}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.stateTitle}>No payment records yet</Text>
              <Text style={styles.stateText}>
                Completed payments associated with your citizen account will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.receiptsCard}>
              {receipts.map((receipt, index) => {
                const selected = selectedReceipt?.id === receipt.id;
                const completed = isSuccessful(receipt.status);

                return (
                  <React.Fragment key={receipt.id}>
                    <TouchableOpacity
                      style={[
                        styles.receiptItem,
                        selected && styles.receiptItemSelected,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => setSelectedReceipt(receipt)}
                    >
                      <View
                        style={[
                          styles.receiptIcon,
                          selected && styles.receiptIconSelected,
                        ]}
                      >
                        <Ionicons
                          name="document-text-outline"
                          size={21}
                          color={selected ? "#FFFFFF" : COLORS.primary}
                        />
                      </View>

                      <View style={styles.receiptInformation}>
                        <Text style={styles.receiptService} numberOfLines={2}>
                          {receipt.service}
                        </Text>
                        <Text style={styles.receiptReference} numberOfLines={1}>
                          Ref: {receipt.reference}
                        </Text>
                        <Text style={styles.receiptDate}>
                          {formatDate(receipt.date)}
                        </Text>
                        {receipt.simulated && (
                          <Text style={styles.simulatedText}>Demo transaction</Text>
                        )}
                      </View>

                      <View style={styles.receiptRight}>
                        <Text style={styles.receiptAmount}>
                          {formatAmount(receipt.amount, receipt.currency)}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            completed ? styles.paidBadge : styles.otherBadge,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              completed ? styles.paidText : styles.otherStatusText,
                            ]}
                          >
                            {receipt.status}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {index < receipts.length - 1 && (
                      <View style={styles.divider} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          )}

          {selectedReceipt && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Receipt details</Text>
                <Text style={styles.sectionDescription}>
                  Review the selected transaction before creating its PDF.
                </Text>
              </View>

              <View style={styles.detailsCard}>
                <View style={styles.detailsHeader}>
                  <View style={styles.detailsDocumentIcon}>
                    <Ionicons
                      name="receipt-outline"
                      size={23}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={styles.detailsHeaderInformation}>
                    <Text style={styles.detailsTitle}>Payment record</Text>
                    <Text style={styles.detailsReference} numberOfLines={2}>
                      {selectedReceipt.reference}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      isSuccessful(selectedReceipt.status)
                        ? styles.paidBadge
                        : styles.otherBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isSuccessful(selectedReceipt.status)
                          ? styles.paidText
                          : styles.otherStatusText,
                      ]}
                    >
                      {selectedReceipt.status}
                    </Text>
                  </View>
                </View>

                {selectedReceipt.simulated && (
                  <View style={styles.demoNotice}>
                    <Ionicons
                      name="information-circle-outline"
                      size={19}
                      color={COLORS.warning}
                    />
                    <Text style={styles.demoNoticeText}>
                      This is a simulated demo transaction, not a verified real-money payment.
                    </Text>
                  </View>
                )}

                <View style={styles.detailsDivider} />

                <DetailRow label="Service" value={selectedReceipt.service} />
                <DetailRow
                  label="Payment date"
                  value={formatDate(selectedReceipt.date)}
                />
                <DetailRow
                  label="Payment method"
                  value={selectedReceipt.method}
                />
                <DetailRow
                  label="Citizen name"
                  value={user?.fullName || "Not available"}
                />
                {selectedReceipt.ticketId && (
                  <DetailRow
                    label="Ticket number"
                    value={selectedReceipt.ticketId}
                  />
                )}
                {selectedReceipt.registrationNumber && (
                  <DetailRow
                    label="Vehicle registration"
                    value={selectedReceipt.registrationNumber}
                  />
                )}

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total recorded</Text>
                  <Text style={styles.totalValue}>
                    {formatAmount(
                      selectedReceipt.amount,
                      selectedReceipt.currency
                    )}
                  </Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.securityCard}>
            <View style={styles.securityIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color={COLORS.success}
              />
            </View>
            <View style={styles.securityInformation}>
              <Text style={styles.securityTitle}>About your PDF</Text>
              <Text style={styles.securityDescription}>
                The PDF contains the transaction information stored in your account.
                Demo transactions are labelled clearly. Keep your downloaded file secure.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.downloadButton,
              (!selectedReceipt ||
                downloading ||
                !isSuccessful(selectedReceipt.status)) &&
                styles.downloadButtonDisabled,
            ]}
            activeOpacity={0.85}
            disabled={
              !selectedReceipt ||
              downloading ||
              !isSuccessful(selectedReceipt.status)
            }
            onPress={generatePdf}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="download-outline"
                  size={21}
                  color="#FFFFFF"
                />
                <Text style={styles.downloadButtonText}>
                  Generate and share PDF
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            activeOpacity={0.8}
            disabled={downloading}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Ionicons
              name="document-outline"
              size={14}
              color={COLORS.textLight}
            />
            <Text style={styles.footerText}>
              Generated receipts reflect the records currently stored in TrafficConnect SA.
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

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
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.text,
  },
  headerSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.textLight,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 35,
  },
  heroCard: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  heroInformation: {
    flex: 1,
    marginLeft: 14,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroDescription: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: "#DCEBFA",
  },
  summaryCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryText: {
    flex: 1,
    marginLeft: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  summaryAmount: {
    marginTop: 3,
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.primary,
  },
  summaryCaption: {
    marginTop: 3,
    fontSize: 11,
    color: COLORS.textLight,
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
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textLight,
  },
  receiptsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 17,
    padding: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  receiptItem: {
    minHeight: 86,
    paddingHorizontal: 9,
    paddingVertical: 11,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  receiptItemSelected: {
    backgroundColor: COLORS.softBlue,
  },
  receiptIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  receiptIconSelected: {
    backgroundColor: COLORS.primary,
  },
  receiptInformation: {
    flex: 1,
    marginLeft: 11,
    paddingRight: 6,
  },
  receiptService: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  receiptReference: {
    marginTop: 4,
    fontSize: 10,
    color: COLORS.textLight,
  },
  receiptDate: {
    marginTop: 3,
    fontSize: 10,
    color: COLORS.textLight,
  },
  simulatedText: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.warning,
  },
  receiptRight: {
    alignItems: "flex-end",
    maxWidth: 115,
  },
  receiptAmount: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primary,
  },
  statusBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    alignSelf: "flex-start",
  },
  paidBadge: {
    backgroundColor: COLORS.softGreen,
  },
  otherBadge: {
    backgroundColor: COLORS.softWarning,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  paidText: {
    color: COLORS.success,
  },
  otherStatusText: {
    color: COLORS.warning,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 9,
  },
  stateCard: {
    padding: 24,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  stateTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },
  stateText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.textLight,
    textAlign: "center",
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.softBlue,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  detailsCard: {
    padding: 17,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailsHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailsDocumentIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsHeaderInformation: {
    flex: 1,
    marginLeft: 11,
    marginRight: 7,
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },
  detailsReference: {
    marginTop: 4,
    fontSize: 10,
    color: COLORS.textLight,
  },
  demoNotice: {
    marginTop: 15,
    padding: 11,
    borderRadius: 10,
    backgroundColor: COLORS.softWarning,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  demoNoticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.warning,
  },
  detailsDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 13,
    gap: 12,
  },
  detailLabel: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textLight,
  },
  detailValue: {
    flex: 1.4,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "right",
  },
  totalRow: {
    marginTop: 3,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.primary,
  },
  securityCard: {
    marginTop: 17,
    padding: 15,
    borderRadius: 16,
    backgroundColor: COLORS.softGreen,
    flexDirection: "row",
    alignItems: "flex-start",
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
    marginTop: 4,
    fontSize: 11,
    lineHeight: 17,
    color: "#3D6B56",
  },
  downloadButton: {
    minHeight: 54,
    marginTop: 22,
    paddingHorizontal: 14,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  downloadButtonDisabled: {
    opacity: 0.45,
  },
  downloadButtonText: {
    fontSize: 14,
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
  footer: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 6,
  },
  footerText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.textLight,
    textAlign: "center",
  },
});
