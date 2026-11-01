
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useNavigation } from "@react-navigation/native";

import { useAuth } from "../../context/AuthContext";

import {
  Application,
  ApplicationStatus,
  getCitizenApplications,
} from "../../services/applicationService";

/* =========================================================
   SCREEN
========================================================= */

export default function ApplicationHistorys() {
  const navigation = useNavigation();

  const { user, loading: authLoading } = useAuth();

  const [applications, setApplications] =
    useState<Application[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /* =======================================================
     LOAD APPLICATIONS
  ======================================================= */

  const loadApplications = useCallback(
    async (isRefresh = false) => {
      console.log(
        "[ApplicationHistory] ================================="
      );

      console.log(
        "[ApplicationHistory] Loading applications..."
      );

      console.log(
        "[ApplicationHistory] User:",
        user
      );

      if (!user) {
        console.log(
          "[ApplicationHistory] No logged-in user."
        );

        setApplications([]);
        setLoading(false);
        return;
      }

      /*
       * Your AuthContext currently doesn't explicitly
       * expose the citizen document ID.
       *
       * Because the appointment/application system needs
       * the citizen ID, we use the stored userId.
       */

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        console.log(
          "[ApplicationHistory] Fetching userId..."
        );

        /*
         * IMPORTANT:
         *
         * Your AuthContext saves:
         *
         * AsyncStorage.setItem("userId", ...)
         *
         * So we retrieve it here.
         */

        const AsyncStorage =
          require(
            "@react-native-async-storage/async-storage"
          ).default;

        const citizenId =
          await AsyncStorage.getItem("userId");

        console.log(
          "[ApplicationHistory] citizenId:",
          citizenId
        );

        if (!citizenId) {
          console.log(
            "[ApplicationHistory] No citizen ID found."
          );

          setApplications([]);

          setError(
            "We couldn't identify your account."
          );

          return;
        }

        const result =
          await getCitizenApplications(
            citizenId
          );

        console.log(
          "[ApplicationHistory] Result:",
          result
        );

        setApplications(result);
      } catch (err) {
        console.error(
          "[ApplicationHistory] ERROR:",
          err
        );

        setError(
          "Unable to load your applications. Please try again."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);

        console.log(
          "[ApplicationHistory] Loading finished."
        );

        console.log(
          "[ApplicationHistory] ================================="
        );
      }
    },
    [user]
  );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    if (!authLoading) {
      loadApplications();
    }
  }, [
    authLoading,
    loadApplications,
  ]);

  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh = async () => {
    console.log(
      "[ApplicationHistory] Pull-to-refresh"
    );

    await loadApplications(true);
  };

  /* =======================================================
     COUNTS
  ======================================================= */

  const activeApplications =
    applications.filter(
      (application) =>
        application.status === "Pending" ||
        application.status === "Processing" ||
        application.status === "Approved"
    );

  const completedApplications =
    applications.filter(
      (application) =>
        application.status === "Completed" ||
        application.status === "Rejected"
    );

  /* =======================================================
     LOADING
  ======================================================= */

  if (authLoading || loading) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingIcon}>
          <Ionicons
            name="document-text-outline"
            size={28}
            color="#2563EB"
          />
        </View>

        <ActivityIndicator
          size="small"
          color="#2563EB"
        />

        <Text style={styles.loadingTitle}>
          Loading applications
        </Text>

        <Text style={styles.loadingDescription}>
          Please wait while we retrieve your application
          history.
        </Text>
      </View>
    );
  }

  /* =======================================================
     SCREEN
  ======================================================= */

  return (
    <View style={styles.screen}>

      {/* =================================================
          HEADER
      ================================================= */}

      <View style={styles.header}>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            navigation.goBack()
          }
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#1E293B"
          />
        </TouchableOpacity>

        <View style={styles.headerInformation}>

          <Text style={styles.headerTitle}>
            Application History
          </Text>

          <Text style={styles.headerSubtitle}>
            Track applications you've submitted
          </Text>

        </View>

      </View>

      {/* =================================================
          CONTENT
      ================================================= */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#2563EB"
          />
        }
      >

        {/* =================================================
            SUMMARY
        ================================================= */}

        <View style={styles.summaryCard}>

          <View style={styles.summaryIcon}>
            <Ionicons
              name="document-text-outline"
              size={26}
              color="#2563EB"
            />
          </View>

          <View style={styles.summaryInformation}>

            <Text style={styles.summaryTitle}>
              Your Applications
            </Text>

            <Text style={styles.summaryDescription}>
              Track the progress of applications submitted
              through Moova.
            </Text>

          </View>

        </View>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <View style={styles.errorBox}>

            <Ionicons
              name="alert-circle-outline"
              size={22}
              color="#B91C1C"
            />

            <View style={styles.errorInformation}>

              <Text style={styles.errorTitle}>
                Something went wrong
              </Text>

              <Text style={styles.errorText}>
                {error}
              </Text>

              <TouchableOpacity
                style={styles.retryButton}
                onPress={() =>
                  loadApplications()
                }
              >
                <Text style={styles.retryText}>
                  Try Again
                </Text>
              </TouchableOpacity>

            </View>

          </View>
        )}

        {/* =================================================
            ACTIVE APPLICATIONS
        ================================================= */}

        <View style={styles.sectionHeader}>

          <Text style={styles.sectionTitle}>
            Active Applications
          </Text>

          <View style={styles.countBadge}>

            <Text style={styles.countText}>
              {activeApplications.length}
            </Text>

          </View>

        </View>

        {activeApplications.length === 0 ? (
          <EmptyState
            icon="document-outline"
            title="No active applications"
            description="You don't currently have any applications being processed."
          />
        ) : (
          activeApplications.map(
            (application) => (
              <ApplicationCard
                key={application.id}
                application={application}
              />
            )
          )
        )}

        {/* =================================================
            PREVIOUS APPLICATIONS
        ================================================= */}

        <View
          style={[
            styles.sectionHeader,
            styles.previousHeader,
          ]}
        >

          <Text style={styles.sectionTitle}>
            Previous Applications
          </Text>

          <View style={styles.countBadge}>

            <Text style={styles.countText}>
              {completedApplications.length}
            </Text>

          </View>

        </View>

        {completedApplications.length === 0 ? (
          <EmptyState
            icon="time-outline"
            title="No previous applications"
            description="Completed or rejected applications will appear here."
          />
        ) : (
          completedApplications.map(
            (application) => (
              <ApplicationCard
                key={application.id}
                application={application}
              />
            )
          )
        )}

        {/* =================================================
            INFORMATION
        ================================================= */}

        <View style={styles.infoBox}>

          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#2563EB"
          />

          <Text style={styles.infoText}>
            Application statuses are updated as your
            application moves through the processing stages.
          </Text>

        </View>

      </ScrollView>

    </View>
  );
}

