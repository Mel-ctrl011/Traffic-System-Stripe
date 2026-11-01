
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

import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  cancelAppointment,
  getMyAppointments,
  APPOINTMENT_PENALTY_AMOUNT,
} from "../../services/appointmentService";

import type {
  FirestoreAppointment,
  AppointmentStatus,
} from "../../services/appointmentService";

/* =========================================================
   MAIN SCREEN
========================================================= */

export default function MyAppointments() {
  const navigation = useNavigation();

  const [appointments, setAppointments] = useState<
    FirestoreAppointment[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedAppointment, setSelectedAppointment] =
    useState<FirestoreAppointment | null>(null);

  const [cancelling, setCancelling] = useState(false);

  /* =======================================================
     LOAD APPOINTMENTS
  ======================================================= */

  const loadAppointments = useCallback(
    async (refresh = false) => {
      console.log("========================================");
      console.log("[MyAppointments] LOAD START");
      console.log("========================================");

      try {
        setError(null);

        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const userId = await AsyncStorage.getItem("userId");

        console.log("[MyAppointments] userId:", userId);

        if (!userId) {
          throw new Error("No logged-in citizen found.");
        }

        const result = await getMyAppointments(userId);

        console.log(
          "[MyAppointments] Appointments:",
          result.length
        );

        setAppointments(result);
      } catch (err) {
        console.error(
          "[MyAppointments] LOAD ERROR:",
          err
        );

        setError("We couldn't load your appointments.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  /* =======================================================
     FILTER APPOINTMENTS
  ======================================================= */

  const upcomingAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          appointment.status === "confirmed" ||
          appointment.status === "pending"
      ),
    [appointments]
  );

  const previousAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          appointment.status === "completed" ||
          appointment.status === "cancelled"
      ),
    [appointments]
  );

  /* =======================================================
     CANCEL APPOINTMENT
  ======================================================= */

  const handleCancel = useCallback(
    (appointment: FirestoreAppointment) => {
      if (cancelling) {
        return;
      }

      if (
        appointment.status !== "confirmed" &&
        appointment.status !== "pending"
      ) {
        Alert.alert(
          "Cannot Cancel",
          "Only pending or confirmed appointments can be cancelled."
        );
        return;
      }

      const reasons = [
        "Unable to attend",
        "Change of plans",
        "Booked by mistake",
        "Other reason",
      ];

      Alert.alert(
        "Cancellation Reason",
        "Why do you want to cancel this appointment?",
        [
          ...reasons.map((reason) => ({
            text: reason,
            onPress: () => {
              // Generate the action ID once for this confirmed attempt.
              const actionId =
                `cancel_${appointment.id}_${Date.now()}`;

              Alert.alert(
                "Confirm Cancellation",
                `Appointment: ${appointment.appointmentNumber}\n\nReason: ${reason}\n\nPenalty: R${APPOINTMENT_PENALTY_AMOUNT.toFixed(
                  2
                )}\n\nThis penalty will be added to your outstanding balance. Do you want to continue?`,
                [
                  {
                    text: "Keep Appointment",
                    style: "cancel" as const,
                  },
                  {
                    text: "Cancel & Accept Fee",
                    style: "destructive" as const,
                    onPress: async () => {
                      if (cancelling) {
                        return;
                      }

                      try {
                        setCancelling(true);

                        const userId =
                          await AsyncStorage.getItem("userId");

                        if (!userId) {
                          throw new Error(
                            "No logged-in citizen found. Please sign in again."
                          );
                        }

                        console.log(
                          "[MyAppointments] CANCELLATION REQUEST",
                          {
                            appointmentId: appointment.id,
                            appointmentNumber:
                              appointment.appointmentNumber,
                            userId,
                            actionId,
                            reason,
                            penalty:
                              APPOINTMENT_PENALTY_AMOUNT,
                          }
                        );

                        await cancelAppointment({
                          appointmentId: appointment.id,
                          userId,

                          // IMPORTANT:
                          // This assumes userId is the same document ID
                          // as citizens/{citizenId}.
                          // Verify this against your AuthContext.
                          citizenId: userId,

                          reason,
                          actionId,
                        });

                        setAppointments((current) =>
                          current.map((item) =>
                            item.id === appointment.id
                              ? {
                                  ...item,
                                  status: "cancelled",
                                }
                              : item
                          )
                        );

                        setSelectedAppointment((current) =>
                          current?.id === appointment.id
                            ? {
                                ...current,
                                status: "cancelled",
                              }
                            : current
                        );

                        console.log(
                          "[MyAppointments] CANCELLATION SUCCESS",
                          {
                            appointmentId: appointment.id,
                            actionId,
                            penalty:
                              APPOINTMENT_PENALTY_AMOUNT,
                          }
                        );

                        Alert.alert(
                          "Appointment Cancelled",
                          `Your appointment has been cancelled successfully.\n\nPenalty added: R${APPOINTMENT_PENALTY_AMOUNT.toFixed(
                            2
                          )}\n\nReason: ${reason}\n\nThe penalty is now recorded as outstanding.`
                        );
                      } catch (err) {
                        console.error(
                          "[MyAppointments] CANCELLATION ERROR:",
                          err
                        );

                        Alert.alert(
                          "Cancellation Failed",
                          err instanceof Error
                            ? err.message
                            : "We couldn't cancel your appointment. Please try again."
                        );
                      } finally {
                        setCancelling(false);
                      }
                    },
                  },
                ]
              );
            },
          })),
          {
            text: "Go Back",
            style: "cancel",
          },
        ]
      );
    },
    [cancelling]
  );

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <Header onBack={() => navigation.goBack()} />

        <View style={styles.centerState}>
          <View style={styles.stateIcon}>
            <Ionicons
              name="calendar-outline"
              size={30}
              color="#2563EB"
            />
          </View>

          <ActivityIndicator
            size="small"
            color="#2563EB"
            style={styles.spinner}
          />

          <Text style={styles.stateTitle}>
            Loading appointments
          </Text>

          <Text style={styles.stateDescription}>
            Please wait while we fetch your appointments.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <SafeAreaView style={styles.screen}>
        <Header onBack={() => navigation.goBack()} />

        <View style={styles.centerState}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="cloud-offline-outline"
              size={30}
              color="#DC2626"
            />
          </View>

          <Text style={styles.stateTitle}>
            Something went wrong
          </Text>

          <Text style={styles.stateDescription}>
            {error}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadAppointments()}
            activeOpacity={0.8}
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.retryText}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* =======================================================
     MAIN
  ======================================================= */

  return (
    <SafeAreaView style={styles.screen}>
      <Header onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAppointments(true)}
            tintColor="#2563EB"
          />
        }
      >
        {/* SUMMARY */}

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name="calendar"
              size={24}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>
              Your appointments
            </Text>

            <Text style={styles.summaryDescription}>
              Manage your upcoming visits and appointment history.
            </Text>
          </View>

          <View style={styles.totalBadge}>
            <Text style={styles.totalNumber}>
              {appointments.length}
            </Text>

            <Text style={styles.totalLabel}>Total</Text>
          </View>
        </View>

        {/* UPCOMING */}

        <SectionHeader
          title="Upcoming"
          count={upcomingAppointments.length}
        />

        {upcomingAppointments.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No upcoming appointments"
            description="You don't have any upcoming appointments."
          />
        ) : (
          upcomingAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onPress={() => setSelectedAppointment(appointment)}
            />
          ))
        )}

        {/* PREVIOUS */}

        <SectionHeader
          title="Previous"
          count={previousAppointments.length}
        />

        {previousAppointments.length === 0 ? (
          <EmptyState
            icon="time-outline"
            title="No previous appointments"
            description="Completed and cancelled appointments will appear here."
          />
        ) : (
          previousAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onPress={() => setSelectedAppointment(appointment)}
            />
          ))
        )}

        {/* BOOK BUTTON */}

        <TouchableOpacity
          style={styles.bookButton}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate(
              "AppointmentBooking" as never
            )
          }
        >
          <View style={styles.bookIcon}>
            <Ionicons
              name="add"
              size={21}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.bookContent}>
            <Text style={styles.bookTitle}>
              Book New Appointment
            </Text>

            <Text style={styles.bookSubtitle}>
              Choose a service, branch and time
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* DETAILS */}

      {selectedAppointment && (
        <AppointmentDetails
          appointment={selectedAppointment}
          cancelling={cancelling}
          onClose={() => setSelectedAppointment(null)}
          onCancel={() => handleCancel(selectedAppointment)}
        />
      )}
    </SafeAreaView>
  );
}

