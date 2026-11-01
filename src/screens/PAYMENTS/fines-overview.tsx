
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";

type FineStatus = "Paid" | "Outstanding" | "Overdue" | "Disputed";

type Fine = {
  id: string;
  ticketId?: string;
  reference?: string;
  fineId?: string;
  citizenId?: string;
  citizenName?: string;
  offence?: string;
  description?: string;
  type?: string;
  date?: any;
  offenceDate?: any;
  issuedAt?: any;
  dueDate?: any;
  location?: string;
  cameraLocation?: string;
  registrationNumber?: string;
  vehicleId?: string;
  amount?: number;
  fineAmount?: number;
  outstandingAmount?: number;
  status?: string;
  paymentStatus?: string;
  paymentReference?: string;
  paidAt?: any;
  paymentMethod?: string;
  updatedAt?: any;
  createdAt?: any;
  [key: string]: any;
};

type Payment = {
  id: string;
  reference?: string;
  type?: string;
  description?: string;
  fineId?: string;
  ticketId?: string;
  amount?: number;
  currency?: string;
  method?: string;
  methodLabel?: string;
  status?: string;
  createdAt?: any;
  paidAt?: any;
};

const COLORS = {
  primary: "#003366",
  primaryLight: "#EAF1F7",
  background: "#F4F6F8",
  white: "#FFFFFF",
  text: "#222222",
  muted: "#777777",
  border: "#E9EDF1",
  green: "#2E7D32",
  greenBg: "#EAF6EC",
  amber: "#B26A00",
  amberBg: "#FFF4E5",
  red: "#C62828",
  redBg: "#FDECEC",
};