/* =========================================================
   APPLICATION CARD
========================================================= */

function ApplicationCard({
  application,
}: {
  application: Application;
}) {
  const statusStyle =
    getStatusStyle(
      application.status
    );

  return (
    <TouchableOpacity
      style={styles.applicationCard}
      activeOpacity={0.8}
      onPress={() => {
        console.log(
          "[ApplicationHistory] Application selected:",
          application
        );
      }}
    >

      {/* ICON */}

      <View style={styles.applicationIcon}>

        <Ionicons
          name="document-text-outline"
          size={23}
          color="#2563EB"
        />

      </View>

      {/* INFORMATION */}

      <View style={styles.applicationInformation}>

        <Text
          style={styles.applicationTitle}
          numberOfLines={2}
        >
          {application.type}
        </Text>

        <Text
          style={styles.applicationDescription}
          numberOfLines={3}
        >
          {application.description}
        </Text>

        {/* DATE */}

        <View style={styles.applicationMeta}>

          <View style={styles.metaRow}>

            <Ionicons
              name="calendar-outline"
              size={14}
              color="#64748B"
            />

            <Text style={styles.metaText}>
              Submitted {application.submittedDate}
            </Text>

          </View>

          <Text style={styles.reference}>
            {application.reference}
          </Text>

        </View>

        {/* STATUS */}

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                statusStyle.background,
            },
          ]}
        >

          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  statusStyle.text,
              },
            ]}
          />

          <Text
            style={[
              styles.statusText,
              {
                color:
                  statusStyle.text,
              },
            ]}
          >
            {application.status}
          </Text>

        </View>

      </View>

      {/* CHEVRON */}

      <View style={styles.chevronContainer}>

        <Ionicons
          name="chevron-forward"
          size={18}
          color="#94A3B8"
        />

      </View>

    </TouchableOpacity>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.emptyState}>

      <View style={styles.emptyIcon}>

        <Ionicons
          name={icon}
          size={26}
          color="#64748B"
        />

      </View>

      <Text style={styles.emptyTitle}>
        {title}
      </Text>

      <Text style={styles.emptyDescription}>
        {description}
      </Text>

    </View>
  );
}