/* =========================================================
   HEADER
========================================================= */

function Header({
  onBack,
}: {
  onBack: () => void;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        activeOpacity={0.7}
      >
        <Ionicons
          name="arrow-back"
          size={21}
          color="#1E293B"
        />
      </TouchableOpacity>

      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>
          My Appointments
        </Text>

        <Text style={styles.headerSubtitle}>
          Manage your bookings
        </Text>
      </View>
    </View>
  );
}

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <View style={styles.countBadge}>
        <Text style={styles.countText}>{count}</Text>
      </View>
    </View>
  );
}

/* =========================================================
   APPOINTMENT CARD
========================================================= */

function AppointmentCard({
  appointment,
  onPress,
}: {
  appointment: FirestoreAppointment;
  onPress: () => void;
}) {
  const status = getStatusStyle(appointment.status);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={onPress}
    >
      <View style={styles.dateIcon}>
        <Ionicons
          name="calendar-outline"
          size={23}
          color="#2563EB"
        />
      </View>

      <View style={styles.cardInformation}>
        <View style={styles.cardTopRow}>
          <Text
            style={styles.serviceName}
            numberOfLines={2}
          >
            {appointment.service.name}
          </Text>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: status.background },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: status.text },
              ]}
            >
              {formatStatus(appointment.status)}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons
            name="location-outline"
            size={15}
            color="#64748B"
          />

          <Text style={styles.infoText} numberOfLines={1}>
            {appointment.branch.name}
          </Text>
        </View>

        <View style={styles.dateTimeRow}>
          <View style={styles.infoRow}>
            <Ionicons
              name="calendar-outline"
              size={15}
              color="#64748B"
            />

            <Text style={styles.infoText}>
              {formatDate(appointment.date)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons
              name="time-outline"
              size={15}
              color="#64748B"
            />

            <Text style={styles.infoText}>
              {appointment.time}
            </Text>
          </View>
        </View>

        <View style={styles.referenceRow}>
          <Text style={styles.reference}>
            {appointment.appointmentNumber}
          </Text>

          <Ionicons
            name="chevron-forward"
            size={16}
            color="#94A3B8"
          />
        </View>
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
          size={27}
          color="#64748B"
        />
      </View>

      <Text style={styles.emptyTitle}>{title}</Text>

      <Text style={styles.emptyDescription}>
        {description}
      </Text>
    </View>
  );
}

