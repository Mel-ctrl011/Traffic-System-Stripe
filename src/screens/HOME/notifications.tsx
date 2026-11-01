
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";

const COLORS = {
  primary: "#003366",
  background: "#F4F7FB",
  card: "#FFFFFF",
  border: "#E1E7EF",
  text: "#17202A",
  muted: "#6B7280",
  softBlue: "#EAF2F8",
  softGreen: "#E8F7EE",
  green: "#16803D",
  softRed: "#FDECEC",
  red: "#C53030",
  softYellow: "#FFF7DD",
  warning: "#B7791F",
};

type ProfileChangeRequest = {
  id: string;
  userId?: string;
  status?: string;
  requestedChanges?: Record<string, any>;
  rejectionReason?: string;
  reason?: string;
  createdAt?: any;
  reviewedAt?: any;
  updatedAt?: any;
};

function formatDate(value: any): string {
  if (!value) return "Date unavailable";

  try {
    const date =
      typeof value?.toDate === "function"
        ? value.toDate()
        : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Date unavailable";
  }
}

function getRequestDescription(
  requestedChanges?: Record<string, any>
): string {
  if (!requestedChanges) {
    return "Your profile change request";
  }

  const fields = Object.keys(requestedChanges).map((key) => {
    switch (key.toLowerCase()) {
      case "email":
        return "email address";
      case "phone":
      case "phonenumber":
        return "phone number";
      case "fullname":
        return "full name";
      default:
        return key.replace(/([A-Z])/g, " $1").toLowerCase();
    }
  });

  if (fields.length === 0) {
    return "Your profile change request";
  }

  return `Requested changes: ${fields.join(", ")}`;
}

function getStatusDetails(status?: string) {
  switch ((status || "pending").toLowerCase()) {
    case "approved":
      return {
        label: "Approved",
        color: COLORS.green,
        background: COLORS.softGreen,
        icon: "checkmark-circle-outline" as const,
        title: "Your request was approved",
        message:
          "The administrator has approved your profile change request.",
      };

    case "rejected":
      return {
        label: "Rejected",
        color: COLORS.red,
        background: COLORS.softRed,
        icon: "close-circle-outline" as const,
        title: "Your request was rejected",
        message:
          "The administrator did not approve your profile change request.",
      };

    default:
      return {
        label: "Pending",
        color: COLORS.warning,
        background: COLORS.softYellow,
        icon: "time-outline" as const,
        title: "Waiting for review",
        message:
          "Your request is waiting for an administrator to review it.",
      };
  }
}

