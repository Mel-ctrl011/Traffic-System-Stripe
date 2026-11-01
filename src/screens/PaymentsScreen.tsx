
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../services/firebase";
import { useAuth } from "../context/AuthContext";

/* =========================================================
   TYPES
========================================================= */

type FineStatus = "Outstanding" | "Overdue" | "Paid" | "Disputed";

type TransactionStatus =
  | "Completed"
  | "Pending"
  | "Failed"
  | "Other";

type FineRecord = {
  id: string;
  citizenId?: string;
  amount?: number | string;
  fineAmount?: number | string;
  outstandingAmount?: number | string;
  status?: string;
  paymentStatus?: string;
  dueDate?: any;
  paidAt?: any;
  [key: string]: any;
};

type PaymentRecord = {
  id: string;
  userId?: string;
  amount?: number | string;
  currency?: string;
  description?: string;
  method?: string;
  status?: string;
  createdAt?: any;
  paidAt?: any;
  receiptId?: string;
  requestId?: string;
  source?: string;
  sourceId?: string;
  verificationCode?: string;
  [key: string]: any;
};

type DisplayFine = FineRecord & {
  displayStatus: FineStatus;
};

type DisplayPayment = PaymentRecord & {
  displayStatus: TransactionStatus;
};

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
  softGrey: "#F3F5F7",
};

/* =========================================================
   HELPERS
========================================================= */

