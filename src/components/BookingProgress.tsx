
import React from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";

/* =========================================================
   TYPES
========================================================= */

export type BookingProgressStep =
  | "service"
  | "branch"
  | "date"
  | "time"
  | "review"
  | "confirmation";

interface BookingProgressProps {
  currentStep: BookingProgressStep;
}

/* =========================================================
   CONFIGURATION
========================================================= */

const STEPS: BookingProgressStep[] = [
  "service",
  "branch",
  "date",
  "time",
  "review",
  "confirmation",
];

const STEP_LABELS: Record<BookingProgressStep, string> = {
  service: "Service",
  branch: "Branch",
  date: "Date",
  time: "Time",
  review: "Review",
  confirmation: "Complete",
};

/* =========================================================
   COMPONENT
========================================================= */

export default function BookingProgress({
  currentStep,
}: BookingProgressProps) {
  const currentStepIndex = STEPS.indexOf(currentStep);

  const currentStepNumber = currentStepIndex + 1;
  const totalSteps = STEPS.length;

  const progressPercentage =
    (currentStepNumber / totalSteps) * 100;

  return (
    <View style={styles.container}>

      {/* ===================================================
          STEP INFORMATION
      =================================================== */}

      <View style={styles.stepInfoRow}>
        <Text style={styles.stepText}>
          Step {currentStepNumber} of {totalSteps}
        </Text>

        <Text style={styles.currentStepText}>
          {STEP_LABELS[currentStep]}
        </Text>
      </View>

      {/* ===================================================
          PROGRESS BAR
      =================================================== */}

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progressPercentage}%`,
            },
          ]}
        />
      </View>

      {/* ===================================================
          STEP INDICATORS
      =================================================== */}

      <View style={styles.stepsContainer}>
        {STEPS.map((step, index) => {
          const completed =
            index < currentStepIndex;

          const active =
            index === currentStepIndex;

          return (
            <View
              key={step}
              style={styles.stepContainer}
            >

              {/* Connector */}

              {index > 0 && (
                <View
                  style={[
                    styles.connector,
                    index <= currentStepIndex &&
                      styles.connectorCompleted,
                  ]}
                />
              )}

              {/* Circle */}

              <View
                style={[
                  styles.circle,
                  completed &&
                    styles.circleCompleted,
                  active &&
                    styles.circleActive,
                ]}
              >
                <Text
                  style={[
                    styles.circleText,
                    (completed || active) &&
                      styles.circleTextActive,
                  ]}
                >
                  {completed
                    ? "✓"
                    : index + 1}
                </Text>
              </View>

              {/* Label */}

              <Text
                style={[
                  styles.label,
                  active &&
                    styles.labelActive,
                  completed &&
                    styles.labelCompleted,
                ]}
                numberOfLines={1}
              >
                {STEP_LABELS[step]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
  },

  /* -------------------------------------------------------
     STEP INFORMATION
  ------------------------------------------------------- */

  stepInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  stepText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },

  currentStepText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },

  /* -------------------------------------------------------
     PROGRESS BAR
  ------------------------------------------------------- */

  progressTrack: {
    width: "100%",
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },

  progressFill: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "#2563EB",
  },

  /* -------------------------------------------------------
     STEP INDICATORS
  ------------------------------------------------------- */

  stepsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },

  stepContainer: {
    width: 52,
    alignItems: "center",
    position: "relative",
  },

  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  circleActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },

  circleCompleted: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },

  circleText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
  },

  circleTextActive: {
    color: "#FFFFFF",
  },

  /* -------------------------------------------------------
     CONNECTORS
  ------------------------------------------------------- */

  connector: {
    position: "absolute",
    top: 13,
    right: "50%",
    width: 52,
    height: 2,
    backgroundColor: "#E5E7EB",
    zIndex: 1,
  },

  connectorCompleted: {
    backgroundColor: "#16A34A",
  },

  /* -------------------------------------------------------
     LABELS
  ------------------------------------------------------- */

  label: {
    marginTop: 6,
    fontSize: 9,
    fontWeight: "500",
    color: "#9CA3AF",
    textAlign: "center",
  },

  labelActive: {
    color: "#2563EB",
    fontWeight: "700",
  },

  labelCompleted: {
    color: "#16A34A",
    fontWeight: "600",
  },
});