export default function NotificationsScreen() {
  const { user, loading: authLoading } = useAuth() as any;

  const [requests, setRequests] = useState<ProfileChangeRequest[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  // Use the same citizen identifier stored in profileChangeRequests.userId.
  const citizenKey = String(
    user?.id ??
      user?.userId ??
      user?.idNumber ??
      ""
  ).trim();

  const currentUserName = String(
    user?.fullName ?? user?.name ?? "Current user"
  ).trim();

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!citizenKey) {
      setRequests([]);
      setFetching(false);
      setError(
        "No signed-in citizen account was found. Please sign in again."
      );
      return;
    }

    setFetching(true);
    setError("");

    const requestsQuery = query(
      collection(db, "profileChangeRequests"),
      where("userId", "==", citizenKey)
    );

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const results: ProfileChangeRequest[] = snapshot.docs.map(
          (requestDoc) => ({
            id: requestDoc.id,
            ...requestDoc.data(),
          })
        );

        // Newest requests first.
        results.sort((a, b) => {
          const dateA =
            a.createdAt?.toMillis?.() ??
            (a.createdAt ? new Date(a.createdAt).getTime() : 0);

          const dateB =
            b.createdAt?.toMillis?.() ??
            (b.createdAt ? new Date(b.createdAt).getTime() : 0);

          return dateB - dateA;
        });

        setRequests(results);
        setFetching(false);
        setError("");
      },
      (listenerError) => {
        console.error(
          "Notifications Firestore error:",
          listenerError
        );

        setError(
          "Unable to load your updates. Please check your connection or account permissions."
        );
        setFetching(false);
      }
    );

    return unsubscribe;
  }, [citizenKey, authLoading]);

  const approvedCount = requests.filter(
    (request) =>
      (request.status || "").toLowerCase() === "approved"
  ).length;

  const rejectedCount = requests.filter(
    (request) =>
      (request.status || "").toLowerCase() === "rejected"
  ).length;

  const pendingCount = requests.filter(
    (request) =>
      !["approved", "rejected"].includes(
        (request.status || "pending").toLowerCase()
      )
  ).length;

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="notifications-outline"
              size={24}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.headerInformation}>
            <Text style={styles.eyebrow}>TRAFFICCONNECT SA</Text>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              Your personal updates and request decisions
            </Text>
          </View>
        </View>

        {/* Current user */}
        <View style={styles.userCard}>
          <View style={styles.userIcon}>
            <Ionicons
              name="person-outline"
              size={23}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.userInformation}>
            <Text style={styles.userLabel}>
              NOTIFICATION ACCOUNT
            </Text>
            <Text style={styles.userName} numberOfLines={2}>
              {authLoading ? "Loading account..." : currentUserName}
            </Text>
            <Text style={styles.userDescription}>
              Updates linked to your signed-in account.
            </Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{pendingCount}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text
              style={[styles.summaryNumber, { color: COLORS.green }]}
            >
              {approvedCount}
            </Text>
            <Text style={styles.summaryLabel}>Approved</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text
              style={[styles.summaryNumber, { color: COLORS.red }]}
            >
              {rejectedCount}
            </Text>
            <Text style={styles.summaryLabel}>Rejected</Text>
          </View>
        </View>

        {/* Requests */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your updates</Text>
          <Text style={styles.sectionDescription}>
            Administrator decisions appear here automatically.
          </Text>
        </View>

        {authLoading || fetching ? (
          <View style={styles.stateCard}>
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
            />
            <Text style={styles.stateText}>
              Loading your notifications...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Ionicons
              name="alert-circle-outline"
              size={34}
              color={COLORS.red}
            />
            <Text style={styles.emptyTitle}>
              Could not load updates
            </Text>
            <Text style={styles.stateText}>{error}</Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="notifications-off-outline"
                size={30}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No notifications yet
            </Text>
            <Text style={styles.stateText}>
              When you submit a profile change request, its status
              and the administrator's decision will appear here.
            </Text>
          </View>
        ) : (
          requests.map((request) => {
            const status = getStatusDetails(request.status);
            const rejectionReason =
              request.rejectionReason || request.reason || "";

            return (
              <View key={request.id} style={styles.notificationCard}>
                <View style={styles.notificationTop}>
                  <View
                    style={[
                      styles.notificationIcon,
                      { backgroundColor: status.background },
                    ]}
                  >
                    <Ionicons
                      name={status.icon}
                      size={25}
                      color={status.color}
                    />
                  </View>

                  <View style={styles.notificationHeading}>
                    <Text style={styles.notificationTitle}>
                      {status.title}
                    </Text>

                    <Text style={styles.notificationDate}>
                      Submitted: {formatDate(request.createdAt)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: status.background },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: status.color },
                      ]}
                    >
                      {status.label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.notificationDescription}>
                  {getRequestDescription(request.requestedChanges)}
                </Text>

                <Text style={styles.notificationMessage}>
                  {status.message}
                </Text>

                {status.label === "Rejected" && rejectionReason ? (
                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonLabel}>
                      ADMINISTRATOR'S REASON
                    </Text>
                    <Text style={styles.reasonText}>
                      {rejectionReason}
                    </Text>
                  </View>
                ) : null}

                {status.label !== "Pending" && request.reviewedAt ? (
                  <Text style={styles.reviewedDate}>
                    Reviewed: {formatDate(request.reviewedAt)}
                  </Text>
                ) : null}
              </View>
            );
          })
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons
            name="shield-checkmark-outline"
            size={17}
            color={COLORS.muted}
          />
          <Text style={styles.footerText}>
            These updates are retrieved from your TrafficConnect SA
            account. Only requests matching your citizen ID are shown.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 25,
    paddingBottom: 40,
  },
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
    marginRight: 13,
  },
  headerInformation: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.primary,
  },
  title: {
    fontSize: 25,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 3,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 3,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 15,
    marginBottom: 16,
  },
  userIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  userInformation: {
    flex: 1,
  },
  userLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: COLORS.muted,
  },
  userName: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 4,
  },
  userDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.muted,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 26,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: "center",
  },
  summaryNumber: {
    fontSize: 23,
    fontWeight: "800",
    color: COLORS.warning,
  },
  summaryLabel: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 4,
    fontWeight: "700",
  },
  sectionHeader: {
    marginBottom: 13,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
  },
  sectionDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.muted,
    marginTop: 4,
  },
  stateCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 25,
    minHeight: 170,
  },
  stateText: {
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 10,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
    marginTop: 10,
  },
  notificationCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
  },
  notificationTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  notificationIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  notificationHeading: {
    flex: 1,
    marginRight: 6,
  },
  notificationTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  notificationDate: {
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.muted,
    marginTop: 5,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "800",
  },
  notificationDescription: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 15,
  },
  notificationMessage: {
    fontSize: 11,
    lineHeight: 18,
    color: COLORS.muted,
    marginTop: 7,
  },
  reasonBox: {
    backgroundColor: COLORS.softRed,
    borderRadius: 10,
    padding: 12,
    marginTop: 13,
  },
  reasonLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: COLORS.red,
  },
  reasonText: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.text,
    marginTop: 5,
  },
  reviewedDate: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 12,
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 20,
    paddingHorizontal: 8,
  },
  footerText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 16,
    color: COLORS.muted,
    marginLeft: 8,
  },
});