function parseDate(value: any): Date | null {
  if (!value) return null;

  try {
    const date =
      typeof value?.toDate === "function"
        ? value.toDate()
        : value instanceof Date
          ? value
          : typeof value === "number"
            ? new Date(value)
            : typeof value === "object" && value.seconds
              ? new Date(value.seconds * 1000)
              : new Date(value);

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

function formatCurrency(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getAmount(value: any): number {
  const amount = Number(value ?? 0);

  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function getFineAmount(fine: FineRecord): number {
  return getAmount(
    fine.outstandingAmount ?? fine.fineAmount ?? fine.amount ?? 0
  );
}

function getFineStatus(fine: FineRecord): FineStatus {
  const paymentStatus = String(
    fine.paymentStatus ?? ""
  ).toLowerCase().trim();

  const status = String(
    fine.status ?? ""
  ).toLowerCase().trim();

  if (
    ["paid", "settled", "completed", "success", "successful"].includes(
      paymentStatus
    ) ||
    ["paid", "settled", "completed"].includes(status)
  ) {
    return "Paid";
  }

  if (
    paymentStatus.includes("disput") ||
    status.includes("disput") ||
    status.includes("review")
  ) {
    return "Disputed";
  }

  const dueDate = parseDate(fine.dueDate);

  if (
    dueDate &&
    dueDate.getTime() < Date.now()
  ) {
    return "Overdue";
  }

  return "Outstanding";
}

function getTransactionStatus(
  payment: PaymentRecord
): TransactionStatus {
  const status = String(
    payment.status ?? ""
  ).toLowerCase().trim();

  if (
    [
      "success",
      "successful",
      "completed",
      "complete",
      "paid",
      "settled",
    ].includes(status)
  ) {
    return "Completed";
  }

  if (
    [
      "pending",
      "processing",
      "initiated",
      "awaiting_payment",
      "awaiting payment",
      "in_progress",
    ].includes(status)
  ) {
    return "Pending";
  }

  if (
    [
      "failed",
      "failure",
      "declined",
      "cancelled",
      "canceled",
      "rejected",
      "expired",
    ].includes(status)
  ) {
    return "Failed";
  }

  return "Other";
}

function getPaymentDate(payment: PaymentRecord): any {
  if (payment.displayStatus === "Completed") {
    return payment.paidAt ?? payment.createdAt;
  }

  return payment.createdAt ?? payment.paidAt;
}

function getPaymentReference(payment: PaymentRecord): string {
  if (payment.receiptId) {
    return String(payment.receiptId);
  }

  if (payment.requestId) {
    return String(payment.requestId);
  }

  return payment.id;
}

function getTransactionIcon(
  status: TransactionStatus
): keyof typeof MaterialIcons.glyphMap {
  switch (status) {
    case "Completed":
      return "check-circle";

    case "Pending":
      return "schedule";

    case "Failed":
      return "error-outline";

    default:
      return "receipt-long";
  }
}

function getTransactionColor(status: TransactionStatus): string {
  switch (status) {
    case "Completed":
      return COLORS.success;

    case "Pending":
      return COLORS.warning;

    case "Failed":
      return COLORS.danger;

    default:
      return COLORS.textLight;
  }
}

function getTransactionBackground(
  status: TransactionStatus
): string {
  switch (status) {
    case "Completed":
      return COLORS.softGreen;

    case "Pending":
      return COLORS.softYellow;

    case "Failed":
      return COLORS.softRed;

    default:
      return COLORS.softBlue;
  }
}

/* =========================================================
   PAYMENTS SCREEN
========================================================= */

export default function PaymentsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [fines, setFines] = useState<DisplayFine[]>([]);
  const [payments, setPayments] = useState<DisplayPayment[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* =======================================================
     LOAD FINES AND TRANSACTION HISTORY

     fines.citizenId = user.idNumber
     paymentHistory.userId = user.idNumber
  ======================================================= */

  const loadPayments = useCallback(
    async (showLoader = true) => {
      if (!user?.idNumber) {
        setFines([]);
        setPayments([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (showLoader) {
          setLoading(true);
        }

        const citizenId = String(user.idNumber);

        const [finesSnapshot, paymentsSnapshot] =
          await Promise.all([
            getDocs(
              query(
                collection(db, "fines"),
                where("citizenId", "==", citizenId)
              )
            ),

            getDocs(
              query(
                collection(db, "paymentHistory"),
                where("userId", "==", citizenId)
              )
            ),
          ]);

        const fineRecords: DisplayFine[] =
          finesSnapshot.docs.map((fineDoc) => {
            const data = fineDoc.data() as FineRecord;

            return {
              ...data,
              id: fineDoc.id,
              displayStatus: getFineStatus(data),
            };
          });

        const paymentRecords: DisplayPayment[] =
          paymentsSnapshot.docs.map((paymentDoc) => {
            const data = paymentDoc.data() as PaymentRecord;

            return {
              ...data,
              id: paymentDoc.id,
              displayStatus: getTransactionStatus(data),
            };
          });

        // Show the most recent activity first.
        paymentRecords.sort((a, b) => {
          const dateA = parseDate(getPaymentDate(a))?.getTime() ?? 0;
          const dateB = parseDate(getPaymentDate(b))?.getTime() ?? 0;

          return dateB - dateA;
        });

        setFines(fineRecords);
        setPayments(paymentRecords);
      } catch (error) {
        console.error("PAYMENTS DASHBOARD LOAD ERROR:", error);

        Alert.alert(
          "Unable to Load Payments",
          "Your payment information could not be retrieved. Please check your connection and try again."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.idNumber]
  );

  useEffect(() => {
    loadPayments(true);
  }, [loadPayments]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPayments(false);
  }, [loadPayments]);

  /* =======================================================
     FINE SUMMARY
  ======================================================= */

  const outstandingCount = useMemo(
    () =>
      fines.filter(
        (fine) => fine.displayStatus === "Outstanding"
      ).length,
    [fines]
  );

  const overdueCount = useMemo(
    () =>
      fines.filter(
        (fine) => fine.displayStatus === "Overdue"
      ).length,
    [fines]
  );

  const paidFineCount = useMemo(
    () =>
      fines.filter(
        (fine) => fine.displayStatus === "Paid"
      ).length,
    [fines]
  );

  const unpaidCount = outstandingCount + overdueCount;

  const totalOutstanding = useMemo(
    () =>
      fines
        .filter(
          (fine) =>
            fine.displayStatus === "Outstanding" ||
            fine.displayStatus === "Overdue"
        )
        .reduce(
          (total, fine) => total + getFineAmount(fine),
          0
        ),
    [fines]
  );

  /* =======================================================
     TRANSACTION SUMMARY

     Counts come from actual paymentHistory records.
  ======================================================= */

  const completedCount = useMemo(
    () =>
      payments.filter(
        (payment) => payment.displayStatus === "Completed"
      ).length,
    [payments]
  );

  const pendingCount = useMemo(
    () =>
      payments.filter(
        (payment) => payment.displayStatus === "Pending"
      ).length,
    [payments]
  );

  const failedCount = useMemo(
    () =>
      payments.filter(
        (payment) => payment.displayStatus === "Failed"
      ).length,
    [payments]
  );

  const completedTotal = useMemo(
    () =>
      payments
        .filter(
          (payment) => payment.displayStatus === "Completed"
        )
        .reduce(
          (total, payment) => total + getAmount(payment.amount),
          0
        ),
    [payments]
  );

  const recentPayments = useMemo(
    () => payments.slice(0, 5),
    [payments]
  );

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const openScreen = useCallback(
    (screen: string) => {
      const parentNavigation = navigation.getParent();

      if (parentNavigation) {
        parentNavigation.navigate(screen);
      } else {
        navigation.navigate(screen);
      }
    },
    [navigation]
  );

  /* =======================================================
     UI
  ======================================================= */

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="wallet-outline"
              size={25}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.headerInformation}>
            <Text style={styles.eyebrow}>
              CITIZEN SERVICES
            </Text>

            <Text style={styles.title}>
              My Payments
            </Text>

            <Text style={styles.subtitle}>
              Track your traffic fines, completed payments
              and recent transactions.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerRefresh}
            onPress={handleRefresh}
            disabled={loading || refreshing}
            activeOpacity={0.7}
          >
            <Ionicons
              name="refresh-outline"
              size={21}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        </View>

        {/* =================================================
            OUTSTANDING BALANCE
        ================================================= */}

        <View style={styles.balanceCard}>
          <View style={styles.balanceTopRow}>
            <View style={styles.balanceLabelRow}>
              <Ionicons
                name="wallet-outline"
                size={18}
                color="#FFFFFF"
              />

              <Text style={styles.balanceLabel}>
                OUTSTANDING BALANCE
              </Text>
            </View>

            <View style={styles.secureBadge}>
              <Ionicons
                name="shield-checkmark-outline"
                size={13}
                color="#FFFFFF"
              />

              <Text style={styles.secureBadgeText}>
                My account
              </Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.balanceLoading}>
              <ActivityIndicator
                color="#FFFFFF"
                size="small"
              />

              <Text style={styles.balanceLoadingText}>
                Loading your balance...
              </Text>
            </View>
          ) : (
            <Text style={styles.balanceAmount}>
              {formatCurrency(totalOutstanding)}
            </Text>
          )}

          <View style={styles.balanceDivider} />

          <View style={styles.balanceBottomRow}>
            <View style={styles.balanceStatusRow}>
              <Ionicons
                name={
                  unpaidCount > 0
                    ? "alert-circle-outline"
                    : "checkmark-circle-outline"
                }
                size={17}
                color={unpaidCount > 0 ? "#FDE68A" : "#BBF7D0"}
              />

              <Text style={styles.balanceStatusText}>
                {loading
                  ? "Calculating balance"
                  : unpaidCount > 0
                    ? `${unpaidCount} unpaid ${
                        unpaidCount === 1 ? "fine" : "fines"
                      }`
                    : "No unpaid fines"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.balanceAction}
              onPress={() =>
                openScreen("OutstandingPenalties")
              }
              activeOpacity={0.8}
            >
              <Text style={styles.balanceActionText}>
                View fines
              </Text>

              <Ionicons
                name="arrow-forward"
                size={15}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* =================================================
            TRANSACTION SUMMARY
        ================================================= */}

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>
              Transaction Summary
            </Text>

            <Text style={styles.sectionDescription}>
              A quick look at your payment activity.
            </Text>
          </View>
        </View>

        <View style={styles.transactionSummaryRow}>
          <View style={[styles.summaryTile, styles.completedTile]}>
            <View style={styles.completedIcon}>
              <MaterialIcons
                name="check-circle-outline"
                size={21}
                color={COLORS.success}
              />
            </View>

            <Text style={styles.tileLabel}>
              Completed
            </Text>

            <Text style={[styles.tileNumber, styles.successText]}>
              {loading ? "--" : completedCount}
            </Text>

            <Text style={styles.tileHint}>
              Successful payments
            </Text>
          </View>

          <View style={[styles.summaryTile, styles.pendingTile]}>
            <View style={styles.pendingIcon}>
              <MaterialIcons
                name="schedule"
                size={21}
                color={COLORS.warning}
              />
            </View>

            <Text style={styles.tileLabel}>
              Pending
            </Text>

            <Text style={[styles.tileNumber, styles.warningText]}>
              {loading ? "--" : pendingCount}
            </Text>

            <Text style={styles.tileHint}>
              Awaiting confirmation
            </Text>
          </View>

          <View style={[styles.summaryTile, styles.failedTile]}>
            <View style={styles.failedIcon}>
              <MaterialIcons
                name="error-outline"
                size={21}
                color={COLORS.danger}
              />
            </View>

            <Text style={styles.tileLabel}>
              Failed
            </Text>

            <Text style={[styles.tileNumber, styles.dangerText]}>
              {loading ? "--" : failedCount}
            </Text>

            <Text style={styles.tileHint}>
              Unsuccessful payments
            </Text>
          </View>
        </View>

        {/* =================================================
            COMPLETED PAYMENTS HIGHLIGHT
        ================================================= */}

        <View style={styles.completedHighlight}>
          <View style={styles.completedHighlightIcon}>
            <Ionicons
              name="checkmark-done-circle"
              size={27}
              color={COLORS.success}
            />
          </View>

          <View style={styles.completedHighlightInfo}>
            <Text style={styles.completedHighlightTitle}>
              Successfully Paid
            </Text>

            <Text style={styles.completedHighlightDescription}>
              Total recorded value of completed transactions.
            </Text>

            <Text style={styles.completedHighlightAmount}>
              {loading ? "Loading..." : formatCurrency(completedTotal)}
            </Text>
          </View>

          <View style={styles.completedCountBadge}>
            <Text style={styles.completedCountNumber}>
              {loading ? "--" : completedCount}
            </Text>

            <Text style={styles.completedCountLabel}>
              payments
            </Text>
          </View>
        </View>

        {/* =================================================
            RECENT TRANSACTION ACTIVITY
        ================================================= */}

        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <View style={styles.activityHeaderLeft}>
              <View style={styles.activityHeaderIcon}>
                <MaterialIcons
                  name="receipt-long"
                  size={22}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.activityHeaderInfo}>
                <Text style={styles.sectionTitle}>
                  Recent Activity
                </Text>

                <Text style={styles.sectionDescription}>
                  Your latest recorded transactions.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => openScreen("PaymentHistory")}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>
                View all
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingPanel}>
              <ActivityIndicator
                color={COLORS.primary}
                size="small"
              />

              <Text style={styles.loadingPanelText}>
                Loading transaction history...
              </Text>
            </View>
          ) : recentPayments.length === 0 ? (
            <View style={styles.emptyActivity}>
              <View style={styles.emptyActivityIcon}>
                <MaterialIcons
                  name="receipt-long"
                  size={30}
                  color={COLORS.primary}
                />
              </View>

              <Text style={styles.emptyActivityTitle}>
                No transactions yet
              </Text>

              <Text style={styles.emptyActivityDescription}>
                Your payment activity will appear here when
                transaction records are available.
              </Text>

              <TouchableOpacity
                style={styles.emptyActivityButton}
                onPress={() => openScreen("PaymentHistory")}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyActivityButtonText}>
                  Open payment history
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.activityList}>
              {recentPayments.map((payment, index) => {
                const statusColor = getTransactionColor(
                  payment.displayStatus
                );

                const statusBackground =
                  getTransactionBackground(payment.displayStatus);

                const paymentDate = getPaymentDate(payment);

                return (
                  <View
                    key={payment.id}
                    style={[
                      styles.transactionRow,
                      index === recentPayments.length - 1 &&
                        styles.transactionRowLast,
                    ]}
                  >
                    <View
                      style={[
                        styles.transactionIcon,
                        { backgroundColor: statusBackground },
                      ]}
                    >
                      <MaterialIcons
                        name={getTransactionIcon(payment.displayStatus)}
                        size={23}
                        color={statusColor}
                      />
                    </View>

                    <View style={styles.transactionInfo}>
                      <Text
                        style={styles.transactionTitle}
                        numberOfLines={2}
                      >
                        {payment.description?.trim() ||
                          (payment.source === "fine"
                            ? "Traffic fine payment"
                            : "Payment transaction")}
                      </Text>

                      <Text style={styles.transactionDate}>
                        {formatDate(paymentDate)}
                      </Text>

                      <Text
                        style={styles.transactionReference}
                        numberOfLines={1}
                      >
                        Ref: {getPaymentReference(payment)}
                      </Text>

                      <View
                        style={[
                          styles.transactionStatusBadge,
                          { backgroundColor: statusBackground },
                        ]}
                      >
                        <View
                          style={[
                            styles.transactionStatusDot,
                            { backgroundColor: statusColor },
                          ]}
                        />

                        <Text
                          style={[
                            styles.transactionStatusText,
                            { color: statusColor },
                          ]}
                        >
                          {payment.displayStatus === "Other"
                            ? payment.status || "Status unavailable"
                            : payment.displayStatus}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.transactionAmountContainer}>
                      <Text
                        style={[
                          styles.transactionAmount,
                          payment.displayStatus === "Completed" &&
                            styles.successText,
                        ]}
                        numberOfLines={2}
                      >
                        {formatCurrency(getAmount(payment.amount))}
                      </Text>

                      <Text style={styles.transactionMethod}>
                        {payment.method || "Payment method"}
                      </Text>
                    </View>
                  </View>
                );
              })}

              <TouchableOpacity
                style={styles.historyButton}
                onPress={() => openScreen("PaymentHistory")}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name="history"
                  size={19}
                  color={COLORS.primary}
                />

                <Text style={styles.historyButtonText}>
                  View complete payment history
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* =================================================
            FINES OVERVIEW CARD

            Keeps the existing FinesOverview route.
        ================================================= */}

        <TouchableOpacity
          style={styles.overviewCard}
          onPress={() => openScreen("FinesOverview")}
          activeOpacity={0.85}
        >
          <View style={styles.overviewTopRow}>
            <View style={styles.overviewIcon}>
              <MaterialIcons
                name="receipt-long"
                size={25}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.overviewTitleContainer}>
              <Text style={styles.overviewTitle}>
                Fines Overview
              </Text>

              <Text style={styles.overviewSubtitle}>
                Your complete traffic fine account
              </Text>
            </View>

            <View style={styles.overviewArrow}>
              <Ionicons
                name="arrow-forward"
                size={19}
                color={COLORS.primary}
              />
            </View>
          </View>

          <Text style={styles.overviewDescription}>
            Review your fine records, outstanding penalties,
            payment statuses and related references in one place.
          </Text>

          <View style={styles.overviewDivider} />

          <View style={styles.overviewStats}>
            <View style={styles.overviewStat}>
              <Text style={styles.overviewStatLabel}>
                Total records
              </Text>

              <Text style={styles.overviewStatValue}>
                {loading ? "--" : fines.length}
              </Text>
            </View>

            <View style={styles.overviewStatDivider} />

            <View style={styles.overviewStat}>
              <Text style={styles.overviewStatLabel}>
                Unpaid
              </Text>

              <Text
                style={[
                  styles.overviewStatValue,
                  unpaidCount > 0 && styles.warningText,
                ]}
              >
                {loading ? "--" : unpaidCount}
              </Text>
            </View>

            <View style={styles.overviewStatDivider} />

            <View style={styles.overviewStat}>
              <Text style={styles.overviewStatLabel}>
                Paid fines
              </Text>

              <Text
                style={[
                  styles.overviewStatValue,
                  styles.successText,
                ]}
              >
                {loading ? "--" : paidFineCount}
              </Text>
            </View>
          </View>

          <View style={styles.overviewFooter}>
            <Text style={styles.overviewFooterText}>
              Open fines overview
            </Text>

            <Ionicons
              name="chevron-forward"
              size={17}
              color={COLORS.primary}
            />
          </View>
        </TouchableOpacity>

     
{/* PAYMENT SERVICES */}

