import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useFocusEffect } from "@react-navigation/native";

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getMyAppointments,
} from "../../services/appointmentService";

import type {
  FirestoreAppointment,
  AppointmentStatus,
} from "../../services/appointmentService";

/* =========================================================
   COLORS
========================================================= */

const COLORS = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#EFF6FF",

  success: "#15803D",
  successLight: "#DCFCE7",

  warning: "#B45309",
  warningLight: "#FEF3C7",

  danger: "#DC2626",
  dangerLight: "#FEF2F2",

  text: "#1E293B",
  textDark: "#0F172A",
  secondary: "#64748B",
  muted: "#94A3B8",

  white: "#FFFFFF",
  background: "#F8FAFC",
  border: "#E2E8F0",
  divider: "#F1F5F9",
};

/* =========================================================
   PROPS
========================================================= */

type Props = {
  onPress?: () => void;
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function NextAppointmentCard({
  onPress,
}: Props) {
  const [appointments, setAppointments] = useState<
    FirestoreAppointment[]
  >([]);

  const [loading, setLoading] = useState(true);

  /*
   * Current time.
   *
   * This gets updated every minute so the countdown
   * automatically changes.
   */
  const [now, setNow] = useState(new Date());

  /* =======================================================
     LOAD APPOINTMENTS
  ======================================================= */

  const loadAppointments = useCallback(async () => {
    try {
      console.log(
        "[NextAppointmentCard] Loading appointments..."
      );

      const userId =
        await AsyncStorage.getItem("userId");

      console.log(
        "[NextAppointmentCard] userId:",
        userId
      );

      if (!userId) {
        console.log(
          "[NextAppointmentCard] No logged-in user"
        );

        setAppointments([]);
        return;
      }

      const result =
        await getMyAppointments(userId);

      console.log(
        "[NextAppointmentCard] Appointments:",
        result.length
      );

      setAppointments(result);
    } catch (error) {
      console.error(
        "[NextAppointmentCard] LOAD ERROR:",
        error
      );

      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

 useFocusEffect(
  useCallback(() => {
    console.log(
      "[NextAppointmentCard] Home screen focused. Refreshing appointments..."
    );

    loadAppointments();
  }, [loadAppointments])
);

  /* =======================================================
     LIVE CLOCK
  =======================================================

     Update every minute.

     Example:

     10:00 → 10:01 → 10:02 → etc.

  ======================================================= */

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  /* =======================================================
     FIND NEXT APPOINTMENT
  ======================================================= */

  const nextAppointment = useMemo(() => {
    /*
     * Only confirmed and pending appointments
     * should appear here.
     */

    const upcoming =
      appointments.filter(
        (appointment) =>
          appointment.status === "confirmed" ||
          appointment.status === "pending"
      );

    /*
     * Convert each appointment into a JavaScript Date.
     */

    const futureAppointments = upcoming
      .map((appointment) => ({
        appointment,
        date: getAppointmentDate(
          appointment
        ),
      }))

      /*
       * Remove appointments that are already past.
       */

      .filter(
        (item) =>
          item.date.getTime() >
          now.getTime()
      )

      /*
       * Sort nearest appointment first.
       */

      .sort(
        (a, b) =>
          a.date.getTime() -
          b.date.getTime()
      );

    /*
     * Return the closest appointment.
     */

    return (
      futureAppointments[0]?.appointment ??
      null
    );
  }, [appointments, now]);

  /* =======================================================
     COUNTDOWN
  ======================================================= */

  const countdown = useMemo(() => {
    if (!nextAppointment) {
      return null;
    }

    const appointmentDate =
      getAppointmentDate(
        nextAppointment
      );

    return getCountdown(
      now,
      appointmentDate
    );
  }, [nextAppointment, now]);

  /* =======================================================
     LOADING STATE
  ======================================================= */

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="calendar-outline"
              size={22}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.loadingTextContainer}>
            <Text style={styles.title}>
              Next Appointment
            </Text>

            <Text style={styles.loadingText}>
              Checking your appointments...
            </Text>
          </View>

          <ActivityIndicator
            size="small"
            color={COLORS.primary}
          />
        </View>
      </View>
    );
  }

  /* =======================================================
     NO APPOINTMENT
  ======================================================= */

  if (
    !nextAppointment ||
    !countdown
  ) {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={onPress}
      >
        {/* HEADER */}

        <View style={styles.topRow}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="calendar-outline"
              size={22}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              Next Appointment
            </Text>

            <Text style={styles.subtitle}>
              No upcoming appointment
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={COLORS.muted}
          />
        </View>

        {/* EMPTY MESSAGE */}

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="calendar-clear-outline"
              size={20}
              color={COLORS.secondary}
            />
          </View>

          <View style={styles.emptyTextContainer}>
            <Text style={styles.emptyTitle}>
              You're all clear
            </Text>

            <Text style={styles.emptyText}>
              You don't have any upcoming
              appointments.
            </Text>
          </View>
        </View>

        {/* ACTION */}

        <View style={styles.emptyFooter}>
          <Text style={styles.bookText}>
            Book an appointment
          </Text>

          <Ionicons
            name="arrow-forward"
            size={16}
            color={COLORS.primary}
          />
        </View>
      </TouchableOpacity>
    );
  }

  /* =======================================================
     APPOINTMENT DATA
  ======================================================= */

  const appointmentDate =
    getAppointmentDate(
      nextAppointment
    );

  const status =
    getStatusStyle(
      nextAppointment.status
    );

  /* =======================================================
     MAIN CARD
  ======================================================= */

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={onPress}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <View style={styles.topRow}>
        {/* ICON */}

        <View style={styles.iconContainer}>
          <Ionicons
            name="calendar-outline"
            size={22}
            color={COLORS.primary}
          />
        </View>

        {/* TITLE */}

        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            Next Appointment
          </Text>

          <Text style={styles.subtitle}>
            Your upcoming visit
          </Text>
        </View>

        {/* STATUS */}

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                status.background,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  status.text,
              },
            ]}
          />

          <Text
            style={[
              styles.statusText,
              {
                color: status.text,
              },
            ]}
          >
            {formatStatus(
              nextAppointment.status
            )}
          </Text>
        </View>
      </View>

      {/* =================================================
          COUNTDOWN
      ================================================= */}

      <View style={styles.countdownContainer}>
        {/* Small heading */}

        <Text style={styles.countdownSmallTitle}>
          APPOINTMENT COUNTDOWN
        </Text>

        {/* NUMBER */}

        <Text style={styles.countdownNumber}>
          {countdown.primary}
        </Text>

        {/* LABEL */}

        <Text style={styles.countdownLabel}>
          {countdown.secondary}
        </Text>

        {/* MOTIVATION */}

        <View style={styles.motivationContainer}>
          <Ionicons
            name="sparkles-outline"
            size={15}
            color={COLORS.primary}
          />

          <Text style={styles.motivationText}>
            {countdown.motivation}
          </Text>
        </View>
      </View>

      {/* =================================================
          APPOINTMENT DETAILS
      ================================================= */}

      <View style={styles.appointmentInfo}>
        {/* SERVICE */}

        <Text
          style={styles.serviceName}
          numberOfLines={2}
        >
          {nextAppointment.service.name}
        </Text>

        {/* DATE */}

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={COLORS.secondary}
            />
          </View>

          <Text style={styles.infoText}>
            {formatDate(
              appointmentDate
            )}
          </Text>
        </View>

        {/* TIME */}

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="time-outline"
              size={14}
              color={COLORS.secondary}
            />
          </View>

          <Text style={styles.infoText}>
            {formatTime(
              appointmentDate
            )}
          </Text>
        </View>

        {/* LOCATION */}

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="location-outline"
              size={14}
              color={COLORS.secondary}
            />
          </View>

          <Text
            style={styles.infoText}
            numberOfLines={1}
          >
            {nextAppointment.branch.name}
          </Text>
        </View>
      </View>

      {/* =================================================
          FOOTER
      ================================================= */}

      <View style={styles.footer}>
        <View>
          <Text style={styles.referenceLabel}>
            REFERENCE
          </Text>

          <Text style={styles.reference}>
            {
              nextAppointment.appointmentNumber
            }
          </Text>
        </View>

        <View style={styles.viewAppointment}>
          <Text style={styles.viewText}>
            View appointment
          </Text>

          <View style={styles.arrowContainer}>
            <Ionicons
              name="chevron-forward"
              size={15}
              color={COLORS.white}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* =========================================================
   GET APPOINTMENT DATE