/* =========================================================
   STATUS STYLE
========================================================= */

function getStatusStyle(
  status: ApplicationStatus
) {
  switch (status) {

    case "Pending":
      return {
        background: "#FEF3C7",
        text: "#B45309",
      };

    case "Processing":
      return {
        background: "#DBEAFE",
        text: "#1D4ED8",
      };

    case "Approved":
      return {
        background: "#DCFCE7",
        text: "#15803D",
      };

    case "Completed":
      return {
        background: "#E2E8F0",
        text: "#475569",
      };

    case "Rejected":
      return {
        background: "#FEE2E2",
        text: "#B91C1C",
      };

    default:
      return {
        background: "#E2E8F0",
        text: "#475569",
      };
  }
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({

  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  /* =======================================================
     LOADING
  ======================================================= */

  loadingScreen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },

  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  loadingTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },

  loadingDescription: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
  },

  /* =======================================================
     HEADER
  ======================================================= */

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    backgroundColor: "#FFFFFF",
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
    minWidth: 0,
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#1E293B",
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#64748B",
  },

  /* =======================================================
     SCROLL
  ======================================================= */

  scrollView: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60,
  },

  /* =======================================================
     SUMMARY
  ======================================================= */

  summaryCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },

  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  summaryInformation: {
    flex: 1,
    minWidth: 0,
  },

  summaryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E3A8A",
  },

  summaryDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#475569",
  },

  /* =======================================================
     ERROR
  ======================================================= */

  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "flex-start",
  },

  errorInformation: {
    flex: 1,
    marginLeft: 10,
  },

  errorTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#991B1B",
  },

  errorText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#7F1D1D",
  },

  retryButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#991B1B",
  },

  retryText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  /* =======================================================
     SECTION
  ======================================================= */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  previousHeader: {
    marginTop: 16,
  },

  sectionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: "#1E293B",
  },

  countBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },

  countText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2563EB",
  },

  /* =======================================================
     APPLICATION CARD
  ======================================================= */

  applicationCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  applicationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  applicationInformation: {
    flex: 1,
    minWidth: 0,
  },

  applicationTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
  },

  applicationDescription: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
    color: "#64748B",
  },

  applicationMeta: {
    marginTop: 10,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },

  metaText: {
    marginLeft: 5,
    fontSize: 11,
    color: "#64748B",
    flexShrink: 1,
  },

  reference: {
    marginTop: 5,
    fontSize: 10,
    color: "#94A3B8",
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

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },

  chevronContainer: {
    marginLeft: 8,
    paddingTop: 4,
  },

  /* =======================================================
     EMPTY
  ======================================================= */

  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#334155",
    textAlign: "center",
  },

  emptyDescription: {
    marginTop: 5,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
  },

  /* =======================================================
     INFO
  ======================================================= */

  infoBox: {
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
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
