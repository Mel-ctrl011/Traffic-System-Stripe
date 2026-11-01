
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

export interface ReviewService {
  id: string;
  name: string;
  description?: string;
}

export interface ReviewBranch {
  id: string;
  name: string;
  address?: string;
  city?: string;
}

interface ReviewStepProps {
  service: ReviewService | null;
  branch: ReviewBranch | null;
  date: string | null;
  time: string | null;

  onEditService: () => void;
  onEditBranch: () => void;
  onEditDate: () => void;
  onEditTime: () => void;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function ReviewStep({
  service,
  branch,
  date,
  time,
  onEditService,
  onEditBranch,
  onEditDate,
  onEditTime,
}: ReviewStepProps) {
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
    : "Not selected";

  /* =======================================================
     COMPLETE CHECK
  ======================================================= */

  const isComplete =
    service !== null &&
    branch !== null &&
    date !== null &&
    time !== null;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {/* ===================================================
          INTRODUCTION
      =================================================== */}

      <View style={styles.introduction}>
        <Text style={styles.title}>
          Review your appointment
        </Text>

        <Text style={styles.description}>
          Please check your appointment details before
          confirming your booking.
        </Text>
      </View>

      {/* ===================================================
          STATUS
      =================================================== */}

      <View
        style={[
          styles.statusCard,
          isComplete
            ? styles.statusCardComplete
            : styles.statusCardIncomplete,
        ]}
      >
        <View
          style={[
            styles.statusIcon,
            isComplete
              ? styles.statusIconComplete
              : styles.statusIconIncomplete,
          ]}
        >
          <Ionicons
            name={
              isComplete
                ? "checkmark"
                : "alert-outline"
            }
            size={20}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.statusInformation}>
          <Text style={styles.statusTitle}>
            {isComplete
              ? "Ready to confirm"
              : "Appointment incomplete"}
          </Text>

          <Text style={styles.statusDescription}>
            {isComplete
              ? "All appointment details have been selected."
              : "Please complete all required selections."}
          </Text>
        </View>
      </View>

      {/* ===================================================
          SERVICE
      =================================================== */}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Service
            </Text>

