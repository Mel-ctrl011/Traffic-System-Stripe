
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";

/* =========================================================
   TYPES
========================================================= */

export interface AppointmentDateAvailability {
  date: string;
  slots: number;
}

export interface DateStepBranch {
  id: string;
  name: string;
}

interface DateStepProps {
  selectedBranch: DateStepBranch | null;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

/* =========================================================
   DATE HELPERS
========================================================= */

// Formats a date using local device time, not UTC.
// This avoids dates shifting because of timezone conversion.
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDateAfterDays = (
  todayString: string,
  daysToAdd: number
): string => {
  const [year, month, day] = todayString.split("-").map(Number);

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + daysToAdd);

  return formatLocalDate(date);
};

const formatAppointmentDate = (dateString: string): string => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

/* =========================================================
   TEMPORARY DEMO AVAILABILITY

   These dates are generated relative to TODAY so the demo
   does not become outdated.

   IMPORTANT:
   These are sample dates, not real Firebase availability.
   We will connect actual branch/service availability later.
========================================================= */

const createTemporaryAvailability = (
  todayString: string
): AppointmentDateAvailability[] => {
  const sampleDates = [
    { days: 1, slots: 15 },
    { days: 2, slots: 3 },
    { days: 4, slots: 10 },
    { days: 8, slots: 8 },
    { days: 9, slots: 12 },
    { days: 11, slots: 5 },
    { days: 15, slots: 14 },
    { days: 16, slots: 7 },
    { days: 18, slots: 11 },
  ];

  return sampleDates.map((item) => ({
    date: getDateAfterDays(todayString, item.days),
    slots: item.slots,
  }));
};

/* =========================================================
   COMPONENT
========================================================= */