const formatCurrency = (value: number) =>
  `R ${value.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function amountOf(value: any): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function toDate(value: any): Date | null {
  if (!value) return null;

  try {
    const date =
      typeof value?.toDate === "function"
        ? value.toDate()
        : value instanceof Date
          ? value
          : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function formatDate(value: any): string {
  const date = toDate(value);

  return date
    ? date.toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Date unavailable";
}

function formatDateTime(value: any): string {
  const date = toDate(value);

  return date
    ? date.toLocaleString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Date unavailable";
}

function fineReference(fine: Fine): string {
  return (
    fine.ticketId ??
    fine.reference ??
    fine.fineId ??
    fine.id
  );
}

function originalFineAmount(fine: Fine): number {
  return amountOf(
    fine.fineAmount ?? fine.amount ?? fine.outstandingAmount
  );
}

function outstandingAmount(fine: Fine): number {
  const status = String(
    fine.paymentStatus ?? fine.status ?? ""
  ).toLowerCase();

  if (
    status === "paid" ||
    status === "settled" ||
    status === "completed"
  ) {
    return 0;
  }

  // An existing outstandingAmount of zero is intentional.
  if (fine.outstandingAmount !== undefined &&
      fine.outstandingAmount !== null) {
    return amountOf(fine.outstandingAmount);
  }

  return originalFineAmount(fine);
}

function getFineStatus(fine: Fine): FineStatus {
  const paymentStatus = String(
    fine.paymentStatus ?? ""
  ).toLowerCase();

  const status = String(fine.status ?? "").toLowerCase();

  if (
    paymentStatus === "paid" ||
    paymentStatus === "settled" ||
    status === "paid" ||
    status === "settled"
  ) {
    return "Paid";
  }

  if (
    paymentStatus.includes("dispute") ||
    status.includes("dispute") ||
    status.includes("review")
  ) {
    return "Disputed";
  }

  const dueDate = toDate(fine.dueDate);

  if (
    dueDate &&
    dueDate.getTime() < Date.now() &&
    outstandingAmount(fine) > 0
  ) {
    return "Overdue";
  }

  return "Outstanding";
}

function paymentIsSuccessful(payment: Payment): boolean {
  const status = String(payment.status ?? "").toLowerCase();

  return (
    status === "completed" ||
    status === "paid" ||
    status === "settled" ||
    status === "success" ||
    status === "successful"
  );
}

function paymentDate(payment: Payment): any {
  return payment.paidAt ?? payment.createdAt;
}

export default function FinesOverviewScreen() {
  const { user } = useAuth();

  const [fines, setFines] = useState<Fine[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<
    "All" | FineStatus
  >("All");

  const loadData = useCallback(async (showLoader = true) => {
    if (!user?.idNumber) {
      setFines([]);
      setPayments([]);
      setLoading(false);
      setRefreshing(false);
      setLoadError(false);
      return;
    }

    if (showLoader) setLoading(true);
    setLoadError(false);

    try {
      const [fineSnapshot, paymentSnapshot] = await Promise.all([
        getDocs(
          query(
            collection(db, "fines"),
            where("citizenId", "==", user.idNumber)
          )
        ),
        getDocs(
          query(
            collection(db, "paymentHistory"),
            where("citizenId", "==", user.idNumber)
          )
        ),
      ]);

      const loadedFines: Fine[] = fineSnapshot.docs.map((item) => ({
        ...item.data(),
        id: item.id,
      }));

      const loadedPayments: Payment[] = paymentSnapshot.docs.map(
        (item) => ({
          ...item.data(),
          id: item.id,
        })
      );

      loadedFines.sort((a, b) => {
        const dateA = toDate(
          a.offenceDate ?? a.date ?? a.issuedAt ?? a.createdAt
        )?.getTime() ?? 0;

        const dateB = toDate(
          b.offenceDate ?? b.date ?? b.issuedAt ?? b.createdAt
        )?.getTime() ?? 0;

        return dateB - dateA;
      });

      loadedPayments.sort((a, b) => {
        const dateA = toDate(paymentDate(a))?.getTime() ?? 0;
        const dateB = toDate(paymentDate(b))?.getTime() ?? 0;

        return dateB - dateA;
      });

      setFines(loadedFines);
      setPayments(loadedPayments);
    } catch (error) {
      console.error("FINES OVERVIEW LOAD ERROR:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.idNumber]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Refresh when this screen regains focus.
  // This keeps the overview in step with the payment screen.
  useEffect(() => {
    const unsubscribe = (globalThis as any).__unused;

    // Navigation focus refresh is registered below when navigation
    // is available through the screen prop.
    void unsubscribe;
  }, []);

  const statuses = useMemo(
    () => fines.map((fine) => ({
      fine,
      status: getFineStatus(fine),
    })),
    [fines]
  );

  const paidFines = useMemo(
    () => statuses.filter((item) => item.status === "Paid"),
    [statuses]
  );

  const outstandingFines = useMemo(
    () => statuses.filter((item) => item.status === "Outstanding"),
    [statuses]
  );

  const overdueFines = useMemo(
    () => statuses.filter((item) => item.status === "Overdue"),
    [statuses]
  );

  const disputedFines = useMemo(
    () => statuses.filter((item) => item.status === "Disputed"),
    [statuses]
  );

  const totalFineValue = useMemo(
    () => fines.reduce(
      (total, fine) => total + originalFineAmount(fine), 0
    ),
    [fines]
  );

  const totalOutstanding = useMemo(
    () => fines.reduce(
      (total, fine) => total + outstandingAmount(fine), 0
    ),
    [fines]
  );

  // Prefer actual successful payment-history entries.
  // For legacy paid fines with no history entry, use their fine amount
  // as a fallback so older records are not silently excluded.
  const totalPaid = useMemo(() => {
    const successfulPayments = payments.filter(paymentIsSuccessful);

    const paidFineIdsWithHistory = new Set(
      successfulPayments
        .filter((payment) => payment.fineId)
        .map((payment) => payment.fineId as string)
    );

    const historyTotal = successfulPayments.reduce(
      (total, payment) => total + amountOf(payment.amount), 0
    );

    const legacyPaidTotal = paidFines.reduce((total, item) => {
      if (paidFineIdsWithHistory.has(item.fine.id)) return total;
      return total + originalFineAmount(item.fine);
    }, 0);

    return historyTotal + legacyPaidTotal;
  }, [payments, paidFines]);

  const successfulPayments = useMemo(
    () => payments.filter(paymentIsSuccessful),
    [payments]
  );

  const filteredFines = useMemo(() => {
    if (activeFilter === "All") return statuses;

    return statuses.filter((item) => item.status === activeFilter);
  }, [statuses, activeFilter]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIcon}>
          <MaterialIcons
            name="account-balance-wallet"
            size={30}
            color={COLORS.primary}
          />
        </View>

        <ActivityIndicator color={COLORS.primary} />

        <Text style={styles.loadingTitle}>Loading financial overview</Text>
        <Text style={styles.muted}>Retrieving your traffic records...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadData(false);
            }}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerAccent} />
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>TRAFFIC SERVICES</Text>
            <Text style={styles.title}>Fines Overview</Text>
            <Text style={styles.subtitle}>
              Track your outstanding penalties, completed payments
              and traffic fine history in one place.
            </Text>
          </View>
        </View>

        {/* ACCOUNT */}
        <View style={styles.accountCard}>
          <View style={styles.accountIcon}>
            <MaterialIcons
              name="person"
              size={23}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.accountDetails}>
            <Text style={styles.eyebrow}>CITIZEN ACCOUNT</Text>
            <Text style={styles.accountName} numberOfLines={1}>
              {user?.fullName ?? "Citizen"}
            </Text>
            <Text style={styles.accountId}>
              ID: {user?.idNumber ?? "Unavailable"}
            </Text>
          </View>

          <MaterialIcons
            name="verified"
            size={21}
            color={COLORS.green}
          />
        </View>

        {/* MAIN BALANCE */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <View style={styles.balanceIcon}>
              <MaterialIcons
                name="account-balance-wallet"
                size={25}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.balancePill}>
              <View style={styles.balanceDot} />
              <Text style={styles.balancePillText}>
                CURRENT BALANCE
              </Text>
            </View>
          </View>

          <Text style={styles.balanceLabel}>
            Total outstanding
          </Text>
          <Text style={styles.balanceAmount}>
            {formatCurrency(totalOutstanding)}
          </Text>
          <Text style={styles.balanceCaption}>
            Amount still due on unpaid traffic fines
          </Text>

          <View style={styles.balanceDivider} />

          <View style={styles.balanceBottom}>
            <View style={styles.balanceMetric}>
              <Text style={styles.balanceMetricLabel}>
                Total recorded
              </Text>
              <Text style={styles.balanceMetricValue}>
                {formatCurrency(totalFineValue)}
              </Text>
            </View>

            <View style={styles.balanceMetricDivider} />

            <View style={styles.balanceMetric}>
              <Text style={styles.balanceMetricLabel}>
                Total paid
              </Text>
              <Text style={styles.balancePaidValue}>
                {formatCurrency(totalPaid)}
              </Text>
            </View>
          </View>
        </View>

        {/* STATUS CARDS */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Financial Summary</Text>
            <Text style={styles.sectionSubtitle}>
              Your current fine status
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.greenBg }]}>
              <MaterialIcons
                name="check-circle"
                size={21}
                color={COLORS.green}
              />
            </View>
            <Text style={styles.statNumber}>{paidFines.length}</Text>
            <Text style={styles.statLabel}>Paid</Text>
            <Text style={styles.statAmount}>
              {formatCurrency(totalPaid)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.amberBg }]}>
              <MaterialIcons
                name="pending-actions"
                size={21}
                color={COLORS.amber}
              />
            </View>
            <Text style={styles.statNumber}>
              {outstandingFines.length}
            </Text>
            <Text style={styles.statLabel}>Outstanding</Text>
            <Text style={styles.statAmount}>
              {formatCurrency(
                outstandingFines.reduce(
                  (sum, item) => sum + outstandingAmount(item.fine), 0
                )
              )}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.redBg }]}>
              <MaterialIcons
                name="warning"
                size={21}
                color={COLORS.red}
              />
            </View>
            <Text style={[styles.statNumber, { color: COLORS.red }]}>
              {overdueFines.length}
            </Text>
            <Text style={styles.statLabel}>Overdue</Text>
            <Text style={styles.statAmount}>
              {formatCurrency(
                overdueFines.reduce(
                  (sum, item) => sum + outstandingAmount(item.fine), 0
                )
              )}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
              <MaterialIcons
                name="rate-review"
                size={21}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.statNumber}>
              {disputedFines.length}
            </Text>
            <Text style={styles.statLabel}>Disputed</Text>
            <Text style={styles.statAmount}>
              {formatCurrency(
                disputedFines.reduce(
                  (sum, item) => sum + outstandingAmount(item.fine), 0
                )
              )}
            </Text>
          </View>
        </View>

        {/* ERROR */}
        {loadError && (
          <View style={styles.errorCard}>
            <MaterialIcons
              name="cloud-off"
              size={23}
              color={COLORS.red}
            />
            <View style={styles.errorTextContainer}>
              <Text style={styles.errorTitle}>
                Unable to refresh records
              </Text>
              <Text style={styles.errorMessage}>
                Check your connection and try again.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => void loadData(true)}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* QUICK EXPLANATION */}
        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={COLORS.primary}
          />
          <Text style={styles.infoText}>
            When a payment is successfully recorded, your fine status
            and outstanding balance update from your traffic records.
            Pull down to refresh the latest information.
          </Text>
        </View>

        {/* FINE HISTORY */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Fine History</Text>
            <Text style={styles.sectionSubtitle}>
              All traffic fines linked to your account
            </Text>
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{fines.length} records</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {(["All", "Outstanding", "Overdue", "Paid", "Disputed"] as const).map(
            (filter) => (
              <TouchableOpacity
                key={filter}
                activeOpacity={0.8}
                onPress={() => setActiveFilter(filter)}
                style={[
                  styles.filterChip,
                  activeFilter === filter && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === filter && styles.filterTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>

        {filteredFines.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <MaterialIcons
                name="receipt-long"
                size={35}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {fines.length === 0
                ? "No Fines Recorded"
                : `No ${activeFilter} Fines`}
            </Text>
            <Text style={styles.emptyText}>
              {fines.length === 0
                ? "There are currently no traffic fines associated with your account."
                : "Try selecting another status to view your fine records."}
            </Text>
          </View>
        ) : (
          filteredFines.map(({ fine, status }) => {
            const paid = status === "Paid";
            const overdue = status === "Overdue";
            const disputed = status === "Disputed";

            const statusColor = paid
              ? COLORS.green
              : overdue
                ? COLORS.red
                : disputed
                  ? COLORS.primary
                  : COLORS.amber;

            const statusBackground = paid
              ? COLORS.greenBg
              : overdue
                ? COLORS.redBg
                : disputed
                  ? COLORS.primaryLight
                  : COLORS.amberBg;

            const offence =
              fine.offence ?? fine.description ?? "Traffic violation";

            return (
              <View key={fine.id} style={styles.fineCard}>
                <View style={styles.fineHeader}>
                  <View style={styles.fineHeading}>
                    <View
                      style={[
                        styles.fineIcon,
                        { backgroundColor: statusBackground },
                      ]}
                    >
                      <MaterialIcons
                        name={
                          paid
                            ? "check-circle"
                            : overdue
                              ? "warning"
                              : disputed
                                ? "rate-review"
                                : "receipt-long"
                        }
                        size={22}
                        color={statusColor}
                      />
                    </View>

                    <View style={styles.fineTitleContainer}>
                      <Text style={styles.fineTitle}>{offence}</Text>
                      <Text style={styles.reference}>
                        {fineReference(fine)}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusBackground },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {status}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailsRow}>
                  <View style={styles.detail}>
                    <Text style={styles.detailLabel}>ISSUED</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(
                        fine.offenceDate ??
                        fine.date ??
                        fine.issuedAt ??
                        fine.createdAt
                      )}
                    </Text>
                  </View>

                  <View style={styles.detail}>
                    <Text style={styles.detailLabel}>VEHICLE</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      {fine.registrationNumber ?? "Not specified"}
                    </Text>
                  </View>
                </View>

                <View style={styles.locationRow}>
                  <MaterialIcons
                    name="location-on"
                    size={17}
                    color={COLORS.muted}
                  />
                  <Text style={styles.locationText} numberOfLines={2}>
                    {fine.location ??
                      fine.cameraLocation ??
                      "Location unavailable"}
                  </Text>
                </View>

                <View style={styles.fineAmountBox}>
                  <View>
                    <Text style={styles.detailLabel}>
                      {paid ? "ORIGINAL FINE" : "AMOUNT DUE"}
                    </Text>
                    <Text style={styles.fineAmount}>
                      {formatCurrency(
                        paid
                          ? originalFineAmount(fine)
                          : outstandingAmount(fine)
                      )}
                    </Text>
                  </View>

                  {fine.dueDate && !paid && (
                    <View style={styles.dueDateBox}>
                      <Text style={styles.detailLabel}>DUE DATE</Text>
                      <Text
                        style={[
                          styles.dueDateText,
                          overdue && { color: COLORS.red },
                        ]}
                      >
                        {formatDate(fine.dueDate)}
                      </Text>
                    </View>
                  )}
                </View>

                {paid ? (
                  <View style={styles.paidConfirmation}>
                    <MaterialIcons
                      name="check-circle"
                      size={19}
                      color={COLORS.green}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.paidConfirmationTitle}>
                        Payment completed
                      </Text>
                      <Text style={styles.paidConfirmationSubtext}>
                        {fine.paymentReference
                          ? `Reference: ${fine.paymentReference}`
                          : fine.paidAt
                            ? `Paid on ${formatDate(fine.paidAt)}`
                            : "This fine is marked as settled."}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.unpaidNote}>
                    <MaterialIcons
                      name="info-outline"
                      size={17}
                      color={statusColor}
                    />
                    <Text style={[styles.unpaidNoteText, { color: statusColor }]}>
                      {disputed
                        ? "This fine is under dispute or review."
                        : overdue
                          ? "This payment is past its due date."
                          : "Payment is still outstanding."}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* PAYMENT HISTORY */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Payment History</Text>
            <Text style={styles.sectionSubtitle}>
              Recorded payments for your traffic fines
            </Text>
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countText}>
              {successfulPayments.length} paid
            </Text>
          </View>
        </View>

        {successfulPayments.length === 0 ? (
          <View style={styles.historyEmptyCard}>
            <MaterialIcons
              name="history"
              size={29}
              color={COLORS.muted}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.historyEmptyTitle}>
                No Payments Recorded
              </Text>
              <Text style={styles.historyEmptyText}>
                Completed traffic fine payments will appear here.
              </Text>
            </View>
          </View>
        ) : (
          successfulPayments.map((payment) => (
            <View key={payment.id} style={styles.paymentCard}>
              <View style={styles.paymentIcon}>
                <MaterialIcons
                  name="check-circle"
                  size={22}
                  color={COLORS.green}
                />
              </View>

              <View style={styles.paymentDetails}>
                <Text style={styles.paymentTitle} numberOfLines={2}>
                  {payment.description ?? "Traffic fine payment"}
                </Text>
                <Text style={styles.paymentReference}>
                  {payment.reference ?? payment.ticketId ?? payment.id}
                </Text>
                <Text style={styles.paymentDate}>
                  {formatDateTime(paymentDate(payment))}
                </Text>
                <Text style={styles.paymentMethod}>
                  {payment.methodLabel ?? payment.method ?? "Payment method unavailable"}
                </Text>
              </View>

              <View style={styles.paymentAmountContainer}>
                <Text style={styles.paymentAmount}>
                  {formatCurrency(amountOf(payment.amount))}
                </Text>
                <Text style={styles.paymentStatus}>Completed</Text>
              </View>
            </View>
          ))
        )}

        <View style={styles.footer}>
          <MaterialIcons
            name="lock-outline"
            size={17}
            color={COLORS.muted}
          />
          <Text style={styles.footerText}>
            Your financial records are linked to your citizen account.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  loadingIcon: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 17,
  },
  loadingTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.primary,
    marginTop: 13,
    marginBottom: 5,
  },
  muted: {
    fontSize: 13,
    color: COLORS.muted,
  },
  header: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 18,
  },
  headerAccent: {
    width: 4,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
    color: "#888888",
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: "#666666",
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 14,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },
  accountId: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 3,
  },
  balanceCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 19,
    padding: 19,
    marginBottom: 23,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  balanceTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 17,
  },
  balanceIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  balanceDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FFC857",
    marginRight: 6,
  },
  balancePillText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#FFFFFF",
  },
  balanceLabel: {
    fontSize: 13,
    color: "#D7E4F0",
  },
  balanceAmount: {
    fontSize: 31,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 4,
  },
  balanceCaption: {
    fontSize: 11,
    color: "#D7E4F0",
    marginTop: 4,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.22)",
    marginVertical: 18,
  },
  balanceBottom: {
    flexDirection: "row",
    alignItems: "center",
  },
  balanceMetric: {
    flex: 1,
  },
  balanceMetricDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.22)",
    marginHorizontal: 15,
  },
  balanceMetricLabel: {
    fontSize: 11,
    color: "#D7E4F0",
    marginBottom: 5,
  },
  balanceMetricValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  balancePaidValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#A9E7B0",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
    marginTop: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.primary,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 3,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "40%",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: "#F0F2F5",
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 3,
  },
  statAmount: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 9,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.redBg,
    borderRadius: 13,
    padding: 13,
    marginBottom: 17,
  },
  errorTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.red,
  },
  errorMessage: {
    fontSize: 11,
    color: "#7A4545",
    marginTop: 3,
  },
  retryButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  retryText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.red,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.primaryLight,
    borderRadius: 13,
    padding: 14,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#4D5D6B",
    marginLeft: 9,
  },
  countPill: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  countText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary,
  },
  filterRow: {
    paddingBottom: 13,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "#E2E7EC",
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#666666",
  },
  filterTextActive: {
    color: COLORS.white,
  },
  fineCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  fineHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  fineHeading: {
    flexDirection: "row",
    flex: 1,
    marginRight: 8,
  },
  fineIcon: {
    width: 41,
    height: 41,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  fineTitleContainer: {
    flex: 1,
  },
  fineTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
    color: COLORS.text,
  },
  reference: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 13,
  },
  detailsRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  detail: {
    flex: 1,
    paddingRight: 8,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: "#999999",
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333333",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },
  locationText: {
    flex: 1,
    fontSize: 11,
    color: "#666666",
    marginLeft: 5,
  },
  fineAmountBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F7F8FA",
    borderRadius: 11,
    padding: 12,
    marginBottom: 11,
  },
  fineAmount: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.primary,
  },
  dueDateBox: {
    alignItems: "flex-end",
  },
  dueDateText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#555555",
  },
  paidConfirmation: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.greenBg,
    borderRadius: 11,
    padding: 12,
  },
  paidConfirmationTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.green,
    marginLeft: 8,
  },
  paidConfirmationSubtext: {
    fontSize: 10,
    color: "#47754B",
    marginLeft: 8,
    marginTop: 3,
  },
  unpaidNote: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
  },
  unpaidNoteText: {
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 28,
    marginBottom: 20,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 7,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 19,
  },
  historyEmptyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  historyEmptyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
    marginLeft: 12,
  },
  historyEmptyText: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.muted,
    marginLeft: 12,
    marginTop: 4,
  },
  paymentCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F0F2F5",
  },
  paymentIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: COLORS.greenBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  paymentDetails: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
    lineHeight: 17,
  },
  paymentReference: {
    fontSize: 10,
    color: COLORS.primary,
    marginTop: 4,
  },
  paymentDate: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 4,
  },
  paymentMethod: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 4,
  },
  paymentAmountContainer: {
    alignItems: "flex-end",
    marginLeft: 7,
  },
  paymentAmount: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.green,
  },
  paymentStatus: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.green,
    marginTop: 5,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 17,
    paddingHorizontal: 8,
  },
  footerText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.muted,
    marginLeft: 6,
    textAlign: "center",
  },
});