========================================================= */

/**
 * Converts:
 *
 * date = "2026-09-05"
 * time = "09:30"
 *
 * into:
 *
 * JavaScript Date
 *
 * Also supports:
 *
 * "09:30 AM"
 * "9:30 AM"
 * "09:30"
 */

function getAppointmentDate(
  appointment: FirestoreAppointment
): Date {
  const date = appointment.date;

  const time =
    appointment.time?.trim() || "00:00";

  let hours = 0;
  let minutes = 0;

  const timeString =
    time.toUpperCase();

  /* -------------------------------------------------------
     12-HOUR FORMAT
     Example: 09:30 AM
  ------------------------------------------------------- */

  const amPmMatch =
    timeString.match(
      /^(\d{1,2}):(\d{2})\s*(AM|PM)$/
    );

  if (amPmMatch) {
    hours = Number(
      amPmMatch[1]
    );

    minutes = Number(
      amPmMatch[2]
    );

    const period =
      amPmMatch[3];

    if (
      period === "PM" &&
      hours !== 12
    ) {
      hours += 12;
    }

    if (
      period === "AM" &&
      hours === 12
    ) {
      hours = 0;
    }
  } else {
    /* -----------------------------------------------------
       24-HOUR FORMAT
       Example: 09:30
    ----------------------------------------------------- */

    const match =
      timeString.match(
        /^(\d{1,2}):(\d{2})$/
      );

    if (match) {
      hours = Number(
        match[1]
      );

      minutes = Number(
        match[2]
      );
    }
  }

  /* -------------------------------------------------------
     CREATE DATE
  ------------------------------------------------------- */

  const result = new Date(
    `${date}T00:00:00`
  );

  result.setHours(hours);
  result.setMinutes(minutes);
  result.setSeconds(0);
  result.setMilliseconds(0);

  return result;
}

