
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../services/firebase";

type Fine = {
  fineId?: string;
  ticketId?: string;
  reference?: string;
  offence?: string;
  description?: string;
  category?: string;
  type?: string;
  amount?: number | string;
  fineAmount?: number | string;
  outstandingAmount?: number | string;
  status?: string;
  paymentStatus?: string;
  citizenId?: string;
  date?: string;
  createdAt?: unknown;
};

type FineRecord = Fine & {
  documentId?: string;
  allowMissingStatus?: boolean;
};

type OutstandingAmountCardProps = {
  citizenId: string;
  onPress?: () => void;
};

const COLORS = {
  primary: "#0B4F8A",
  primaryDark: "#083B68",
  background: "#FFFFFF",
  softBlue: "#EAF3FA",
  text: "#17212B",
  muted: "#66737F",
  border: "#E1E8EF",
  danger: "#B42318",
  dangerBackground: "#FEF3F2",
  success: "#18794E",
  successBackground: "#ECFDF3",
};

const normalizeStatus = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const getFineStatus = (fine: FineRecord): string[] =>
  [fine.paymentStatus, fine.status]
    .filter(
      (value) =>
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
    )
    .map(normalizeStatus);

const isOutstandingFine = (fine: FineRecord): boolean => {
  const statuses = getFineStatus(fine);

  if (statuses.includes("disputed")) {
    return false;
  }

  const excludedStatuses = [
    "paid",
    "settled",
    "completed",
    "cancelled",
    "canceled",
    "void",
    "voided",
    "waived",
  ];

  if (statuses.some((status) => excludedStatuses.includes(status))) {
    return false;
  }

  const payableStatuses = [
    "outstanding",
    "unpaid",
    "overdue",
  ];

  if (statuses.some((status) => payableStatuses.includes(status))) {
    return true;
  }

  return (
    statuses.length === 0 &&
    fine.allowMissingStatus === true
  );
};

const getFineAmount = (fine: FineRecord): number => {
  const rawAmount =
    fine.outstandingAmount ??
    fine.amount ??
    fine.fineAmount ??
    0;

  const amount =
    typeof rawAmount === "number"
      ? rawAmount
      : Number(rawAmount);

  return Number.isFinite(amount) && amount > 0
    ? amount
    : 0;
};

const getFineIdentifiers = (fine: FineRecord): string[] =>
  [
    fine.documentId,
    fine.fineId,
    fine.ticketId,
    fine.reference,
  ]
    .filter(
      (value): value is string =>
        typeof value === "string" &&
        value.trim().length > 0
    )
    .map((value) => value.trim().toLowerCase());

