
import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface AppointmentTimeSlot {
  id: string;
  time: string;
  available: boolean;
}

export interface TimeStepBranch {
  id: string;
  name: string;
}

interface TimeStepProps {
  selectedBranch: TimeStepBranch | null;
  selectedDate: string | null;
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
}

/* =========================================================
   TEMPORARY DEMO TIME SLOTS
========================================================= */

const TIME_SLOTS: AppointmentTimeSlot[] = [
  { id: "1", time: "08:00", available: true },
  { id: "2", time: "08:30", available: false },
  { id: "3", time: "09:00", available: true },
  { id: "4", time: "09:30", available: true },
  { id: "5", time: "10:00", available: false },
  { id: "6", time: "10:30", available: true },
  { id: "7", time: "11:00", available: true },
  { id: "8", time: "11:30", available: false },
  { id: "9", time: "12:00", available: true },
  { id: "10", time: "12:30", available: true },
  { id: "11", time: "13:00", available: false },
  { id: "12", time: "13:30", available: true },
  { id: "13", time: "14:00", available: true },
  { id: "14", time: "14:30", available: false },
  { id: "15", time: "15:00", available: true },
];

/* =========================================================
   DATE HELPERS
========================================================= */

const formatDate = (dateString: string): string => {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const isWeekday = (dateString: string): boolean => {
  const [year, month, day] = dateString.split("-").map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();

  // Sunday = 0, Saturday = 6
  return dayOfWeek >= 1 && dayOfWeek <= 5;
};

/* =========================================================
   COMPONENT
========================================================= */

export default function TimeStep({
  selectedBranch,
  selectedDate,
  selectedTime,
  onSelectTime,
}: TimeStepProps) {
  // Uses the device's local time.
  // Ensure the device timezone is set to South Africa.
  const now = new Date();

  const todayString = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const formattedDate = useMemo(
    () => (selectedDate ? formatDate(selectedDate) : ""),
    [selectedDate]
  );

  const weekdaySelected = selectedDate
    ? isWeekday(selectedDate)
    : false;

  /*
   * A slot is selectable only if:
   * 1. A date has been selected.
   * 2. The date is a weekday.
   * 3. The slot is marked available.
   * 4. The slot has not passed if the selected date is today.
   */
  const isSlotSelectable = (slot: AppointmentTimeSlot): boolean => {
    if (!selectedDate || !weekdaySelected || !slot.available) {
      return false;
    }

    if (selectedDate < todayString) {
      return false;
    }

    if (selectedDate === todayString) {
      const [hours, minutes] = slot.time.split(":").map(Number);

      const slotDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        minutes,
        0,
        0
      );

      if (slotDate <= now) {
        return false;
      }
    }

    return true;
  };

  const availableSlots = useMemo(
    () => TIME_SLOTS.filter((slot) => isSlotSelectable(slot)),
    // Re-evaluate when the selected date changes or the screen renders.
    // The backend will later provide the actual slot availability.
    [selectedDate, todayString, weekdaySelected, now.getHours(), now.getMinutes()]
  );

  const availableCount = availableSlots.length;

  const handleSelectTime = (slot: AppointmentTimeSlot) => {
    if (!isSlotSelectable(slot)) {
      return;
    }

    onSelectTime(slot.time);
  };

  const selectedSlotIsValid =
    !!selectedTime &&
    availableSlots.some((slot) => slot.time === selectedTime);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <View style={styles.introduction}>
        <Text style={styles.title}>Choose a time</Text>
        <Text style={styles.description}>
          Select an available appointment time for your chosen date.
          Appointments are available on weekdays only.
        </Text>
      </View>

      <View style={styles.contextCard}>
        {selectedBranch && (
          <View style={styles.contextRow}>
            <View style={styles.contextIcon}>
              <Ionicons name="location-outline" size={18} color="#2563EB" />
            </View>

            <View style={styles.contextInformation}>
              <Text style={styles.contextLabel}>Branch</Text>
              <Text style={styles.contextValue} numberOfLines={2}>
                {selectedBranch.name}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.contextDivider} />

        <View style={styles.contextRow}>
          <View style={styles.contextIcon}>
            <Ionicons name="calendar-outline" size={18} color="#2563EB" />
          </View>

          <View style={styles.contextInformation}>
            <Text style={styles.contextLabel}>Date</Text>
            <Text style={styles.contextValue}>
              {formattedDate || "No date selected"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.availabilityHeader}>
        <View>
          <Text style={styles.sectionTitle}>Available times</Text>
          <Text style={styles.sectionSubtitle}>
            Choose one appointment slot
          </Text>
        </View>

        <View style={styles.availableBadge}>
          <View style={styles.availableDot} />
          <Text style={styles.availableBadgeText}>
            {availableCount} available
          </Text>
        </View>
      </View>

      {!selectedDate ? (
        <View style={styles.messageCard}>
          <Ionicons name="calendar-outline" size={28} color="#64748B" />
          <Text style={styles.messageTitle}>Select a date first</Text>
          <Text style={styles.messageText}>
            Choose an appointment date before selecting a time.
          </Text>
        </View>
      ) : !weekdaySelected ? (
        <View style={styles.messageCard}>
          <Ionicons name="calendar-outline" size={28} color="#64748B" />
          <Text style={styles.messageTitle}>Weekdays only</Text>
          <Text style={styles.messageText}>
            Appointments are not available on Saturdays or Sundays.
            Please return to the date step and choose a weekday.
          </Text>
        </View>
      ) : availableCount === 0 ? (
        <View style={styles.messageCard}>
          <Ionicons name="time-outline" size={28} color="#64748B" />
          <Text style={styles.messageTitle}>No times available</Text>
          <Text style={styles.messageText}>
            There are no selectable times for this date. Please choose
            another weekday.
          </Text>
        </View>
      ) : (
        <View style={styles.timeGrid}>
          {TIME_SLOTS.map((slot) => {
            const selectable = isSlotSelectable(slot);
            const selected =
              selectedTime === slot.time && selectable;

            return (
              <TouchableOpacity
                key={slot.id}
                activeOpacity={0.8}
                disabled={!selectable}
                onPress={() => handleSelectTime(slot)}
                style={[
                  styles.timeCard,
                  !selectable && styles.timeCardUnavailable,
                  selected && styles.timeCardSelected,
                ]}
              >
                <View
                  style={[
                    styles.timeIcon,
                    !selectable && styles.timeIconUnavailable,
                    selected && styles.timeIconSelected,
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={
                      selected
                        ? "#FFFFFF"
                        : selectable
                        ? "#2563EB"
                        : "#94A3B8"
                    }
                  />
                </View>

                <Text
                  style={[
                    styles.timeText,
                    !selectable && styles.timeTextUnavailable,
                    selected && styles.timeTextSelected,
                  ]}
                >
                  {slot.time}
                </Text>

                <View
                  style={[
                    styles.radioOuter,
                    !selectable && styles.radioOuterUnavailable,
                    selected && styles.radioOuterSelected,
                  ]}
                >
                  {selected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendAvailable]} />
          <Text style={styles.legendText}>Available</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendUnavailable]} />
          <Text style={styles.legendText}>Unavailable or passed</Text>
        </View>
      </View>

      {selectedSlotIsValid && (
        <View style={styles.selectedCard}>
          <View style={styles.selectedIcon}>
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          </View>

          <View style={styles.selectedInformation}>
            <Text style={styles.selectedLabel}>
              Selected appointment
            </Text>
            <Text style={styles.selectedDate}>{formattedDate}</Text>
            <Text style={styles.selectedTime}>{selectedTime}</Text>
          </View>
        </View>
      )}
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
  contextCard: {
    padding: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    backgroundColor: "#F8FAFF",
    marginBottom: 22,
  },
  contextRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  contextIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    marginRight: 10,
  },
  contextInformation: {
    flex: 1,
  },
  contextLabel: {
    fontSize: 10,
    color: "#64748B",
    marginBottom: 2,
  },
  contextValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  contextDivider: {
    height: 1,
    backgroundColor: "#E0E7FF",
    marginVertical: 11,
  },
  availabilityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  sectionSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#64748B",
  },
  availableBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F0FDF4",
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
    marginRight: 5,
  },
  availableBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#166534",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  timeCard: {
    width: "48.5%",
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },
  timeCardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#F8FAFF",
  },
  timeCardUnavailable: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  timeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    marginRight: 8,
  },
  timeIconSelected: {
    backgroundColor: "#2563EB",
  },
  timeIconUnavailable: {
    backgroundColor: "#F1F5F9",
  },
  timeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  timeTextSelected: {
    color: "#2563EB",
  },
  timeTextUnavailable: {
    color: "#94A3B8",
  },
  radioOuter: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: "#2563EB",
  },
  radioOuterUnavailable: {
    borderColor: "#E2E8F0",
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#2563EB",
  },
  legendContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    gap: 20,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendAvailable: {
    backgroundColor: "#16A34A",
  },
  legendUnavailable: {
    backgroundColor: "#CBD5E1",
  },
  legendText: {
    fontSize: 11,
    color: "#64748B",
  },
  selectedCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    backgroundColor: "#F0FDF4",
  },
  selectedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    marginRight: 10,
  },
  selectedInformation: {
    flex: 1,
  },
  selectedLabel: {
    fontSize: 10,
    color: "#64748B",
    marginBottom: 3,
  },
  selectedDate: {
    fontSize: 13,
    fontWeight: "600",
    color: "#166534",
  },
  selectedTime: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: "800",
    color: "#166534",
  },
  messageCard: {
    alignItems: "center",
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  messageTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  messageText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    color: "#64748B",
  },
});