<View style={styles.sectionHeading}>
  <View>
    <Text style={styles.sectionTitle}>
      Payment Services
    </Text>

    <Text style={styles.sectionDescription}>
      Access and manage your payment receipts.
    </Text>
  </View>
</View>

<PaymentItem
  icon="download"
  title="Download Receipts"
  description="Access receipts for completed payments."
  screen="DownloadReceipts"
  onPress={openScreen}
/>

<PaymentItem
  icon="email"
  title="Email Receipts"
  description="Access the receipt email service."
  screen="EmailReceipts"
  onPress={openScreen}
/>

        {/* =================================================
            INFORMATION NOTICE
        ================================================= */}

        <View style={styles.notice}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color={COLORS.primary}
          />

          <View style={styles.noticeInfo}>
            <Text style={styles.noticeTitle}>
              About your payment information
            </Text>

            <Text style={styles.noticeText}>
              Transaction summaries are based on the records
              associated with your citizen account. A completed
              status reflects the status recorded in payment
              history. For official confirmation, refer to the
              relevant payment record or receipt.
            </Text>
          </View>
        </View>

        <Text style={styles.footerText}>
          TrafficConnect SA · Citizen Payment Services
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   PAYMENT ITEM COMPONENT
========================================================= */

function PaymentItem({
  icon,
  title,
  description,
  screen,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  screen: string;
  onPress: (screen: string) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.serviceItem}
      activeOpacity={0.8}
      onPress={() => onPress(screen)}
    >
      <View style={styles.serviceIcon}>
        <MaterialIcons
          name={icon}
          size={22}
          color={COLORS.primary}
        />
      </View>

      <View style={styles.serviceText}>
        <Text style={styles.serviceTitle}>
          {title}
        </Text>

        <Text style={styles.serviceDescription}>
          {description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={19}
        color={COLORS.textLight}
      />
    </TouchableOpacity>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 45,
  },

  /* HEADER */

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerInformation: {
    flex: 1,
  },

  eyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.1,
    color: COLORS.primary,
  },

  title: {
    marginTop: 3,
    fontSize: 25,
    fontWeight: "900",
    color: COLORS.text,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textLight,
  },

  headerRefresh: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
  },

  /* BALANCE CARD */

  balanceCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 19,
    marginBottom: 25,
    overflow: "hidden",

    shadowColor: COLORS.primaryDark,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },

  balanceTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  balanceLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  balanceLabel: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginLeft: 8,
  },

  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginLeft: 8,
  },

  secureBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    marginLeft: 4,
  },

  balanceAmount: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.6,
    marginTop: 17,
    marginBottom: 19,
  },

  balanceLoading: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 25,
  },

  balanceLoadingText: {
    color: "#FFFFFF",
    fontSize: 12,
    marginLeft: 9,
  },

  balanceDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.23)",
    marginBottom: 14,
  },

  balanceBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  balanceStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },

  balanceStatusText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
  },

  balanceAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.14)",
  },

  balanceActionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    marginRight: 5,
  },

  /* SECTION HEADINGS */

  sectionHeading: {
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.text,
  },

  sectionDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textLight,
    marginTop: 4,
  },

  /* TRANSACTION SUMMARY */

  transactionSummaryRow: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 15,
  },

  summaryTile: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
  },

  completedTile: {
    backgroundColor: COLORS.softGreen,
    borderColor: "#CDEBD8",
  },

  pendingTile: {
    backgroundColor: COLORS.softYellow,
    borderColor: "#F2E4BD",
  },

  failedTile: {
    backgroundColor: COLORS.softRed,
    borderColor: "#F5D2CF",
  },

  completedIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#D8F5E3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  pendingIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FCECC5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  failedIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FBDDD9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  tileLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.text,
  },

  tileNumber: {
    fontSize: 26,
    fontWeight: "900",
    marginTop: 5,
  },

  tileHint: {
    fontSize: 9,
    lineHeight: 13,
    color: COLORS.textLight,
    marginTop: 3,
  },

  successText: {
    color: COLORS.success,
  },

  warningText: {
    color: COLORS.warning,
  },

  dangerText: {
    color: COLORS.danger,
  },

  /* COMPLETED PAYMENTS HIGHLIGHT */

  completedHighlight: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    padding: 14,
    marginBottom: 26,
  },

  completedHighlightIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: COLORS.softGreen,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  completedHighlightInfo: {
    flex: 1,
  },

  completedHighlightTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.text,
  },

  completedHighlightDescription: {
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.textLight,
    marginTop: 3,
  },

  completedHighlightAmount: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.success,
    marginTop: 6,
  },

  completedCountBadge: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.softGreen,
    borderRadius: 11,
    minWidth: 57,
    paddingVertical: 9,
    paddingHorizontal: 6,
    marginLeft: 6,
  },

  completedCountNumber: {
    color: COLORS.success,
    fontSize: 18,
    fontWeight: "900",
  },

  completedCountLabel: {
    color: COLORS.success,
    fontSize: 9,
    fontWeight: "700",
    marginTop: 2,
  },

  /* RECENT ACTIVITY */

  activitySection: {
    marginBottom: 26,
  },

  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },

  activityHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  activityHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  activityHeaderInfo: {
    flex: 1,
  },

  viewAllText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 8,
  },

  activityList: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingTop: 4,
  },

  transactionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF0F3",
  },

  transactionRowLast: {
    borderBottomWidth: 0,
  },

  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  transactionInfo: {
    flex: 1,
    minWidth: 0,
  },

  transactionTitle: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    color: COLORS.text,
  },

  transactionDate: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 4,
  },

  transactionReference: {
    fontSize: 9,
    color: COLORS.textLight,
    marginTop: 4,
  },

  transactionStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 7,
  },

  transactionStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  transactionStatusText: {
    fontSize: 9,
    fontWeight: "800",
  },

  transactionAmountContainer: {
    alignItems: "flex-end",
    marginLeft: 7,
    maxWidth: 115,
  },

  transactionAmount: {
    fontSize: 11,
    fontWeight: "900",
    color: COLORS.text,
    textAlign: "right",
  },

  transactionMethod: {
    fontSize: 9,
    color: COLORS.textLight,
    marginTop: 5,
    textAlign: "right",
  },

  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.softBlue,
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginTop: 7,
    marginBottom: 12,
  },

  historyButtonText: {
    flex: 1,
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    marginHorizontal: 8,
  },

  loadingPanel: {
    minHeight: 130,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
  },

  loadingPanelText: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 10,
  },

  emptyActivity: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 22,
    paddingVertical: 25,
  },

  emptyActivityIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyActivityTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.text,
  },

  emptyActivityDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textLight,
    textAlign: "center",
    marginTop: 7,
  },

  emptyActivityButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginTop: 15,
  },

  emptyActivityButtonText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
    marginRight: 7,
  },

  /* FINES OVERVIEW */

  overviewCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: "#C7DDED",
    borderRadius: 17,
    padding: 15,
    marginBottom: 27,

    shadowColor: COLORS.primary,
    shadowOpacity: 0.045,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  overviewTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  overviewIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  overviewTitleContainer: {
    flex: 1,
  },

  overviewTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.text,
  },

  overviewSubtitle: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 4,
  },

  overviewArrow: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
  },

  overviewDescription: {
    fontSize: 11,
    lineHeight: 18,
    color: COLORS.textLight,
    marginTop: 14,
  },

  overviewDivider: {
    height: 1,
    backgroundColor: "#E9EDF1",
    marginVertical: 14,
  },

  overviewStats: {
    flexDirection: "row",
    alignItems: "center",
  },

  overviewStat: {
    flex: 1,
    alignItems: "center",
  },

  overviewStatLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    textAlign: "center",
  },

  overviewStatValue: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.text,
    marginTop: 5,
  },

  overviewStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
    marginHorizontal: 7,
  },

  overviewFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.softBlue,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 15,
  },

  overviewFooterText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "800",
  },

  /* PAYMENT SERVICES */

  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    padding: 12,
    marginBottom: 9,
  },

  serviceIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  serviceText: {
    flex: 1,
    marginLeft: 11,
    marginRight: 8,
  },

  serviceTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },

  serviceDescription: {
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.textLight,
    marginTop: 4,
  },

  /* NOTICE */

  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.softBlue,
    borderWidth: 1,
    borderColor: "#C7DDED",
    borderRadius: 13,
    padding: 13,
    marginTop: 13,
  },

  noticeInfo: {
    flex: 1,
    marginLeft: 9,
  },

  noticeTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: COLORS.text,
  },

  noticeText: {
    fontSize: 10,
    lineHeight: 16,
    color: COLORS.textLight,
    marginTop: 5,
  },

  footerText: {
    fontSize: 9,
    color: COLORS.textLight,
    textAlign: "center",
    marginTop: 22,
  },
});