/* =========================================================
   COUNTDOWN
========================================================= */

function getCountdown(
  now: Date,
  target: Date
) {
  const difference =
    target.getTime() -
    now.getTime();

  if (difference <= 0) {
    return null;
  }

  const totalMinutes =
    Math.floor(
      difference /
        (1000 * 60)
    );

  const totalHours =
    Math.floor(
      totalMinutes / 60
    );

  const totalDays =
    Math.floor(
      totalHours / 24
    );

  /* =======================================================
     MORE THAN 1 DAY
  ======================================================= */

  if (totalDays > 1) {
    return {
      primary: String(totalDays),

      secondary:
        "DAYS LEFT",

      motivation:
        getMotivation(
          totalDays
        ),
    };
  }

  /* =======================================================
     TOMORROW
  ======================================================= */

  if (totalDays === 1) {
    return {
      primary: "1",

      secondary:
        "DAY LEFT",

      motivation:
        "Tomorrow is the day. Get everything ready.",
    };
  }

  /* =======================================================
     TODAY — HOURS LEFT
  ======================================================= */

  if (totalHours >= 1) {
    const minutes =
      totalMinutes % 60;

    let primary = "";

    if (minutes > 0) {
      primary = `${totalHours}h ${minutes}m`;
    } else {
      primary = `${totalHours}h`;
    }

    return {
      primary,

      secondary:
        "UNTIL YOUR APPOINTMENT",

      motivation:
        "It's almost time. Stay calm and stay ready.",
    };
  }

  /* =======================================================
     LESS THAN ONE HOUR
  ======================================================= */

  return {
    primary: `${Math.max(
      totalMinutes,
      1
    )}m`,

    secondary:
      "UNTIL YOUR APPOINTMENT",

    motivation:
      "You're nearly there. You've got this.",
  };
}

