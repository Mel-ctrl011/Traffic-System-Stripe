
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";

import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";

/* =========================================================
   TYPES
========================================================= */

type Application = {
  id: string;
  applicationId?: string;
  reference?: string;
  service?: string;
  type?: string;
  status?: string;
  submittedAt?: any;
  createdAt?: any;
  updatedAt?: any;
  userId?: string;
  submittedBy?: string;
  vehicle?: {
    vehicleId?: string;
    registrationNumber?: string;
    vin?: string;
    make?: string;
    model?: string;
  };
  review?: {
    notes?: string | null;
    reviewedAt?: any;
  };
};

/* =========================================================
   STATUS CONFIG
========================================================= */

function getStatusConfig(status?: string) {
  const normalized = (status || "Submitted")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ");

  switch (normalized) {
    case "approved":
      return {
        label: "Approved",
        background: "#DCFCE7",
        text: "#15803D",
        icon: "checkmark-circle-outline" as const,
      };

    case "completed":
      return {
        label: "Completed",
        background: "#E2E8F0",
        text: "#475569",
        icon: "checkmark-done-outline" as const,
      };

    case "rejected":
      return {
        label: "Rejected",
        background: "#FEE2E2",
        text: "#B91C1C",
        icon: "close-circle-outline" as const,
      };

    case "pending":
      return {
        label: "Pending",
        background: "#FEF3C7",
        text: "#B45309",
        icon: "time-outline" as const,
      };

    case "processing":
      return {
        label: "Processing",
        background: "#DBEAFE",
        text: "#1D4ED8",
        icon: "sync-outline" as const,
      };

    case "in review":
    case "under review":
      return {
        label: "Under Review",
        background: "#F3E8FF",
        text: "#7E22CE",
        icon: "eye-outline" as const,
      };

    default:
      return {
        label:
          normalized.charAt(0).toUpperCase() +
          normalized.slice(1),
        background: "#EFF6FF",
        text: "#2563EB",
        icon: "paper-plane-outline" as const,
      };
  }
}

/* =========================================================
   DATE HELPERS
========================================================= */