            <Text style={styles.sectionSubtitle}>
              Selected service
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onEditService}
            style={styles.editButton}
          >
            <Ionicons
              name="create-outline"
              size={15}
              color="#2563EB"
            />

            <Text style={styles.editText}>
              Edit
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailIcon}>
            <Ionicons
              name="document-text-outline"
              size={20}
              color="#2563EB"
            />
          </View>

          <View style={styles.detailInformation}>
            <Text style={styles.detailLabel}>
              Service
            </Text>

            <Text style={styles.detailValue}>
              {service?.name || "Not selected"}
            </Text>

            {service?.description && (
              <Text
                style={styles.detailDescription}
                numberOfLines={2}
              >
                {service.description}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* ===================================================
          BRANCH
      =================================================== */}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Branch
            </Text>

            <Text style={styles.sectionSubtitle}>
              Appointment location
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onEditBranch}
            style={styles.editButton}
          >
            <Ionicons
              name="create-outline"
              size={15}
              color="#2563EB"
            />

            <Text style={styles.editText}>
              Edit
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailIcon}>
            <Ionicons
              name="location-outline"
              size={20}
              color="#2563EB"
            />
          </View>

          <View style={styles.detailInformation}>
            <Text style={styles.detailLabel}>
              Branch
            </Text>

            <Text style={styles.detailValue}>
              {branch?.name || "Not selected"}
            </Text>

            {(branch?.address || branch?.city) && (
              <Text
                style={styles.detailDescription}
                numberOfLines={2}
              >
                {[branch.address, branch.city]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* ===================================================
          DATE
      =================================================== */}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Date
            </Text>

            <Text style={styles.sectionSubtitle}>
              Appointment date
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onEditDate}
            style={styles.editButton}
          >
            <Ionicons
              name="create-outline"
              size={15}
              color="#2563EB"
            />

            <Text style={styles.editText}>
              Edit
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailIcon}>
            <Ionicons
              name="calendar-outline"
              size={20}
              color="#2563EB"
            />
          </View>

          <View style={styles.detailInformation}>
            <Text style={styles.detailLabel}>
              Appointment date
            </Text>

            <Text style={styles.detailValue}>
              {formattedDate}
            </Text>
          </View>
        </View>
      </View>

      {/* ===================================================
          TIME
      =================================================== */}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Time
            </Text>

            <Text style={styles.sectionSubtitle}>
              Appointment time
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onEditTime}
            style={styles.editButton}
          >
            <Ionicons
              name="create-outline"
              size={15}
              color="#2563EB"
            />

            <Text style={styles.editText}>
              Edit
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailIcon}>
            <Ionicons
              name="time-outline"
              size={20}
              color="#2563EB"
            />
          </View>

          <View style={styles.detailInformation}>
            <Text style={styles.detailLabel}>
              Appointment time
            </Text>

            <Text style={styles.timeValue}>
              {time || "Not selected"}
            </Text>
          </View>
        </View>
      </View>

      {/* ===================================================
          FINAL SUMMARY
      =================================================== */}

      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name="calendar"
              size={20}
              color="#FFFFFF"
            />
          </View>

          <View>
            <Text style={styles.summaryTitle}>
              Appointment summary
            </Text>

            <Text style={styles.summarySubtitle}>
              Final booking details
            </Text>
          </View>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            Service
          </Text>

          <Text
            style={styles.summaryValue}
            numberOfLines={2}
          >
            {service?.name || "Not selected"}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            Branch
          </Text>

          <Text
            style={styles.summaryValue}
            numberOfLines={2}
          >
            {branch?.name || "Not selected"}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            Date
          </Text>

          <Text
            style={styles.summaryValue}
            numberOfLines={2}
          >
            {formattedDate}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            Time
          </Text>

          <Text style={styles.summaryTime}>
            {time || "Not selected"}
          </Text>
        </View>
      </View>

      {/* ===================================================
          INFORMATION
      =================================================== */}

      <View style={styles.informationCard}>
        <Ionicons
          name="information-circle-outline"
          size={19}
          color="#2563EB"
        />

        <Text style={styles.informationText}>
          By confirming this appointment, you agree to
          attend at the selected branch on the date and
          time shown above.
        </Text>
      </View>
    </ScrollView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  content: {
    paddingBottom: 30,
  },

  /* -------------------------------------------------------
     INTRODUCTION
  ------------------------------------------------------- */

  introduction: {
    marginBottom: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },

  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
  },

  /* -------------------------------------------------------
     STATUS
  ------------------------------------------------------- */

  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 22,
  },

  statusCardComplete: {
    backgroundColor: "#F0FDF4",
    borderColor: "#DCFCE7",
  },

  statusCardIncomplete: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FEF3C7",
  },

  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  statusIconComplete: {
    backgroundColor: "#16A34A",
  },

  statusIconIncomplete: {
    backgroundColor: "#F59E0B",
  },

  statusInformation: {
    flex: 1,
  },

  statusTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },

  statusDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: "#64748B",
  },

  /* -------------------------------------------------------
     SECTION
  ------------------------------------------------------- */

  section: {
    marginBottom: 20,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },

  sectionSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },

  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
  },

  editText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },

  /* -------------------------------------------------------
     DETAIL CARD
  ------------------------------------------------------- */

  detailCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },

  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    marginRight: 11,
  },

  detailInformation: {
    flex: 1,
  },

  detailLabel: {
    fontSize: 10,
    color: "#64748B",
    marginBottom: 3,
  },

  detailValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },

  detailDescription: {
    marginTop: 3,
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
     SUMMARY
  ------------------------------------------------------- */

  summaryCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#F8FAFF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    marginBottom: 14,
  },

  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    marginRight: 10,
  },

  summaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },

  summarySubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: "#64748B",
  },

  summaryDivider: {
    height: 1,
    backgroundColor: "#DBEAFE",
    marginVertical: 14,
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 11,
  },

  summaryLabel: {
    width: "30%",
    fontSize: 11,
    color: "#64748B",
  },

  summaryValue: {
    width: "67%",
    textAlign: "right",
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
  },

  summaryTime: {
    width: "67%",
    textAlign: "right",
    fontSize: 15,
    fontWeight: "800",
    color: "#2563EB",
  },

  /* -------------------------------------------------------
     INFORMATION
  ------------------------------------------------------- */

  informationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 13,
    borderRadius: 13,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },

  informationText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    lineHeight: 17,
    color: "#475569",
  },
});

