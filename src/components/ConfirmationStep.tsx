
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

/* =========================================================
   TYPES
========================================================= */

export interface ConfirmationService {
  id: string;
  name: string;
}

export interface ConfirmationBranch {
  id: string;
  name: string;
  address?: string;
  city?: string;
}

interface ConfirmationStepProps {
  appointmentId?: string | null;

  service: ConfirmationService | null;
  branch: ConfirmationBranch | null;
  date: string | null;
  time: string | null;

  onDone: () => void;
  onViewAppointments?: () => void;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function ConfirmationStep({
  appointmentId,
  service,
  branch,
  date,
  time,
  onDone,
  onViewAppointments,
}: ConfirmationStepProps) {
  /* =======================================================
     FORMAT DATE
  ======================================================= */

  const formattedDate = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString(
        "en-ZA",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      )
    : "Not available";

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {/* ===================================================
          SUCCESS HEADER
      =================================================== */}

      <View style={styles.successSection}>
        <View style={styles.successCircle}>
          <Ionicons
            name="checkmark"
            size={42}
            color="#FFFFFF"
          />
        </View>

        <Text style={styles.successTitle}>
          Appointment confirmed
        </Text>

        <Text style={styles.successDescription}>
          Your appointment has been successfully
          booked. Keep the details below for your
          reference.
        </Text>
      </View>

      {/* ===================================================
          REFERENCE NUMBER
      =================================================== */}

      {appointmentId && (
        <View style={styles.referenceCard}>
          <View style={styles.referenceIcon}>
            <Ionicons
              name="receipt-outline"
              size={20}
              color="#2563EB"
            />
          </View>

          <View style={styles.referenceInformation}>
            <Text style={styles.referenceLabel}>
              Appointment reference
            </Text>

            <Text
              style={styles.referenceNumber}
              selectable
            >
              {appointmentId}
            </Text>
          </View>
        </View>
      )}

      {/* ===================================================
          APPOINTMENT DETAILS
      =================================================== */}

      <View style={styles.detailsCard}>
        <View style={styles.detailsHeader}>
          <View style={styles.detailsIcon}>
            <Ionicons
              name="calendar-outline"
              size={20}
              color="#2563EB"
            />
          </View>

          <View>
            <Text style={styles.detailsTitle}>
              Appointment details
            </Text>

            <Text style={styles.detailsSubtitle}>
              Your confirmed booking
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Service */}

        <View style={styles.detailRow}>
          <View style={styles.rowIcon}>
            <Ionicons
              name="document-text-outline"
              size={17}
              color="#64748B"
            />
          </View>

          <View style={styles.rowInformation}>
            <Text style={styles.rowLabel}>
              Service
            </Text>

            <Text style={styles.rowValue}>
              {service?.name || "Not available"}
            </Text>
          </View>
        </View>

        {/* Branch */}

        <View style={styles.detailRow}>
          <View style={styles.rowIcon}>
            <Ionicons
              name="location-outline"
              size={17}
              color="#64748B"
            />
          </View>

          <View style={styles.rowInformation}>
            <Text style={styles.rowLabel}>
              Branch
            </Text>

            <Text style={styles.rowValue}>
              {branch?.name || "Not available"}
            </Text>

            {(branch?.address ||
              branch?.city) && (
              <Text style={styles.rowSecondary}>
                {[branch.address, branch.city]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            )}
          </View>
        </View>

        {/* Date */}

        <View style={styles.detailRow}>
          <View style={styles.rowIcon}>
            <Ionicons
              name="calendar-outline"
              size={17}
              color="#64748B"
            />
          </View>

          <View style={styles.rowInformation}>
            <Text style={styles.rowLabel}>
              Date
            </Text>

            <Text style={styles.rowValue}>
              {formattedDate}
            </Text>
          </View>
        </View>

        {/* Time */}

        <View style={styles.detailRow}>
          <View style={styles.rowIcon}>
            <Ionicons
              name="time-outline"
              size={17}
              color="#64748B"
            />
          </View>

          <View style={styles.rowInformation}>
            <Text style={styles.rowLabel}>
              Time
            </Text>

            <Text style={styles.timeValue}>
              {time || "Not available"}
            </Text>
          </View>
        </View>
      </View>

      {/* ===================================================
          IMPORTANT INFORMATION
      =================================================== */}

      <View style={styles.informationCard}>
        <View style={styles.informationIcon}>
          <Ionicons
            name="information-outline"
            size={19}
            color="#2563EB"
          />
        </View>

        <View style={styles.informationContent}>
          <Text style={styles.informationTitle}>
            Before you attend
          </Text>

          <Text style={styles.informationText}>
            Please arrive early enough to complete
            any required check-in procedures. Bring
            the documents required for your selected
            service.
          </Text>
        </View>
      </View>

      {/* ===================================================
          ACTIONS
      =================================================== */}

      <View style={styles.actions}>
        {onViewAppointments && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onViewAppointments}
            style={styles.secondaryButton}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color="#2563EB"
            />

            <Text style={styles.secondaryButtonText}>
              View my appointments
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onDone}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>
            Done
          </Text>

          <Ionicons
            name="arrow-forward"
            size={18}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  content: {
    paddingBottom: 35,
  },

  /* -------------------------------------------------------
     SUCCESS
  ------------------------------------------------------- */

  successSection: {
    alignItems: "center",
    paddingTop: 15,
    paddingBottom: 25,
  },

  successCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    marginBottom: 18,
  },

  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },

  successDescription: {
    maxWidth: 330,
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
    textAlign: "center",
  },

  /* -------------------------------------------------------
     REFERENCE
  ------------------------------------------------------- */

  referenceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#F8FAFF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    marginBottom: 16,
  },

  referenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    marginRight: 11,
  },

  referenceInformation: {
    flex: 1,
  },

  referenceLabel: {
    fontSize: 10,
    color: "#64748B",
    marginBottom: 3,
  },

  referenceNumber: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: 0.4,
  },

  /* -------------------------------------------------------
     DETAILS CARD
  ------------------------------------------------------- */

  detailsCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },

  detailsHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  detailsIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    marginRight: 10,
  },

  detailsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },

  detailsSubtitle: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 15,
  },

  /* -------------------------------------------------------
     DETAIL ROW
  ------------------------------------------------------- */

  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },

  detailRowLast: {
    marginBottom: 0,
  },

  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    marginRight: 9,
  },

  rowInformation: {
    flex: 1,
  },

  rowLabel: {
    fontSize: 10,
    color: "#64748B",
    marginBottom: 3,
  },

  rowValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: "#1E293B",
  },

  rowSecondary: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 16,
    color: "#64748B",
  },

  timeValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#2563EB",
  },

  /* -------------------------------------------------------
     INFORMATION
  ------------------------------------------------------- */

  informationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    marginBottom: 20,
  },

  informationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DBEAFE",
    marginRight: 9,
  },

  informationContent: {
    flex: 1,
  },

  informationTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E3A8A",
    marginBottom: 3,
  },

  informationText: {
    fontSize: 11,
    lineHeight: 17,
    color: "#475569",
  },

  /* -------------------------------------------------------
     ACTIONS
  ------------------------------------------------------- */

  actions: {
    gap: 10,
  },

  secondaryButton: {
    minHeight: 50,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  secondaryButtonText: {
    marginLeft: 7,
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },

  primaryButton: {
    minHeight: 52,
    borderRadius: 13,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  primaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginRight: 8,
  },
});