export default function OutstandingAmountCard({
  citizenId,
  onPress,
}: OutstandingAmountCardProps) {
  const [total, setTotal] = useState(0);
  const [fineCount, setFineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;

    const loadOutstandingFines = async () => {
      if (!citizenId.trim()) {
        setTotal(0);
        setFineCount(0);
        setLoading(false);
        setLoadFailed(false);
        return;
      }

      try {
        setLoading(true);
        setLoadFailed(false);

        // Load fines belonging to this citizen.
        const finesQuery = query(
          collection(db, "fines"),
          where("citizenId", "==", citizenId)
        );

        const finesSnapshot = await getDocs(finesQuery);

        const allFines: FineRecord[] =
          finesSnapshot.docs.map((fineDocument) => ({
            ...(fineDocument.data() as Fine),
            documentId: fineDocument.id,
            allowMissingStatus: false,
          }));

        // Keep support for older embedded citizen records.
        const citizenSnapshot = await getDoc(
          doc(db, "citizens", citizenId)
        );

        if (citizenSnapshot.exists()) {
          const citizenData = citizenSnapshot.data();

          const embeddedFines: Fine[] = Array.isArray(
            citizenData.fines
          )
            ? citizenData.fines
            : [];

          allFines.push(
            ...embeddedFines.map((fine) => ({
              ...fine,
              allowMissingStatus: true,
            }))
          );
        }

        // Prevent the same fine from being counted twice.
        const seenIdentifiers = new Set<string>();
        const uniqueFines: FineRecord[] = [];

        for (const fine of allFines) {
          const identifiers = getFineIdentifiers(fine);

          const alreadyExists = identifiers.some((identifier) =>
            seenIdentifiers.has(identifier)
          );

          if (alreadyExists) {
            continue;
          }

          uniqueFines.push(fine);

          identifiers.forEach((identifier) =>
            seenIdentifiers.add(identifier)
          );
        }

        const outstandingFines = uniqueFines.filter(
          isOutstandingFine
        );

        const amount = outstandingFines.reduce(
          (sum, fine) => sum + getFineAmount(fine),
          0
        );

        if (active) {
          setTotal(amount);
          setFineCount(outstandingFines.length);
        }
      } catch (error) {
        console.error(
          "Failed to load outstanding fines:",
          error
        );

        if (active) {
          setTotal(0);
          setFineCount(0);
          setLoadFailed(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadOutstandingFines();

    return () => {
      active = false;
    };
  }, [citizenId]);

  const formattedAmount = total.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const hasOutstanding = total > 0;
  const hasFines = fineCount > 0;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.92}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        loading
          ? "View outstanding fines"
          : `Outstanding fines: ${formattedAmount} rand. View your fines`
      }
    >
      {/* TOP HEADER */}
      <View style={styles.headerRow}>
        <View style={styles.iconBox}>
          <Ionicons
            name="wallet-outline"
            size={24}
            color={COLORS.primary}
          />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>
            YOUR FINANCES
          </Text>

          <Text style={styles.title}>
            Outstanding fines
          </Text>

          <Text style={styles.subtitle}>
            Your unpaid traffic fines in one place
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={21}
          color={COLORS.muted}
        />
      </View>

      {/* BALANCE PANEL */}
      <View
        style={[
          styles.balancePanel,
          !loading &&
            !loadFailed &&
            !hasOutstanding &&
            styles.balancePanelClear,
        ]}
      >
        <View style={styles.balanceTopRow}>
          <Text style={styles.balanceLabel}>
            {loadFailed
              ? "BALANCE UNAVAILABLE"
              : "TOTAL AMOUNT DUE"}
          </Text>

          {!loading && !loadFailed && (
            <View
              style={[
                styles.statusBadge,
                hasOutstanding
                  ? styles.statusBadgeDue
                  : styles.statusBadgeClear,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: hasOutstanding
                      ? COLORS.danger
                      : COLORS.success,
                  },
                ]}
              />

              <Text
                style={[
                  styles.statusText,
                  {
                    color: hasOutstanding
                      ? COLORS.danger
                      : COLORS.success,
                  },
                ]}
              >
                {hasOutstanding ? "Payment due" : "All clear"}
              </Text>
            </View>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
            />
            <Text style={styles.loadingText}>
              Checking your fines...
            </Text>
          </View>
        ) : loadFailed ? (
          <View style={styles.errorRow}>
            <Ionicons
              name="cloud-offline-outline"
              size={22}
              color={COLORS.danger}
            />
            <Text style={styles.errorText}>
              We couldn't load your balance. Tap to try again.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.amountRow}>
              <Text
                style={[
                  styles.currency,
                  {
                    color: hasOutstanding
                      ? COLORS.primary
                      : COLORS.success,
                  },
                ]}
              >
                R
              </Text>

              <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={styles.amount}
              >
                {formattedAmount}
              </Text>
            </View>

            <Text style={styles.balanceDescription}>
              {hasOutstanding
                ? "This is the amount still waiting to be paid."
                : "You're all caught up. You have no unpaid fines."}
            </Text>
          </>
        )}
      </View>

      {/* BOTTOM SUMMARY */}
      {!loading && !loadFailed && (
        <View style={styles.footer}>
          <View style={styles.fineInfo}>
            <View
              style={[
                styles.fineInfoIcon,
                {
                  backgroundColor: hasOutstanding
                    ? COLORS.dangerBackground
                    : COLORS.successBackground,
                },
              ]}
            >
              <Ionicons
                name={
                  hasOutstanding
                    ? "receipt-outline"
                    : "checkmark-circle-outline"
                }
                size={19}
                color={
                  hasOutstanding
                    ? COLORS.danger
                    : COLORS.success
                }
              />
            </View>

            <View style={styles.fineInfoTextContainer}>
              <Text style={styles.fineInfoTitle}>
                {hasOutstanding
                  ? `${fineCount} ${
                      fineCount === 1 ? "fine" : "fines"
                    } to settle`
                  : "No payments needed"}
              </Text>

              <Text style={styles.fineInfoSubtitle}>
                {hasOutstanding
                  ? "Review the details and due dates"
                  : "Your outstanding balance is zero"}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.actionButton,
              !hasOutstanding && styles.actionButtonSecondary,
            ]}
          >
            <Text
              style={[
                styles.actionButtonText,
                !hasOutstanding && styles.actionButtonTextSecondary,
              ]}
            >
              {hasOutstanding ? "View fines" : "View history"}
            </Text>

            <Ionicons
              name="arrow-forward"
              size={16}
              color={
                hasOutstanding ? "#FFFFFF" : COLORS.primary
              }
            />
          </View>
        </View>
      )}

      {/* SMALL HELP TEXT */}
      {!loading && !loadFailed && hasFines && (
        <View style={styles.helpRow}>
          <Ionicons
            name="information-circle-outline"
            size={15}
            color={COLORS.muted}
          />
          <Text style={styles.helpText}>
            Tap this card to see your fine details.
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 18,
    padding: 17,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#18364D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 17,
  },

  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerText: {
    flex: 1,
    marginRight: 6,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.primary,
    marginBottom: 4,
  },

  title: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
    color: COLORS.text,
  },

  subtitle: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.muted,
  },

  balancePanel: {
    backgroundColor: "#F4F8FC",
    borderWidth: 1,
    borderColor: "#E0EBF5",
    borderRadius: 15,
    padding: 16,
  },

  balancePanelClear: {
    backgroundColor: "#F2FBF5",
    borderColor: "#D6F0DF",
  },

  balanceTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },

  balanceLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: COLORS.muted,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  statusBadgeDue: {
    backgroundColor: "#FCE8E6",
  },

  statusBadgeClear: {
    backgroundColor: "#DDF7E5",
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },

  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 1,
  },

  currency: {
    fontSize: 23,
    fontWeight: "800",
    marginRight: 5,
  },

  amount: {
    flexShrink: 1,
    fontSize: 36,
    lineHeight: 43,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.8,
    fontVariant: ["tabular-nums"],
  },

  balanceDescription: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.muted,
  },

  loadingRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  loadingText: {
    fontSize: 13,
    color: COLORS.muted,
  },

  errorRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.danger,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 15,
  },

  fineInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  fineInfoIcon: {
    width: 37,
    height: 37,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  fineInfoTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  fineInfoTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.text,
  },

  fineInfoSubtitle: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.muted,
  },

  actionButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
  },

  actionButtonSecondary: {
    backgroundColor: COLORS.softBlue,
  },

  actionButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  actionButtonTextSecondary: {
    color: COLORS.primary,
  },

  helpRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EDF0F2",
    gap: 6,
  },

  helpText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.muted,
  },
});