export default function DateStep({
  selectedBranch,
  selectedDate,
  onSelectDate,
}: DateStepProps) {
  // Recalculate the current date from the device's local date.
  const todayString = formatLocalDate(new Date());

  // Start the calendar in the current month automatically.
  const [visibleMonth, setVisibleMonth] = useState(
    () => `${todayString.slice(0, 7)}-01`
  );

  // Temporary dates move forward with the current date.
  const availableDates = useMemo(
    () => createTemporaryAvailability(todayString),
    [todayString]
  );

  /* =======================================================
     AVAILABILITY MAP
  ======================================================= */

  const availabilityMap = useMemo(() => {
    return availableDates.reduce(
      (result, availability) => {
        result[availability.date] = availability;
        return result;
      },
      {} as Record<string, AppointmentDateAvailability>
    );
  }, [availableDates]);

  // Only dates today or later with available slots are selectable.
  const selectableDates = useMemo(
    () =>
      availableDates.filter(
        (item) =>
          item.date >= todayString && item.slots > 0
      ),
    [availableDates, todayString]
  );

  /* =======================================================
     MARKED DATES
  ======================================================= */

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    selectableDates.forEach((availability) => {
      const isSelected = selectedDate === availability.date;

      marks[availability.date] = {
        marked: true,
        dotColor: "#16A34A",
        selected: isSelected,
        selectedColor: "#2563EB",
        customStyles: {
          container: {
            backgroundColor: isSelected ? "#2563EB" : "#FFFFFF",
          },
          text: {
            color: isSelected ? "#FFFFFF" : "#1E293B",
            fontWeight: "600",
          },
        },
      };
    });

    return marks;
  }, [selectableDates, selectedDate]);

  /* =======================================================
     SELECT DATE
  ======================================================= */

  const handleDayPress = (day: DateData) => {
    // Never allow a date before today's local date.
    if (day.dateString < todayString) {
      return;
    }

    const availability = availabilityMap[day.dateString];

    // The selected date must have available appointment slots.
    if (!availability || availability.slots <= 0) {
      return;
    }

    onSelectDate(day.dateString);
  };

  /* =======================================================
     SELECTED DATE INFORMATION
  ======================================================= */

  const selectedAvailability =
    selectedDate && selectedDate >= todayString
      ? availabilityMap[selectedDate]
      : null;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <View style={styles.introduction}>
        <Text style={styles.title}>Choose a date</Text>

        <Text style={styles.description}>
          Select an available date for your appointment
          at the selected licensing branch.
        </Text>
      </View>

      {/* SELECTED BRANCH */}

      {selectedBranch && (
        <View style={styles.branchCard}>
          <View style={styles.branchIcon}>
            <Ionicons
              name="location-outline"
              size={20}
              color="#2563EB"
            />
          </View>

          <View style={styles.branchInformation}>
            <Text style={styles.branchLabel}>
              Appointment branch
            </Text>

            <Text style={styles.branchName}>
              {selectedBranch.name}
            </Text>
          </View>
        </View>
      )}

      {/* CALENDAR */}

      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <View style={styles.calendarHeading}>
            <Text style={styles.calendarTitle}>
              Available dates
            </Text>

            <Text style={styles.calendarSubtitle}>
              Green dots indicate dates with available slots
            </Text>
          </View>

          <View style={styles.availableBadge}>
            <View style={styles.availableDot} />

            <Text style={styles.availableBadgeText}>
              Available
            </Text>
          </View>
        </View>

        <Calendar
          current={visibleMonth}
          minDate={todayString}
          onDayPress={handleDayPress}
          onMonthChange={(month) => {
            setVisibleMonth(
              `${month.year}-${String(month.month).padStart(2, "0")}-01`
            );
          }}
          markedDates={markedDates}
          markingType="custom"
          enableSwipeMonths
          hideExtraDays={false}
          theme={{
            backgroundColor: "#FFFFFF",
            calendarBackground: "#FFFFFF",
            textSectionTitleColor: "#64748B",
            selectedDayBackgroundColor: "#2563EB",
            selectedDayTextColor: "#FFFFFF",
            todayTextColor: "#2563EB",
            dayTextColor: "#1E293B",
            textDisabledColor: "#CBD5E1",
            arrowColor: "#2563EB",
            monthTextColor: "#111827",
            textMonthFontWeight: "700",
            textDayFontSize: 14,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 12,
          }}
          style={styles.calendar}
        />
      </View>

      {/* QUICK DATE SELECTION */}

      <View style={styles.availableSection}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Available dates
            </Text>

            <Text style={styles.sectionSubtitle}>
              Quick selection
            </Text>
          </View>

          <Text style={styles.dateCount}>
            {selectableDates.length} dates
          </Text>
        </View>

        {selectableDates.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="calendar-outline"
              size={30}
              color="#64748B"
            />

            <Text style={styles.emptyTitle}>
              No dates available
            </Text>

            <Text style={styles.emptyDescription}>
              There are currently no appointment dates available.
              Please check again later.
            </Text>
          </View>
        ) : (
          <View style={styles.dateList}>
            {selectableDates.map((availability) => {
              const selected =
                selectedDate === availability.date;

              return (
                <TouchableOpacity
                  key={availability.date}
                  activeOpacity={0.8}
                  onPress={() => {
                    // Apply the same validation as the calendar.
                    if (availability.date < todayString) {
                      return;
                    }

                    if (availability.slots <= 0) {
                      return;
                    }

                    onSelectDate(availability.date);
                  }}
                  style={[
                    styles.dateCard,
                    selected && styles.dateCardSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.dateIcon,
                      selected && styles.dateIconSelected,
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={selected ? "#FFFFFF" : "#2563EB"}
                    />
                  </View>

                  <View style={styles.dateInformation}>
                    <Text
                      style={[
                        styles.dateText,
                        selected && styles.dateTextSelected,
                      ]}
                    >
                      {formatAppointmentDate(availability.date)}
                    </Text>

                    <Text
                      style={[
                        styles.slotsText,
                        selected && styles.slotsTextSelected,
                      ]}
                    >
                      {availability.slots}{" "}
                      {availability.slots === 1 ? "slot" : "slots"}{" "}
                      available
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.radioOuter,
                      selected && styles.radioOuterSelected,
                    ]}
                  >
                    {selected && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* SELECTED DATE SUMMARY */}

      {selectedDate && selectedAvailability && (
        <View style={styles.selectedCard}>
          <View style={styles.selectedIcon}>
            <Ionicons
              name="checkmark"
              size={18}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.selectedInformation}>
            <Text style={styles.selectedLabel}>
              Selected appointment date
            </Text>

            <Text style={styles.selectedDate}>
              {formatAppointmentDate(selectedDate)}
            </Text>

            <Text style={styles.selectedSlots}>
              {selectedAvailability.slots} appointment slots available
            </Text>
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

  branchCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 16,
    borderRadius: 14,
    backgroundColor: "#F8FAFF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },

  branchIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    marginRight: 11,
  },

  branchInformation: {
    flex: 1,
  },

  branchLabel: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 2,
  },

  branchName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },

  calendarCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },

  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  calendarHeading: {
    flex: 1,
    paddingRight: 8,
  },

  calendarTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },

  calendarSubtitle: {
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
    fontWeight: "600",
    color: "#166534",
  },

  calendar: {
    paddingBottom: 10,
  },

  availableSection: {
    marginTop: 20,
  },

  sectionHeader: {
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
    marginTop: 2,
    fontSize: 11,
    color: "#64748B",
  },

  dateCount: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563EB",
  },

  dateList: {
    gap: 10,
  },

  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },

  dateCardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#F8FAFF",
  },

  dateIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    marginRight: 11,
  },

  dateIconSelected: {
    backgroundColor: "#2563EB",
  },

  dateInformation: {
    flex: 1,
  },

  dateText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },

  dateTextSelected: {
    color: "#2563EB",
  },

  slotsText: {
    marginTop: 3,
    fontSize: 11,
    color: "#16A34A",
    fontWeight: "600",
  },

  slotsTextSelected: {
    color: "#2563EB",
  },

  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },

  radioOuterSelected: {
    borderColor: "#2563EB",
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563EB",
  },

  selectedCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
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
    fontSize: 11,
    color: "#64748B",
    marginBottom: 3,
  },

  selectedDate: {
    fontSize: 14,
    fontWeight: "700",
    color: "#166534",
  },

  selectedSlots: {
    marginTop: 3,
    fontSize: 11,
    color: "#16A34A",
  },

  emptyCard: {
    alignItems: "center",
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },

  emptyDescription: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    color: "#64748B",
  },
});
