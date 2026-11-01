
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { createAppointment } from "../../services/appointmentService";

import BookingProgress from "../../components/BookingProgress";
import ServiceStep from "../../components/ServiceStep";
import BranchStep from "../../components/BranchStep";
import DateStep from "../../components/DateStep";
import TimeStep from "../../components/TimeStep";
import ReviewStep from "../../components/ReviewStep";
import ConfirmationStep from "../../components/ConfirmationStep";

import type {
  AppointmentStep,
  AppointmentService,
  AppointmentBranch,
} from "../../types/appointment";

/* =========================================================
   BOOKING STEPS
========================================================= */

const STEPS: AppointmentStep[] = [
  "service",
  "branch",
  "date",
  "time",
  "review",
  "confirmation",
];

const STEP_LABELS: Record<AppointmentStep, string> = {
  service: "Service",
  branch: "Branch",
  date: "Date",
  time: "Time",
  review: "Review",
  confirmation: "Complete",
};

/* =========================================================
   CONTROLLER
========================================================= */

export default function AppointmentBooking() {
  const navigation = useNavigation();

  /* =======================================================
     CURRENT STEP
  ======================================================= */

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = STEPS[currentStepIndex];

  /* =======================================================
     BOOKING STATE
  ======================================================= */

  const [booking, setBooking] = useState<{
    service: AppointmentService | null;
    branch: AppointmentBranch | null;
    date: string | null;
    time: string | null;
    appointmentId: string | null;
  }>({
    service: null,
    branch: null,
    date: null,
    time: null,
    appointmentId: null,
  });

  /* =======================================================
     PROGRESS
  ======================================================= */

  const currentStepNumber = currentStepIndex + 1;
  const totalSteps = STEPS.length;

  const progressPercentage =
    (currentStepNumber / totalSteps) * 100;

  /* =======================================================
     UPDATE SERVICE
  ======================================================= */

  const selectService = (service: AppointmentService) => {
    setBooking((previous) => ({
      ...previous,
      service,

      // Changing the service invalidates
      // everything below it.
      branch: null,
      date: null,
      time: null,
    }));
  };

  /* =======================================================
     UPDATE BRANCH
  ======================================================= */

  const selectBranch = (branch: AppointmentBranch) => {
    setBooking((previous) => ({
      ...previous,
      branch,

      // Changing branch invalidates
      // the selected date and time.
      date: null,
      time: null,
    }));
  };

  /* =======================================================
     UPDATE DATE
  ======================================================= */

  const selectDate = (date: string) => {
    setBooking((previous) => ({
      ...previous,
      date,

      // Changing date invalidates the time.
      time: null,
    }));
  };

  /* =======================================================
     UPDATE TIME
  ======================================================= */

  const selectTime = (time: string) => {
    setBooking((previous) => ({
      ...previous,
      time,
    }));
  };

  /* =======================================================
     VALIDATION
  ======================================================= */

  const canContinue = (): boolean => {
    switch (currentStep) {
      case "service":
        return booking.service !== null;

      case "branch":
        return booking.branch !== null;

      case "date":
        return booking.date !== null;

      case "time":
        return booking.time !== null;

      case "review":
        return (
          booking.service !== null &&
          booking.branch !== null &&
          booking.date !== null &&
          booking.time !== null
        );

      case "confirmation":
        return false;

      default:
        return false;
    }
  };

  /* =======================================================
     GO TO SPECIFIC STEP
  ======================================================= */

  const goToStep = (step: AppointmentStep) => {
    const index = STEPS.indexOf(step);

    if (index === -1) {
      return;
    }

    setCurrentStepIndex(index);
  };

  /* =======================================================
     NEXT
  ======================================================= */

  const handleNext = () => {
    if (!canContinue()) {
      return;
    }

    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((previous) => previous + 1);
    }
  };

  /* =======================================================
     BACK
  ======================================================= */

  const handleBack = () => {
    // Do nothing on confirmation screen.
    if (currentStep === "confirmation") {
      return;
    }

    // Go to previous booking step.
    if (currentStepIndex > 0) {
      setCurrentStepIndex((previous) => previous - 1);
      return;
    }

    // First step → leave booking screen.
    navigation.goBack();
  };

  /* =======================================================
     CONFIRM APPOINTMENT
  ======================================================= */

  const handleConfirm = async () => {
    console.log("========================================");
    console.log("📅 APPOINTMENT CONFIRM STARTED");
    console.log("========================================");

    console.log(
      "[AppointmentBooking] Current booking:",
      booking
    );

    /* -------------------------------------------------------
       VALIDATION
    ------------------------------------------------------- */

    if (!canContinue()) {
      console.log(
        "[AppointmentBooking] ❌ Validation failed"
      );

      console.log(
        "[AppointmentBooking] Service:",
        booking.service
      );

      console.log(
        "[AppointmentBooking] Branch:",
        booking.branch
      );

      console.log(
        "[AppointmentBooking] Date:",
        booking.date
      );

      console.log(
        "[AppointmentBooking] Time:",
        booking.time
      );

      return;
    }

    console.log(
      "[AppointmentBooking] ✅ Booking validation passed"
    );

    try {
      /* -----------------------------------------------------
         GET USER
      ----------------------------------------------------- */

      console.log(
        "[AppointmentBooking] Getting userId from AsyncStorage..."
      );

      const userId =
        await AsyncStorage.getItem("userId");

      console.log(
        "[AppointmentBooking] userId:",
        userId
      );

      if (!userId) {
        console.error(
          "[AppointmentBooking] ❌ No userId found"
        );

        throw new Error(
          "No logged-in citizen was found."
        );
      }

      console.log(
        "[AppointmentBooking] ✅ Citizen identified:",
        userId
      );

      /* -----------------------------------------------------
         CREATE APPOINTMENT
      ----------------------------------------------------- */

      console.log(
        "[AppointmentBooking] Sending appointment to Firestore..."
      );

      const result = await createAppointment({
        userId,
        booking,
      });

      console.log(
        "[AppointmentBooking] ✅ Firestore appointment created"
      );

      console.log(
        "[AppointmentBooking] Appointment ID:",
        result.appointmentId
      );

      console.log(
        "[AppointmentBooking] Appointment Number:",
        result.appointmentNumber
      );

      /* -----------------------------------------------------
         SAVE APPOINTMENT ID
      ----------------------------------------------------- */

      setBooking((previous) => ({
        ...previous,
        appointmentId: result.appointmentId,
      }));

      console.log(
        "[AppointmentBooking] Booking state updated"
      );

      /* -----------------------------------------------------
         GO TO CONFIRMATION
      ----------------------------------------------------- */

      setCurrentStepIndex(
        STEPS.indexOf("confirmation")
      );

      console.log(
        "[AppointmentBooking] ✅ Navigating to confirmation"
      );

      console.log("========================================");
      console.log("📅 APPOINTMENT CONFIRM SUCCESS");
      console.log("========================================");
    } catch (error) {
      console.error("========================================");
      console.error(
        "❌ APPOINTMENT CONFIRM FAILED"
      );
      console.error("========================================");

      console.error(
        "[AppointmentBooking] Error:",
        error
      );

      if (error instanceof Error) {
        console.error(
          "[AppointmentBooking] Error message:",
          error.message
        );

        console.error(
          "[AppointmentBooking] Error stack:",
          error.stack
        );
      }

      console.error("========================================");

      alert(
        "We could not confirm your appointment. Please try again."
      );
    }
  };

  /* =======================================================
     DONE
  ======================================================= */

  const handleDone = () => {
    navigation.goBack();
  };

  /* =======================================================
     VIEW APPOINTMENTS
  ======================================================= */

  const handleViewAppointments = () => {
    /*
      Connect this later to your appointments screen.

      Example:

      navigation.navigate("Appointments");
    */

    navigation.goBack();
  };

  /* =======================================================
     STEP CONTENT
  ======================================================= */

  const renderStep = () => {
    switch (currentStep) {
      /* ===================================================
         SERVICE
      =================================================== */

      case "service":
        return (
          <ServiceStep
            selectedService={booking.service}
            onSelectService={selectService}
          />
        );

      /* ===================================================
         BRANCH
      =================================================== */

      case "branch":
        return (
          <BranchStep
            selectedBranch={booking.branch}
            onSelectBranch={selectBranch}
          />
        );

      /* ===================================================
         DATE
      =================================================== */

      case "date":
        return (
          <DateStep
            selectedDate={booking.date}
            selectedBranch={booking.branch}
            onSelectDate={selectDate}
          />
        );

      /* ===================================================
         TIME
      =================================================== */

      case "time":
        return (
          <TimeStep
            selectedDate={booking.date}
            selectedTime={booking.time}
            selectedBranch={booking.branch}
            onSelectTime={selectTime}
          />
        );

      /* ===================================================
         REVIEW
      =================================================== */

      case "review":
        return (
          <ReviewStep
            service={booking.service}
            branch={booking.branch}
            date={booking.date}
            time={booking.time}
            onEditService={() =>
              goToStep("service")
            }
            onEditBranch={() =>
              goToStep("branch")
            }
            onEditDate={() =>
              goToStep("date")
            }
            onEditTime={() =>
              goToStep("time")
            }
          />
        );

      /* ===================================================
         CONFIRMATION
      =================================================== */

      case "confirmation":
        return (
          <ConfirmationStep
            appointmentId={booking.appointmentId}
            service={booking.service}
            branch={booking.branch}
            date={booking.date}
            time={booking.time}
            onDone={handleDone}
            onViewAppointments={
              handleViewAppointments
            }
          />
        );

      default:
        return null;
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom"]}
    >
      {/* ===================================================
          HEADER
      =================================================== */}

      <View style={styles.header}>
        {currentStep !== "confirmation" ? (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            Appointment
          </Text>

          <Text style={styles.headerSubtitle}>
            {currentStep === "confirmation"
              ? "Appointment complete"
              : `Step ${currentStepNumber} of ${totalSteps}`}
          </Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      {/* ===================================================
          PROGRESS
      =================================================== */}

      <BookingProgress
        currentStep={currentStep}
        currentStepIndex={currentStepIndex}
        stepLabels={STEP_LABELS}
        progressPercentage={progressPercentage}
      />

      {/* ===================================================
          STEP CONTENT
      =================================================== */}

      <View style={styles.content}>
        {renderStep()}
      </View>

      {/* ===================================================
          BOTTOM ACTION
      =================================================== */}

      {currentStep !== "confirmation" && (
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={!canContinue()}
            onPress={
              currentStep === "review"
                ? handleConfirm
                : handleNext
            }
            style={[
              styles.continueButton,
              !canContinue() &&
                styles.continueButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.continueButtonText,
                !canContinue() &&
                  styles.continueButtonTextDisabled,
              ]}
            >
              {currentStep === "review"
                ? "Confirm Appointment"
                : "Continue"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =======================================================
     SAFE AREA
  ======================================================= */

  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  /* =======================================================
     HEADER
  ======================================================= */

  header: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  backText: {
    fontSize: 34,
    lineHeight: 38,
    color: "#0F172A",
  },

  headerCenter: {
    flex: 1,
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#64748B",
  },

  headerSpacer: {
    width: 44,
  },

  /* =======================================================
     CONTENT
  ======================================================= */

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  /* =======================================================
     BOTTOM ACTION
  ======================================================= */

  bottomContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  continueButton: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
  },

  continueButtonDisabled: {
    backgroundColor: "#E2E8F0",
  },

  continueButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  continueButtonTextDisabled: {
    color: "#94A3B8",
  },
});