/* =========================================================
   APPOINTMENT DETAILS
========================================================= */

function AppointmentDetails({
  appointment,
  cancelling,
  onClose,
  onCancel,
}: {
  appointment: FirestoreAppointment;
  cancelling: boolean;
  onClose: () => void;
  onCancel: () => void;
}) {
  const status = getStatusStyle(appointment.status);

  const canCancel =
    appointment.status === "confirmed" ||
    appointment.status === "pending";

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle}>
              Appointment Details
            </Text>

            <Text style={styles.modalReference}>
              {appointment.appointmentNumber}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            disabled={cancelling}
          >
            <Ionicons
              name="close"
              size={21}
              color="#475569"
            />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.modalStatusRow}>
            <Text style={styles.modalLabel}>Status</Text>

            <View
              style={[
                styles.statusBadgeLarge,
                { backgroundColor: status.background },
              ]}
            >
              <Text
                style={[
                  styles.statusTextLarge,
                  { color: status.text },
                ]}
              >
                {formatStatus(appointment.status)}
              </Text>
            </View>
          </View>

          <DetailRow
            icon="document-text-outline"
            label="Service"
            value={appointment.service.name}
          />

          <DetailRow
            icon="location-outline"
            label="Branch"
            value={appointment.branch.name}
          />

          {appointment.branch.address && (
            <DetailRow
              icon="navigate-outline"
              label="Address"
              value={appointment.branch.address}
            />
          )}

          <DetailRow
            icon="calendar-outline"
            label="Date"
            value={formatDate(appointment.date)}
          />

          <DetailRow
            icon="time-outline"
            label="Time"
            value={appointment.time}
          />

          {appointment.service.duration && (
            <DetailRow
              icon="hourglass-outline"
              label="Duration"
              value={appointment.service.duration}
            />
          )}

          {appointment.branch.phone && (
            <DetailRow
              icon="call-outline"
              label="Branch Phone"
              value={appointment.branch.phone}
            />
          )}

          {appointment.service.description && (
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionTitle}>
                Service Information
              </Text>

              <Text style={styles.descriptionText}>
                {appointment.service.description}
              </Text>
            </View>
          )}

          {canCancel && (
            <TouchableOpacity
              style={[
                styles.cancelButton,
                cancelling && styles.cancelButtonDisabled,
              ]}
              disabled={cancelling}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              {cancelling ? (
                <ActivityIndicator
                  size="small"
                  color="#DC2626"
                />
              ) : (
                <Ionicons
                  name="close-circle-outline"
                  size={19}
                  color="#DC2626"
                />
              )}

              <Text style={styles.cancelButtonText}>
                {cancelling
                  ? "Cancelling..."
                  : "Cancel Appointment"}
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 25 }} />
        </ScrollView>
      </View>
    </View>
  );
}