function toDate(value: any): Date | null {
  if (!value) return null;

  try {
    let date: Date;

    if (typeof value.toDate === "function") {
      date = value.toDate();
    } else if (value instanceof Date) {
      date = value;
    } else {
      date = new Date(value);
    }

    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function formatDate(value?: any): string {
  const date = toDate(value);

  if (!date) return "Date unavailable";

  return date.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getApplicationTime(application: Application): number {
  const date = toDate(
    application.submittedAt || application.createdAt
  );

  return date ? date.getTime() : 0;
}

/* =========================================================
   APPLICATION TITLE
========================================================= */

function getApplicationTitle(application: Application): string {
  if (
    application.type === "ownership_transfer"
  ) {
    return "Change Vehicle Ownership";
  }

  return (
    application.service ||
    application.type ||
    "Citizen Service"
  );
}

/* =========================================================
   COMPONENT
========================================================= */

export default function ApplicationsDashboardScreen() {
  const navigation = useNavigation<any>();
  const { user, loading: authLoading } = useAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  /* =======================================================
     FETCH APPLICATIONS

     Supports:
     1. applications documents matched by userId.
     2. Legacy applications matched by submittedBy.
     3. Existing citizens/{idNumber}/applications documents.

     Results are combined and duplicate documents removed.
  ======================================================= */

  useEffect(() => {
    if (authLoading) return;

    const userId = user?.id;
    const idNumber = user?.idNumber;

    if (!userId && !idNumber) {
      setApplications([]);
      setLoading(false);
      setRefreshing(false);
      setFetchError(false);
      return;
    }

    setLoading(true);
    setFetchError(false);

    const sources: any[] = [];

    // Main collection: applications created by the logged-in user.
    if (userId) {
      sources.push(
        query(
          collection(db, "applications"),
          where("userId", "==", userId)
        )
      );
    }

    // Backward compatibility with older application records.
    if (idNumber) {
      sources.push(
        query(
          collection(db, "applications"),
          where("submittedBy", "==", idNumber)
        )
      );

      // Also support applications saved in the older
      // citizen-specific subcollection.
      sources.push(
        collection(
          db,
          "citizens",
          idNumber,
          "applications"
        )
      );
    }

    if (sources.length === 0) {
      setApplications([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const sourceRecords = new Map<number, Application[]>();
    const initializedSources = new Set<number>();
    const failedSources = new Set<number>();

    const publishApplications = () => {
      const combined = new Map<string, Application>();

      sourceRecords.forEach((records) => {
        records.forEach((application) => {
          const existing = combined.get(application.id);

          // Keep one copy of a document found by both queries.
          if (!existing) {
            combined.set(application.id, application);
          } else {
            combined.set(application.id, {
              ...existing,
              ...application,
              vehicle: {
                ...existing.vehicle,
                ...application.vehicle,
              },
            });
          }
        });
      });

      const sorted = Array.from(combined.values()).sort(
        (a, b) => getApplicationTime(b) - getApplicationTime(a)
      );

      setApplications(sorted);
      setFetchError(failedSources.size === sources.length);

      if (initializedSources.size === sources.length) {
        setLoading(false);
        setRefreshing(false);
      }
    };

    const unsubscribers = sources.map((source, index) =>
      onSnapshot(
        source,
        (snapshot) => {
          failedSources.delete(index);
          initializedSources.add(index);

          const records: Application[] = snapshot.docs.map(
            (document: any) => ({
              ...document.data(),
              id: document.id,
            })
          );

          sourceRecords.set(index, records);
          publishApplications();
        },
        (error) => {
          console.error(
            `Applications query ${index + 1} failed:`,
            error
          );

          failedSources.add(index);
          initializedSources.add(index);
          sourceRecords.set(index, []);

          publishApplications();
        }
      )
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    user?.id,
    user?.idNumber,
    authLoading,
  ]);

  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh = useCallback(() => {
    // Firestore listeners automatically receive fresh data.
    // This provides pull-to-refresh feedback.
    setRefreshing(true);

    setTimeout(() => {
      setRefreshing(false);
    }, 700);
  }, []);

  /* =======================================================
     OPEN APPLICATION

     Pass the document ID used by the existing
     ApplicationDetails route.
  ======================================================= */

  const openApplication = (application: Application) => {
    navigation.navigate("ApplicationDetails", {
      applicationId: application.id,
    });
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (authLoading || loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#0B4F8A" />

        <Text style={styles.loadingText}>
          Loading your applications...
        </Text>
      </View>
    );
  }

  /* =======================================================
     SUMMARY COUNTS
  ======================================================= */

  const totalApplications = applications.length;

  const activeApplications = applications.filter((application) => {
    const status = (application.status || "Submitted")
      .toLowerCase()
      .replace(/_/g, " ");

    return [
      "submitted",
      "pending",
      "processing",
      "in review",
      "under review",
    ].includes(status);
  }).length;

  const completedApplications = applications.filter((application) => {
    const status = (application.status || "").toLowerCase();

    return status === "approved" || status === "completed";
  }).length;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <View style={styles.screen}>
      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-back"
            size={21}
            color="#17212B"
          />
        </TouchableOpacity>

        <View style={styles.headerInformation}>
          <Text style={styles.headerTitle}>
            Applications
          </Text>

          <Text style={styles.headerSubtitle}>
            View and track your applications
          </Text>
        </View>
      </View>

      {/* CONTENT */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* SUMMARY CARD */}

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIcon}>
              <Ionicons
                name="documents-outline"
                size={24}
                color="#0B4F8A"
              />
            </View>

            <View style={styles.summaryInformation}>
              <Text style={styles.summaryTitle}>
                Your Applications
              </Text>

              <Text style={styles.summaryDescription}>
                Track applications submitted through Citizen Services.
              </Text>
            </View>
          </View>

          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatNumber}>
                {totalApplications}
              </Text>
              <Text style={styles.summaryStatLabel}>
                Total
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatNumber}>
                {activeApplications}
              </Text>
              <Text style={styles.summaryStatLabel}>
                Active
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatNumber}>
                {completedApplications}
              </Text>
              <Text style={styles.summaryStatLabel}>
                Completed
              </Text>
            </View>
          </View>
        </View>

        {/* FETCH ERROR */}

        {fetchError && (
          <View style={styles.errorBox}>
            <Ionicons
              name="cloud-offline-outline"
              size={21}
              color="#B42318"
            />

            <View style={{ flex: 1, marginLeft: 9 }}>
              <Text style={styles.errorTitle}>
                Could not load all applications
              </Text>

              <Text style={styles.errorText}>
                Check your connection and pull down to refresh.
                Some application records may be unavailable.
              </Text>
            </View>
          </View>
        )}

        {/* SECTION HEADER */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Application History
          </Text>

          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {applications.length}
            </Text>
          </View>
        </View>

        {/* EMPTY STATE */}

        {applications.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="document-text-outline"
                size={30}
                color="#64748B"
              />
            </View>

            <Text style={styles.emptyTitle}>
              {fetchError
                ? "Applications unavailable"
                : "No Applications Yet"}
            </Text>

            <Text style={styles.emptyText}>
              {fetchError
                ? "We could not retrieve your application records. Please try again."
                : "Applications you submit through Citizen Services will appear here."}
            </Text>
          </View>
        )}

        {/* APPLICATION LIST */}

        {applications.map((application) => {
          const status = getStatusConfig(application.status);

          const reference =
            application.reference ||
            application.applicationId ||
            application.id;

          const vehicleName = [
            application.vehicle?.make,
            application.vehicle?.model,
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <TouchableOpacity
              key={application.id}
              style={styles.applicationCard}
              activeOpacity={0.8}
              onPress={() => openApplication(application)}
            >
              <View style={styles.applicationIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={23}
                  color="#0B4F8A"
                />
              </View>

              <View style={styles.applicationInformation}>
                <Text
                  style={styles.applicationTitle}
                  numberOfLines={2}
                >
                  {getApplicationTitle(application)}
                </Text>

                {!!vehicleName && (
                  <Text style={styles.vehicleName}>
                    {vehicleName}
                  </Text>
                )}

                {!!application.vehicle?.registrationNumber && (
                  <View style={styles.vehicleRow}>
                    <Ionicons
                      name="car-outline"
                      size={13}
                      color="#64748B"
                    />

                    <Text style={styles.vehicleText}>
                      {application.vehicle.registrationNumber}
                    </Text>
                  </View>
                )}

                <View style={styles.metaRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={13}
                    color="#64748B"
                  />

                  <Text style={styles.metaText}>
                    Submitted{" "}
                    {formatDate(
                      application.submittedAt ||
                        application.createdAt
                    )}
                  </Text>
                </View>

                <Text style={styles.reference}>
                  Reference: {reference}
                </Text>

                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: status.background },
                  ]}
                >
                  <Ionicons
                    name={status.icon}
                    size={13}
                    color={status.text}
                  />

                  <Text
                    style={[
                      styles.statusText,
                      { color: status.text },
                    ]}
                  >
                    {status.label}
                  </Text>
                </View>
              </View>

              <Ionicons
                name="chevron-forward"
                size={19}
                color="#94A3B8"
              />
            </TouchableOpacity>
          );
        })}

        {/* INFORMATION */}

        {applications.length > 0 && (
          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#0B4F8A"
            />

            <Text style={styles.infoText}>
              Application statuses are updated as your applications
              move through the processing stages.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#64748B",
  },

  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 17,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerInformation: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#17212B",
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#66737F",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D9E0E6",
    marginBottom: 24,
  },

  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EAF3FA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  summaryInformation: {
    flex: 1,
  },

  summaryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#083B68",
  },

  summaryDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#66737F",
  },

  summaryStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  summaryStat: {
    flex: 1,
    alignItems: "center",
  },

  summaryStatNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#17212B",
  },

  summaryStatLabel: {
    marginTop: 3,
    fontSize: 10,
    color: "#66737F",
    fontWeight: "600",
  },

  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#D9E0E6",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  sectionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: "#17212B",
  },

  countBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: "#EAF3FA",
    alignItems: "center",
    justifyContent: "center",
  },

  countText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0B4F8A",
  },

  applicationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#D9E0E6",
  },

  applicationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EAF3FA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  applicationInformation: {
    flex: 1,
  },

  applicationTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#17212B",
    lineHeight: 20,
  },

  vehicleName: {
    marginTop: 6,
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },

  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },

  vehicleText: {
    marginLeft: 5,
    fontSize: 11,
    color: "#475569",
    fontWeight: "700",
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },

  metaText: {
    marginLeft: 5,
    fontSize: 11,
    color: "#66737F",
  },

  reference: {
    marginTop: 5,
    fontSize: 10,
    color: "#64748B",
  },

  statusBadge: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  statusText: {
    marginLeft: 5,
    fontSize: 10,
    fontWeight: "800",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D9E0E6",
    padding: 28,
    alignItems: "center",
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#17212B",
  },

  emptyText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: "#66737F",
    textAlign: "center",
  },

  errorBox: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FEECEC",
    flexDirection: "row",
    alignItems: "flex-start",
  },

  errorTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#B42318",
  },

  errorText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 17,
    color: "#7F1D1D",
  },

  infoBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#EAF3FA",
    flexDirection: "row",
    alignItems: "flex-start",
  },

  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    lineHeight: 17,
    color: "#475569",
  },
});
