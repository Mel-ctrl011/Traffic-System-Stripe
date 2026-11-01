import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  Modal,
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
  warning: "#9A6700",
  softYellow: "#FFF7E6",
  danger: "#B42318",
  softRed: "#FEF3F2",
};

/* =========================================================
   TYPES
========================================================= */

type PaymentRecord = {
  id: string;
  paymentId?: string;
  reference?: string;
  type?: string;
  description?: string;

  citizenId?: string;
  userId?: string;
  citizenName?: string;

  fineId?: string;
  ticketId?: string;
  registrationNumber?: string;

  amount?: number | string;
  currency?: string;

  method?: string;
  methodLabel?: string;

  status?: string;
  simulated?: boolean;

  createdAt?: any;
  paidAt?: any;
  updatedAt?: any;

  [key: string]: any;
};

type FilterType = "All" | "Paid" | "Pending" | "Failed";

/* =========================================================
   HELPERS
========================================================= */

function parseDate(value: any): Date | null {
  if (!value) return null;

  try {
    let date: Date;

    if (typeof value?.toDate === "function") {
      date = value.toDate();
    } else if (typeof value === "number") {
      date = new Date(value);
    } else if (typeof value === "string") {
      date = new Date(value);
    } else if (value instanceof Date) {
      date = value;
    } else {
      return null;
    }

    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function formatDate(value: any): string {
  const date = parseDate(value);

  if (!date) return "Date unavailable";

  return date.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: any): string {
  const date = parseDate(value);

  if (!date) return "Date unavailable";

  return date.toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getAmount(payment: PaymentRecord): number {
  const amount = Number(payment.amount ?? 0);

  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function normalizeStatus(payment: PaymentRecord): string {
  const status = String(payment.status ?? "").trim().toLowerCase();

  if (
    ["paid", "completed", "successful", "success", "settled"].includes(status)
  ) {
    return "Paid";
  }

  if (
    ["pending", "processing", "initiated", "awaiting_payment"].includes(status)
  ) {
    return "Pending";
  }

  if (
    ["failed", "declined", "cancelled", "canceled", "error"].includes(status)
  ) {
    return "Failed";
  }

  if (["refunded", "reversed"].includes(status)) {
    return "Refunded";
  }

  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
}

function isSuccessful(payment: PaymentRecord): boolean {
  return normalizeStatus(payment) === "Paid";
}

function getPaymentTitle(payment: PaymentRecord): string {
  if (payment.description?.trim()) {
    return payment.description.trim();
  }

  const type = String(payment.type ?? "").toLowerCase();

  if (type.includes("traffic_fine") || type.includes("fine")) {
    return "Traffic fine payment";
  }

  if (type.includes("driver") || type.includes("licence")) {
    return "Driver's licence service";
  }

  if (type.includes("vehicle")) {
    return "Vehicle service payment";
  }

  if (type.includes("appointment")) {
    return "Appointment payment";
  }

  return "TrafficConnect payment";
}

function getPaymentMethod(payment: PaymentRecord): string {
  if (payment.methodLabel?.trim()) {
    return payment.methodLabel;
  }

  const method = String(payment.method ?? "").toLowerCase();

  switch (method) {
    case "card":
      return "Card";

    case "eft":
    case "instant_eft":
      return "Instant EFT";

    case "wallet":
      return "Digital wallet";

    case "cash":
      return "Cash";

    default:
      return method
        ? method
            .split(/[_\s-]+/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        : "Not specified";
  }
}

function getReference(payment: PaymentRecord): string {
  return (
    payment.reference ??
    payment.paymentReference ??
    payment.paymentId ??
    payment.id
  );
}

/* =========================================================
   SCREEN
========================================================= */

export default function PaymentHistoryScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("All");
  const [selectedPayment, setSelectedPayment] =
    useState<PaymentRecord | null>(null);

  const citizenId = user?.idNumber;

  /* =======================================================
     LIVE FIRESTORE LISTENER

     Uses the same citizenId field as OutstandingPenalties.
     New paymentHistory records appear automatically.
  ======================================================= */

  useEffect(() => {
    if (!citizenId) {
      setPayments([]);
      setLoading(false);
      setRefreshing(false);
      setErrorMessage("");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const paymentsQuery = query(
      collection(db, "paymentHistory"),
      where("citizenId", "==", citizenId)
    );

    const unsubscribe = onSnapshot(
      paymentsQuery,
      (snapshot) => {
        const records: PaymentRecord[] = snapshot.docs.map((paymentDoc) => ({
          ...paymentDoc.data(),
          id: paymentDoc.id,
        })) as PaymentRecord[];

        records.sort((a, b) => {
          const dateA = parseDate(
            a.createdAt ?? a.paidAt ?? a.updatedAt
          )?.getTime() ?? 0;

          const dateB = parseDate(
            b.createdAt ?? b.paidAt ?? b.updatedAt
          )?.getTime() ?? 0;

          return dateB - dateA;
        });

        setPayments(records);
        setErrorMessage("");
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error("PAYMENT HISTORY ERROR:", error);

        setErrorMessage(
          "We couldn't load your payment records. Please check your connection and try again."
        );

        setLoading(false);
        setRefreshing(false);
      }
    );

    return unsubscribe;
  }, [citizenId]);

  /* =======================================================
     TOTALS

     Only successful transactions count towards Total paid.
  ======================================================= */

  const successfulPayments = useMemo(
    () => payments.filter(isSuccessful),
    [payments]
  );

  const totalPaid = useMemo(
    () =>
      successfulPayments.reduce(
        (total, payment) => total + getAmount(payment),
        0
      ),
    [successfulPayments]
  );

  const pendingCount = useMemo(
    () => payments.filter((payment) => normalizeStatus(payment) === "Pending").length,
    [payments]
  );

  const failedCount = useMemo(
    () => payments.filter((payment) => normalizeStatus(payment) === "Failed").length,
    [payments]
  );

  const filteredPayments = useMemo(() => {
    if (selectedFilter === "All") return payments;

    return payments.filter(
      (payment) => normalizeStatus(payment) === selectedFilter
    );
  }, [payments, selectedFilter]);

  const handleRefresh = () => {
    // The live listener already retrieves the latest Firestore data.
    // This indicator gives the user visible refresh feedback.
    setRefreshing(true);

    // The listener callback will turn refreshing off when it updates.
    // If there are no new updates, allow the existing snapshot to remain.
    setTimeout(() => setRefreshing(false), 800);
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <MaterialCommunityIcons
              name="receipt-text-clock-outline"
              size={30}
              color={COLORS.primary}
            />
          </View>

          <ActivityIndicator color={COLORS.primary} size="small" />

          <Text style={styles.loadingTitle}>Loading payment history</Text>

          <Text style={styles.loadingText}>
            Retrieving your recorded transactions...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* =======================================================
     MAIN UI
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
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.headerInformation}>
            <Text style={styles.headerTitle}>Payment History</Text>
            <Text style={styles.headerSubtitle}>
              Your recorded transactions
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <MaterialCommunityIcons
              name="history"
              size={23}
              color={COLORS.primary}
            />
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
        >
          {/* ACCOUNT */}

          <View style={styles.accountCard}>
            <View style={styles.accountIcon}>
              <Ionicons
                name="person-outline"
                size={21}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.accountInformation}>
              <Text style={styles.accountLabel}>CITIZEN ACCOUNT</Text>
              <Text style={styles.accountName} numberOfLines={1}>
                {user?.fullName ?? "Citizen"}
              </Text>
              <Text style={styles.accountDescription}>
                Your payment records are linked to your account.
              </Text>
            </View>

            <MaterialCommunityIcons
              name="shield-check-outline"
              size={22}
              color={COLORS.success}
            />
          </View>

          {/* ERROR */}

          {!!errorMessage && (
            <View style={styles.errorCard}>
              <Ionicons
                name="alert-circle-outline"
                size={22}
                color={COLORS.danger}
              />

              <View style={styles.errorInformation}>
                <Text style={styles.errorTitle}>Unable to load history</Text>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setLoading(true);
                  setErrorMessage("");
                }}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* SUMMARY */}

          <View style={styles.summaryCard}>
            <View style={styles.summaryTopRow}>
              <View style={styles.summaryIcon}>
                <MaterialCommunityIcons
                  name="wallet-outline"
                  size={25}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.summaryBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.summaryBadgeText}>Live records</Text>
              </View>
            </View>

            <Text style={styles.summaryLabel}>Total paid</Text>

            <Text style={styles.summaryAmount}>
              {formatCurrency(totalPaid)}
            </Text>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryBottomRow}>
              <View>
                <Text style={styles.summaryMetricValue}>
                  {successfulPayments.length}
                </Text>
                <Text style={styles.summaryMetricLabel}>
                  Successful payments
                </Text>
              </View>

              <View style={styles.summaryBottomDivider} />

              <View>
                <Text style={styles.summaryMetricValue}>
                  {payments.length}
                </Text>
                <Text style={styles.summaryMetricLabel}>
                  Total transactions
                </Text>
              </View>
            </View>
          </View>

          {/* TRANSACTION STATUS STATS */}

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, styles.paidIcon]}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color={COLORS.success}
                />
              </View>
              <Text style={styles.statNumber}>
                {successfulPayments.length}
              </Text>
              <Text style={styles.statLabel}>Paid</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, styles.pendingIcon]}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={COLORS.warning}
                />
              </View>
              <Text style={styles.statNumber}>{pendingCount}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, styles.failedIcon]}>
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color={COLORS.danger}
                />
              </View>
              <Text style={styles.statNumber}>{failedCount}</Text>
              <Text style={styles.statLabel}>Failed</Text>
            </View>
          </View>

          {/* TRANSACTIONS HEADER */}

          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Transactions</Text>
              <Text style={styles.sectionDescription}>
                Your latest recorded payment activity.
              </Text>
            </View>

            <Text style={styles.recordCount}>
              {filteredPayments.length}
            </Text>
          </View>

          {/* FILTERS */}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {(["All", "Paid", "Pending", "Failed"] as FilterType[]).map(
              (filter) => {
                const active = selectedFilter === filter;

                return (
                  <TouchableOpacity
                    key={filter}
                    activeOpacity={0.8}
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedFilter(filter)}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        active && styles.filterTextActive,
                      ]}
                    >
                      {filter}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </ScrollView>

          {/* PAYMENT LIST */}

          {!citizenId ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="person-outline"
                  size={30}
                  color={COLORS.primary}
                />
              </View>

              <Text style={styles.emptyTitle}>Citizen account unavailable</Text>

              <Text style={styles.emptyText}>
                We couldn't identify your citizen account. Please sign in again
                to view your payment history.
              </Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={30}
                  color={COLORS.textLight}
                />
              </View>

              <Text style={styles.emptyTitle}>Records unavailable</Text>
              <Text style={styles.emptyText}>
                Your transaction history could not be retrieved.
              </Text>
            </View>
          ) : filteredPayments.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons
                  name="receipt-text-clock-outline"
                  size={32}
                  color={COLORS.primary}
                />
              </View>

              <Text style={styles.emptyTitle}>
                {payments.length === 0
                  ? "No payment history yet"
                  : `No ${selectedFilter.toLowerCase()} transactions`}
              </Text>

              <Text style={styles.emptyText}>
                {payments.length === 0
                  ? "When a payment is recorded against your citizen account, it will appear here automatically."
                  : "Try another filter to view your other recorded transactions."}
              </Text>

              {selectedFilter !== "All" && payments.length > 0 && (
                <TouchableOpacity
                  style={styles.emptyAction}
                  onPress={() => setSelectedFilter("All")}
                >
                  <Text style={styles.emptyActionText}>
                    View all transactions
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.paymentList}>
              {filteredPayments.map((payment, index) => {
                const status = normalizeStatus(payment);
                const paid = status === "Paid";
                const pending = status === "Pending";
                const refunded = status === "Refunded";

                const statusStyle = paid
                  ? styles.paidBadge
                  : pending
                  ? styles.pendingBadge
                  : refunded
                  ? styles.refundedBadge
                  : styles.failedBadge;

                const statusTextStyle = paid
                  ? styles.paidText
                  : pending
                  ? styles.pendingText
                  : refunded
                  ? styles.refundedText
                  : styles.failedText;

                const method = getPaymentMethod(payment);
                const title = getPaymentTitle(payment);
                const date = formatDate(
                  payment.createdAt ?? payment.paidAt ?? payment.updatedAt
                );

                return (
                  <React.Fragment key={payment.id}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.paymentCard}
                      onPress={() => setSelectedPayment(payment)}
                    >
                      <View style={styles.paymentIcon}>
                        <MaterialCommunityIcons
                          name={
                            method.toLowerCase().includes("eft") ||
                            method.toLowerCase().includes("bank")
                              ? "bank-transfer"
                              : method.toLowerCase().includes("wallet")
                              ? "wallet-outline"
                              : "credit-card-outline"
                          }
                          size={22}
                          color={COLORS.primary}
                        />
                      </View>

                      <View style={styles.paymentInformation}>
                        <Text
                          style={styles.paymentTitle}
                          numberOfLines={2}
                        >
                          {title}
                        </Text>

                        <Text style={styles.paymentReference} numberOfLines={1}>
                          Ref: {getReference(payment)}
                        </Text>

                        <View style={styles.paymentMeta}>
                          <Ionicons
                            name="calendar-outline"
                            size={12}
                            color={COLORS.textLight}
                          />
                          <Text style={styles.paymentDate}>{date}</Text>
                        </View>

                        <View style={styles.paymentBottomRow}>
                          <Text style={styles.paymentMethod} numberOfLines={1}>
                            {method}
                          </Text>

                          {payment.simulated === true && (
                            <Text style={styles.simulatedTag}>SIMULATED</Text>
                          )}
                        </View>
                      </View>

                      <View style={styles.paymentRight}>
                        <Text style={styles.paymentAmount}>
                          {formatCurrency(getAmount(payment))}
                        </Text>

                        <View style={[styles.statusBadge, statusStyle]}>
                          <View
                            style={[
                              styles.statusDot,
                              paid
                                ? styles.paidDot
                                : pending
                                ? styles.pendingDot
                                : refunded
                                ? styles.refundedDot
                                : styles.failedDot,
                            ]}
                          />
                          <Text style={[styles.statusText, statusTextStyle]}>
                            {status}
                          </Text>
                        </View>

                        <Ionicons
                          name="chevron-forward"
                          size={15}
                          color={COLORS.textLight}
                          style={styles.paymentChevron}
                        />
                      </View>
                    </TouchableOpacity>

                    {index < filteredPayments.length - 1 && (
                      <View style={styles.divider} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          )}

          {/* SIMULATION NOTICE */}

          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="information-circle-outline"
                size={21}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.infoInformation}>
              <Text style={styles.infoTitle}>About your payment records</Text>
              <Text style={styles.infoText}>
                This history displays transactions recorded by TrafficConnect.
                Transactions marked “Simulated” are demonstration payments;
                no real money was transferred.
              </Text>
            </View>
          </View>

          {/* FOOTER */}

          <View style={styles.footer}>
            <Ionicons
              name="shield-checkmark-outline"
              size={15}
              color={COLORS.textLight}
            />
            <Text style={styles.footerText}>
              Records shown are associated with your signed-in citizen account.
            </Text>
          </View>
        </ScrollView>

        {/* =================================================
            TRANSACTION DETAILS MODAL
        ================================================= */}

        <Modal
          visible={!!selectedPayment}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedPayment(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <MaterialCommunityIcons
                    name="receipt-text-check-outline"
                    size={25}
                    color={COLORS.primary}
                  />
                </View>

                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setSelectedPayment(null)}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={COLORS.textLight}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalTitle}>Transaction details</Text>

              <Text style={styles.modalSubtitle}>
                {selectedPayment
                  ? getPaymentTitle(selectedPayment)
                  : ""}
              </Text>

              <View style={styles.modalAmountBox}>
                <Text style={styles.modalAmountLabel}>Transaction amount</Text>
                <Text style={styles.modalAmount}>
                  {formatCurrency(
                    selectedPayment ? getAmount(selectedPayment) : 0
                  )}
                </Text>

                {selectedPayment && (
                  <View
                    style={[
                      styles.statusBadge,
                      normalizeStatus(selectedPayment) === "Paid"
                        ? styles.paidBadge
                        : normalizeStatus(selectedPayment) === "Pending"
                        ? styles.pendingBadge
                        : normalizeStatus(selectedPayment) === "Refunded"
                        ? styles.refundedBadge
                        : styles.failedBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        normalizeStatus(selectedPayment) === "Paid"
                          ? styles.paidText
                          : normalizeStatus(selectedPayment) === "Pending"
                          ? styles.pendingText
                          : normalizeStatus(selectedPayment) === "Refunded"
                          ? styles.refundedText
                          : styles.failedText,
                      ]}
                    >
                      {normalizeStatus(selectedPayment)}
                    </Text>
                  </View>
                )}
              </View>

              {selectedPayment && (
                <View style={styles.detailsBox}>
                  <DetailRow
                    label="Payment reference"
                    value={getReference(selectedPayment)}
                  />

                  <DetailRow
                    label="Payment method"
                    value={getPaymentMethod(selectedPayment)}
                  />

                  <DetailRow
                    label="Date and time"
                    value={formatDateTime(
                      selectedPayment.createdAt ??
                        selectedPayment.paidAt ??
                        selectedPayment.updatedAt
                    )}
                  />

                  {!!selectedPayment.ticketId && (
                    <DetailRow
                      label="Fine / ticket reference"
                      value={selectedPayment.ticketId}
                    />
                  )}

                  {!!selectedPayment.registrationNumber && (
                    <DetailRow
                      label="Vehicle registration"
                      value={selectedPayment.registrationNumber}
                    />
                  )}

                  {!!selectedPayment.type && (
                    <DetailRow
                      label="Transaction type"
                      value={selectedPayment.type
                        .replace(/[_-]/g, " ")
                        .replace(/\b\w/g, (letter: string) =>
                          letter.toUpperCase()
                        )}
                    />
                  )}

                  <DetailRow
                    label="Currency"
                    value={selectedPayment.currency ?? "ZAR"}
                  />
                </View>
              )}

              {selectedPayment?.simulated === true && (
                <View style={styles.modalNotice}>
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color={COLORS.warning}
                  />
                  <Text style={styles.modalNoticeText}>
                    This is a simulated transaction. No real money was moved.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.doneButton}
                activeOpacity={0.8}
                onPress={() => setSelectedPayment(null)}
              >
                <Text style={styles.doneButtonText}>Close details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

/* =========================================================
   DETAIL ROW
========================================================= */

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
    backgroundColor: COLORS.background,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: COLORS.background,
  },

  loadingIcon: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  loadingTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
  },

  loadingText: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: "center",
  },

  /* HEADER */

  header: {
    minHeight: 76,
    paddingHorizontal: 18,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  headerInformation: {
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

  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 35,
  },

  /* ACCOUNT */

  accountCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  accountInformation: {
    flex: 1,
    marginRight: 8,
  },

  accountLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.textLight,
    marginBottom: 3,
  },

  accountName: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  accountDescription: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.textLight,
  },

  /* ERROR */

  errorCard: {
    padding: 14,
    marginBottom: 15,
    borderRadius: 14,
    backgroundColor: COLORS.softRed,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  errorInformation: {
    flex: 1,
  },

  errorTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.danger,
  },

  errorText: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.text,
  },

  retryText: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: 12,
  },

  /* SUMMARY */

  summaryCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 19,
    padding: 19,
    marginBottom: 13,
  },

  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 17,
  },

  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.softGreen,
    gap: 5,
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },

  summaryBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.success,
  },

  summaryLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },

  summaryAmount: {
    marginTop: 5,
    fontSize: 30,
    fontWeight: "900",
    color: COLORS.primary,
    letterSpacing: -0.5,
  },

  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 17,
  },

  summaryBottomRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  summaryBottomDivider: {
    width: 1,
    height: 33,
    backgroundColor: COLORS.border,
    marginHorizontal: 25,
  },

  summaryMetricValue: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },

  summaryMetricLabel: {
    marginTop: 3,
    fontSize: 10,
    color: COLORS.textLight,
  },

  /* STATS */

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 27,
  },

  statCard: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  statIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  paidIcon: {
    backgroundColor: COLORS.softGreen,
  },

  pendingIcon: {
    backgroundColor: COLORS.softYellow,
  },

  failedIcon: {
    backgroundColor: COLORS.softRed,
  },

  statNumber: {
    fontSize: 21,
    fontWeight: "800",
    color: COLORS.text,
  },

  statLabel: {
    marginTop: 3,
    fontSize: 11,
    color: COLORS.textLight,
  },

  /* TRANSACTION HEADER */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  sectionHeading: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.text,
  },

  sectionDescription: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textLight,
  },

  recordCount: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 10,
    overflow: "hidden",
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: COLORS.softBlue,
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 30,
  },

  /* FILTERS */

  filterRow: {
    paddingBottom: 14,
    gap: 8,
  },

  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  filterText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textLight,
  },

  filterTextActive: {
    color: "#FFFFFF",
  },

  /* PAYMENT LIST */

  paymentList: {
    paddingHorizontal: 10,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  paymentCard: {
    minHeight: 112,
    paddingVertical: 15,
    paddingHorizontal: 2,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  paymentIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  paymentInformation: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
    marginRight: 7,
  },

  paymentTitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    color: COLORS.text,
  },

  paymentReference: {
    marginTop: 4,
    fontSize: 10,
    color: COLORS.textLight,
  },

  paymentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },

  paymentDate: {
    fontSize: 10,
    color: COLORS.textLight,
  },

  paymentBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 6,
    gap: 6,
  },

  paymentMethod: {
    fontSize: 10,
    color: COLORS.textLight,
  },

  simulatedTag: {
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.warning,
    backgroundColor: COLORS.softYellow,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 5,
    overflow: "hidden",
  },

  paymentRight: {
    minWidth: 76,
    maxWidth: 105,
    alignItems: "flex-end",
  },

  paymentAmount: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primary,
    textAlign: "right",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 7,
    marginTop: 7,
    gap: 4,
  },

  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  statusText: {
    fontSize: 9,
    fontWeight: "800",
  },

  paidBadge: {
    backgroundColor: COLORS.softGreen,
  },

  paidDot: {
    backgroundColor: COLORS.success,
  },

  paidText: {
    color: COLORS.success,
  },

  pendingBadge: {
    backgroundColor: COLORS.softYellow,
  },

  pendingDot: {
    backgroundColor: COLORS.warning,
  },

  pendingText: {
    color: COLORS.warning,
  },

  failedBadge: {
    backgroundColor: COLORS.softRed,
  },

  failedDot: {
    backgroundColor: COLORS.danger,
  },

  failedText: {
    color: COLORS.danger,
  },

  refundedBadge: {
    backgroundColor: COLORS.softBlue,
  },

  refundedDot: {
    backgroundColor: COLORS.primary,
  },

  refundedText: {
    color: COLORS.primary,
  },

  paymentChevron: {
    marginTop: 7,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 2,
  },

  /* EMPTY */

  emptyCard: {
    paddingHorizontal: 25,
    paddingVertical: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    backgroundColor: COLORS.card,
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.softBlue,
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },

  emptyText: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.textLight,
    textAlign: "center",
  },

  emptyAction: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },

  emptyActionText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  /* INFO */

  infoCard: {
    marginTop: 18,
    padding: 14,
    borderRadius: 15,
    backgroundColor: COLORS.softBlue,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  infoIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },

  infoInformation: {
    flex: 1,
    marginLeft: 10,
  },

  infoTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primaryDark,
  },

  infoText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textLight,
  },

  /* FOOTER */

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    gap: 6,
  },

  footerText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.textLight,
    textAlign: "center",
  },

  /* DETAILS MODAL */

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(13, 29, 43, 0.48)",
    justifyContent: "flex-end",
  },

  modalSheet: {
    paddingHorizontal: 21,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    backgroundColor: COLORS.card,
  },

  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    backgroundColor: COLORS.border,
    marginBottom: 18,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  modalIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.softBlue,
  },

  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },

  modalTitle: {
    marginTop: 15,
    fontSize: 21,
    fontWeight: "800",
    color: COLORS.text,
  },

  modalSubtitle: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textLight,
  },

  modalAmountBox: {
    marginTop: 17,
    padding: 17,
    alignItems: "center",
    borderRadius: 15,
    backgroundColor: COLORS.background,
  },

  modalAmountLabel: {
    fontSize: 11,
    color: COLORS.textLight,
  },

  modalAmount: {
    marginTop: 5,
    marginBottom: 8,
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.primary,
  },

  detailsBox: {
    marginTop: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  detailRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },

  detailLabel: {
    flex: 0.8,
    fontSize: 11,
    color: COLORS.textLight,
  },

  detailValue: {
    flex: 1.2,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "right",
  },

  modalNotice: {
    marginTop: 14,
    padding: 11,
    borderRadius: 11,
    backgroundColor: COLORS.softYellow,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  modalNoticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.warning,
  },

  doneButton: {
    marginTop: 17,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  doneButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});