/* =========================================================
   DETAIL ROW
========================================================= */

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons
          name={icon}
          size={18}
          color="#2563EB"
        />
      </View>

      <View style={styles.detailInformation}>
        <Text style={styles.detailLabel}>{label}</Text>

        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

/* =========================================================
   STATUS
========================================================= */

function formatStatus(status: AppointmentStatus) {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "pending":
      return "Pending";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function getStatusStyle(status: AppointmentStatus) {
  switch (status) {
    case "confirmed":
      return {
        background: "#DCFCE7",
        text: "#15803D",
      };

    case "pending":
      return {
        background: "#FEF3C7",
        text: "#B45309",
      };

    case "completed":
      return {
        background: "#E2E8F0",
        text: "#475569",
      };

    case "cancelled":
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
   DATE
========================================================= */

function formatDate(date: string) {
  if (!date) {
    return "Unknown date";
  }

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  headerText: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: "#64748B",
  },

  scroll: {
    flex: 1,
  },

  content: {
    padding: 18,
    paddingBottom: 25,
  },

  summaryCard: {
    backgroundColor: "#2563EB",
    borderRadius: 19,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  summaryContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },

  summaryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  summaryDescription: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 15,
    color: "rgba(255,255,255,0.82)",
  },

  totalBadge: {
    width: 47,
    height: 47,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  totalNumber: {
    fontSize: 17,
    fontWeight: "900",
    color: "#2563EB",
  },

  totalLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: "#64748B",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  sectionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: "#1E293B",
  },

  countBadge: {
    minWidth: 27,
    height: 27,
    borderRadius: 14,
    paddingHorizontal: 8,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },

  countText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#2563EB",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  dateIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  cardInformation: {
    flex: 1,
    minWidth: 0,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 7,
  },

  serviceName: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    color: "#1E293B",
    marginRight: 7,
  },

  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 9,
    fontWeight: "900",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },

  infoText: {
    marginLeft: 5,
    fontSize: 11,
    color: "#64748B",
    flexShrink: 1,
  },

  dateTimeRow: {
    flexDirection: "row",
    gap: 14,
  },

  referenceRow: {
    marginTop: 4,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  reference: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
  },

  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 25,
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
  },

  emptyDescription: {
    marginTop: 5,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 17,
    color: "#64748B",
  },

  bookButton: {
    minHeight: 60,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  bookIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  bookContent: {
    flex: 1,
    marginLeft: 10,
  },

  bookTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  bookSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: "rgba(255,255,255,0.78)",
  },

  bottomSpace: {
    height: 10,
  },

  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  stateIcon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },

  errorIcon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },

  spinner: {
    marginTop: 18,
  },

  stateTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },

  stateDescription: {
    marginTop: 5,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
  },

  retryButton: {
    marginTop: 18,
    height: 44,
    paddingHorizontal: 19,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  retryText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  modalOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(15,23,42,0.48)",
    justifyContent: "flex-end",
  },

  modalCard: {
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 17,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1E293B",
  },

  modalReference: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  modalStatusRow: {
    padding: 12,
    borderRadius: 13,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  modalLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },

  statusBadgeLarge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusTextLarge: {
    fontSize: 10,
    fontWeight: "900",
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  detailIcon: {
    width: 37,
    height: 37,
    borderRadius: 11,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  detailInformation: {
    flex: 1,
  },

  detailLabel: {
    fontSize: 9,
    color: "#94A3B8",
    fontWeight: "700",
  },

  detailValue: {
    marginTop: 2,
    fontSize: 13,
    color: "#334155",
    fontWeight: "700",
  },

  descriptionBox: {
    marginTop: 13,
    padding: 13,
    borderRadius: 13,
    backgroundColor: "#F8FAFC",
  },

  descriptionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
  },

  descriptionText: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 17,
    color: "#64748B",
  },

  cancelButton: {
    marginTop: 17,
    height: 47,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },

  cancelButtonDisabled: {
    opacity: 0.6,
  },

  cancelButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#DC2626",
  },
});