/* =========================================================
   MOTIVATION
========================================================= */

function getMotivation(
  days: number
) {
  /* -------------------------------------------------------
     More than 30 days
  ------------------------------------------------------- */

  if (days > 30) {
    return "You've got time. Stay prepared and keep moving.";
  }

  /* -------------------------------------------------------
     15 - 30 days
  ------------------------------------------------------- */

  if (days > 14) {
    return "You're on track. Keep everything ready.";
  }

  /* -------------------------------------------------------
     8 - 14 days
  ------------------------------------------------------- */

  if (days > 7) {
    return "The day is getting closer. Stay prepared.";
  }

  /* -------------------------------------------------------
     4 - 7 days
  ------------------------------------------------------- */

  if (days > 3) {
    return "You're almost there. Make sure everything is ready.";
  }

  /* -------------------------------------------------------
     2 - 3 days
  ------------------------------------------------------- */

  if (days > 1) {
    return "Just a few days to go. Stay focused.";
  }

  /* -------------------------------------------------------
     Tomorrow
  ------------------------------------------------------- */

  return "Tomorrow is the day. Get everything ready.";
}

/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
  date: Date
) {
  return date.toLocaleDateString(
    "en-ZA",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(
  date: Date
) {
  return date.toLocaleTimeString(
    "en-ZA",
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  );
}

/* =========================================================
   STATUS TEXT
========================================================= */

function formatStatus(
  status: AppointmentStatus
) {
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

/* =========================================================
   STATUS COLORS
========================================================= */

function getStatusStyle(
  status: AppointmentStatus
) {
  switch (status) {
    case "confirmed":
      return {
        background:
          COLORS.successLight,

        text:
          COLORS.success,
      };

    case "pending":
      return {
        background:
          COLORS.warningLight,

        text:
          COLORS.warning,
      };

    case "completed":
      return {
        background:
          "#E2E8F0",

        text:
          "#475569",
      };

    case "cancelled":
      return {
        background:
          COLORS.dangerLight,

        text:
          COLORS.danger,
      };

    default:
      return {
        background:
          "#F1F5F9",

        text:
          COLORS.secondary,
      };
  }
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =======================================================
     CARD
  ======================================================= */

  card: {
    backgroundColor:
      COLORS.white,

    borderRadius: 20,

    padding: 16,

    borderWidth: 1,

    borderColor:
      COLORS.border,

    marginBottom: 14,

    shadowColor: "#000",

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.04,

    shadowRadius: 8,

    elevation: 2,
  },

  /* =======================================================
     HEADER
  ======================================================= */

  topRow: {
    flexDirection: "row",

    alignItems: "center",
  },

  iconContainer: {
    width: 44,

    height: 44,

    borderRadius: 13,

    backgroundColor:
      COLORS.primaryLight,

    alignItems: "center",

    justifyContent: "center",
  },

  titleContainer: {
    flex: 1,

    marginLeft: 11,

    marginRight: 8,
  },

  title: {
    fontSize: 15,

    fontWeight: "900",

    color:
      COLORS.text,
  },

  subtitle: {
    marginTop: 3,

    fontSize: 10,

    color:
      COLORS.secondary,
  },

  /* =======================================================
     STATUS
  ======================================================= */

  statusBadge: {
    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 8,

    paddingVertical: 5,

    borderRadius: 20,
  },

  statusDot: {
    width: 5,

    height: 5,

    borderRadius: 3,

    marginRight: 5,
  },

  statusText: {
    fontSize: 9,

    fontWeight: "900",
  },

  /* =======================================================
     COUNTDOWN
  ======================================================= */

  countdownContainer: {
    marginTop: 18,

    paddingVertical: 20,

    paddingHorizontal: 14,

    borderRadius: 18,

    backgroundColor:
      COLORS.primaryLight,

    alignItems: "center",

    justifyContent: "center",

    borderWidth: 1,

    borderColor:
      "#DBEAFE",
  },

  countdownSmallTitle: {
    fontSize: 8,

    fontWeight: "900",

    color:
      COLORS.secondary,

    letterSpacing: 1.2,

    marginBottom: 3,
  },

  countdownNumber: {
    fontSize: 42,

    lineHeight: 47,

    fontWeight: "900",

    color:
      COLORS.primary,

    letterSpacing: -1.5,
  },

  countdownLabel: {
    marginTop: 1,

    fontSize: 10,

    fontWeight: "900",

    color:
      "#475569",

    letterSpacing: 1,
  },

  /* =======================================================
     MOTIVATION
  ======================================================= */

  motivationContainer: {
    marginTop: 13,

    paddingTop: 11,

    paddingHorizontal: 10,

    borderTopWidth: 1,

    borderTopColor:
      "#DBEAFE",

    width: "100%",

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",
  },

  motivationText: {
    marginLeft: 6,

    textAlign: "center",

    fontSize: 10.5,

    lineHeight: 16,

    fontWeight: "600",

    color:
      COLORS.secondary,

    flexShrink: 1,
  },

  /* =======================================================
     APPOINTMENT INFO
  ======================================================= */

  appointmentInfo: {
    marginTop: 16,
  },

  serviceName: {
    fontSize: 15,

    lineHeight: 20,

    fontWeight: "900",

    color:
      COLORS.text,

    marginBottom: 8,
  },

  infoRow: {
    flexDirection: "row",

    alignItems: "center",

    marginTop: 7,
  },

  infoIcon: {
    width: 25,

    alignItems: "center",

    justifyContent: "center",
  },

  infoText: {
    marginLeft: 4,

    fontSize: 11,

    color:
      COLORS.secondary,

    flexShrink: 1,
  },

  /* =======================================================
     FOOTER
  ======================================================= */

  footer: {
    marginTop: 16,

    paddingTop: 13,

    borderTopWidth: 1,

    borderTopColor:
      COLORS.divider,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",
  },

  referenceLabel: {
    fontSize: 7,

    fontWeight: "900",

    color:
      COLORS.muted,

    letterSpacing: 0.7,
  },

  reference: {
    marginTop: 2,

    fontSize: 9,

    fontWeight: "800",

    color:
      COLORS.secondary,
  },

  viewAppointment: {
    flexDirection: "row",

    alignItems: "center",
  },

  viewText: {
    fontSize: 10.5,

    fontWeight: "800",

    color:
      COLORS.primary,

    marginRight: 7,
  },

  arrowContainer: {
    width: 25,

    height: 25,

    borderRadius: 8,

    backgroundColor:
      COLORS.primary,

    alignItems: "center",

    justifyContent: "center",
  },

  /* =======================================================
     LOADING
  ======================================================= */

  loadingContainer: {
    flexDirection: "row",

    alignItems: "center",
  },

  loadingTextContainer: {
    flex: 1,

    marginLeft: 11,
  },

  loadingText: {
    marginTop: 3,

    fontSize: 10,

    color:
      COLORS.secondary,
  },

  /* =======================================================
     EMPTY
  ======================================================= */

  emptyContainer: {
    marginTop: 16,

    padding: 13,

    borderRadius: 14,

    backgroundColor:
      COLORS.background,

    flexDirection: "row",

    alignItems: "center",
  },

  emptyIcon: {
    width: 38,

    height: 38,

    borderRadius: 11,

    backgroundColor:
      COLORS.white,

    alignItems: "center",

    justifyContent: "center",
  },

  emptyTextContainer: {
    flex: 1,

    marginLeft: 10,
  },

  emptyTitle: {
    fontSize: 12,

    fontWeight: "800",

    color:
      COLORS.text,
  },

  emptyText: {
    marginTop: 3,

    fontSize: 10,

    lineHeight: 15,

    color:
      COLORS.secondary,
  },

  emptyFooter: {
    marginTop: 13,

    paddingTop: 12,

    borderTopWidth: 1,

    borderTopColor:
      COLORS.divider,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "flex-end",
  },

  bookText: {
    fontSize: 10.5,

    fontWeight: "800",

    color:
      COLORS.primary,

    marginRight: 5,
  },
});