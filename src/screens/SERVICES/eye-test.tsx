import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

/* =========================================================
   TYPES
========================================================= */

type Direction = "up" | "down" | "left" | "right";

type TestQuestion = {
  direction: Direction;
  size: number;
};

/* =========================================================
   QUESTIONS
========================================================= */

const QUESTIONS: TestQuestion[] = [
  { direction: "up", size: 78 },
  { direction: "right", size: 70 },
  { direction: "left", size: 64 },
  { direction: "down", size: 58 },
  { direction: "up", size: 52 },
  { direction: "right", size: 46 },
  { direction: "left", size: 40 },
  { direction: "down", size: 35 },
  { direction: "up", size: 31 },
  { direction: "right", size: 27 },
];

/* =========================================================
   HELPERS
========================================================= */

function getDirectionIcon(direction: Direction) {
  switch (direction) {
    case "up":
      return "arrow-up";

    case "down":
      return "arrow-down";

    case "left":
      return "arrow-back";

    case "right":
      return "arrow-forward";

    default:
      return "help";
  }
}

function getResult(score: number, total: number) {
  const percentage = Math.round(
    (score / total) * 100
  );

  if (percentage >= 90) {
    return {
      title: "Excellent",
      description:
        "You identified almost all of the visual patterns correctly.",
    };
  }

  if (percentage >= 70) {
    return {
      title: "Good",
      description:
        "You performed well during this visual test.",
    };
  }

  if (percentage >= 50) {
    return {
      title: "Fair",
      description:
        "You may want to try the test again in good lighting.",
    };
  }

  return {
    title: "Needs Attention",
    description:
      "Your score was lower than expected. Consider taking a proper eye examination if you have concerns about your vision.",
  };
}

/* =========================================================
   COMPONENT
========================================================= */

export default function EyeTestScreen() {
  const navigation = useNavigation<any>();

  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] =
    useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = QUESTIONS[currentQuestion];

  const progress = useMemo(() => {
    if (!started) {
      return 0;
    }

    return Math.round(
      ((currentQuestion + 1) /
        QUESTIONS.length) *
        100
    );
  }, [started, currentQuestion]);

  /* =======================================================
     START
  ======================================================= */

  const startTest = () => {
    setScore(0);
    setCurrentQuestion(0);
    setFinished(false);
    setStarted(true);
  };

  /* =======================================================
     ANSWER
  ======================================================= */

  const answerQuestion = (
    answer: Direction
  ) => {
    if (!question) {
      return;
    }

    const correct =
      answer === question.direction;

    const newScore = correct
      ? score + 1
      : score;

    if (currentQuestion === QUESTIONS.length - 1) {
      setScore(newScore);
      setFinished(true);
      return;
    }

    setScore(newScore);
    setCurrentQuestion(
      (previous) => previous + 1
    );
  };

  /* =======================================================
     RESET
  ======================================================= */

  const resetTest = () => {
    setStarted(false);
    setFinished(false);
    setCurrentQuestion(0);
    setScore(0);
  };

  /* =======================================================
     RESULT
  ======================================================= */

  if (finished) {
    const result = getResult(
      score,
      QUESTIONS.length
    );

    const percentage = Math.round(
      (score / QUESTIONS.length) * 100
    );

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              navigation.goBack()
            }
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color="#17212B"
            />
          </TouchableOpacity>

          <View>
            <Text style={styles.headerTitle}>
              Eye Test
            </Text>

            <Text
              style={styles.headerSubtitle}
            >
              Your test result
            </Text>
          </View>
        </View>

        <View style={styles.resultContainer}>
          <View style={styles.resultIcon}>
            <Ionicons
              name="eye-outline"
              size={48}
              color="#0B4F8A"
            />
          </View>

          <Text style={styles.resultTitle}>
            {result.title}
          </Text>

          <Text style={styles.score}>
            {percentage}%
          </Text>

          <Text style={styles.scoreDescription}>
            {score} out of{" "}
            {QUESTIONS.length} correct
          </Text>

          <Text style={styles.resultDescription}>
            {result.description}
          </Text>

          <View style={styles.resultNotice}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#0B4F8A"
            />

            <Text style={styles.resultNoticeText}>
              This is a fun visual test and is
              not a medical eye examination or
              diagnosis.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={startTest}
          >
            <Ionicons
              name="refresh-outline"
              size={19}
              color="#FFFFFF"
            />

            <Text
              style={styles.primaryButtonText}
            >
              Test Again
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              navigation.goBack()
            }
          >
            <Text
              style={styles.secondaryButtonText}
            >
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* =======================================================
     START SCREEN
  ======================================================= */

  if (!started) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              navigation.goBack()
            }
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color="#17212B"
            />
          </TouchableOpacity>

          <View>
            <Text style={styles.headerTitle}>
              Eye Test
            </Text>

            <Text
              style={styles.headerSubtitle}
            >
              Visual acuity challenge
            </Text>
          </View>
        </View>

        <View style={styles.startContainer}>
          <View style={styles.eyeIcon}>
            <Ionicons
              name="eye-outline"
              size={52}
              color="#0B4F8A"
            />
          </View>

          <Text style={styles.startTitle}>
            Test Your Vision
          </Text>

          <Text
            style={styles.startDescription}
          >
            Identify the direction of the
            opening in the visual symbol as it
            becomes smaller.
          </Text>

          <View style={styles.instructionCard}>
            <View style={styles.instructionRow}>
              <Ionicons
                name="phone-portrait-outline"
                size={21}
                color="#0B4F8A"
              />

              <Text
                style={styles.instructionText}
              >
                Hold your phone at a comfortable
                reading distance.
              </Text>
            </View>

            <View style={styles.instructionRow}>
              <Ionicons
                name="sunny-outline"
                size={21}
                color="#0B4F8A"
              />

              <Text
                style={styles.instructionText}
              >
                Use the test in normal,
                comfortable lighting.
              </Text>
            </View>

            <View style={styles.instructionRow}>
              <Ionicons
                name="help-circle-outline"
                size={21}
                color="#0B4F8A"
              />

              <Text
                style={styles.instructionText}
              >
                Choose the direction that matches
                the opening.
              </Text>
            </View>
          </View>

          <View style={styles.warningCard}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#A16207"
            />

            <Text style={styles.warningText}>
              This is for entertainment and
              general awareness only. It cannot
              diagnose eyesight problems.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={startTest}
          >
            <Text
              style={styles.primaryButtonText}
            >
              Start Eye Test
            </Text>

            <Ionicons
              name="arrow-forward"
              size={19}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* =======================================================
     TEST SCREEN
  ======================================================= */

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={resetTest}
        >
          <Ionicons
            name="close"
            size={21}
            color="#17212B"
          />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            Eye Test
          </Text>

          <Text
            style={styles.headerSubtitle}
          >
            Question{" "}
            {currentQuestion + 1} of{" "}
            {QUESTIONS.length}
          </Text>
        </View>

        <Text style={styles.progressPercent}>
          {progress}%
        </Text>
      </View>

      <View style={styles.testContainer}>
        {/* PROGRESS */}

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
              },
            ]}
          />
        </View>

        <Text style={styles.questionTitle}>
          Which direction is the opening?
        </Text>

        <Text
          style={styles.questionDescription}
        >
          Look at the symbol carefully and
          select the matching direction.
        </Text>

        {/* VISUAL TEST */}

        <View style={styles.testArea}>
          <View
            style={[
              styles.landolt,
              {
                width: question.size,
                height: question.size,
                borderRadius:
                  question.size / 2,
              },
            ]}
          >
            <View
              style={[
                styles.landoltInner,
                {
                  width:
                    question.size * 0.54,
                  height:
                    question.size * 0.54,
                  borderRadius:
                    (question.size * 0.54) /
                    2,
                },
              ]}
            />

            <View
              style={[
                styles.landoltGap,
                getGapPosition(
                  question.direction,
                  question.size
                ),
              ]}
            />
          </View>
        </View>

        {/* ANSWERS */}

        <Text style={styles.chooseText}>
          Select direction
        </Text>

        <View style={styles.directionGrid}>
          {(
            [
              "up",
              "left",
              "right",
              "down",
            ] as Direction[]
          ).map((direction) => (
            <TouchableOpacity
              key={direction}
              style={styles.directionButton}
              activeOpacity={0.8}
              onPress={() =>
                answerQuestion(direction)
              }
            >
              <Ionicons
                name={
                  getDirectionIcon(
                    direction
                  ) as any
                }
                size={25}
                color="#0B4F8A"
              />

              <Text
                style={styles.directionText}
              >
                {direction
                  .charAt(0)
                  .toUpperCase() +
                  direction.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.testFooter}>
          <Ionicons
            name="eye-outline"
            size={17}
            color="#66737F"
          />

          <Text style={styles.testFooterText}>
            This test is not a substitute for a
            professional eye examination.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* =========================================================
   LANDOLT GAP POSITION
========================================================= */

function getGapPosition(
  direction: Direction,
  size: number
) {
  const thickness = Math.max(
    8,
    size * 0.22
  );

  switch (direction) {
    case "up":
      return {
        position: "absolute" as const,
        top: -2,
        left: size / 2 - thickness / 2,
        width: thickness,
        height: size * 0.3,
        backgroundColor: "#FFFFFF",
      };

    case "down":
      return {
        position: "absolute" as const,
        bottom: -2,
        left: size / 2 - thickness / 2,
        width: thickness,
        height: size * 0.3,
        backgroundColor: "#FFFFFF",
      };

    case "left":
      return {
        position: "absolute" as const,
        left: -2,
        top: size / 2 - thickness / 2,
        width: size * 0.3,
        height: thickness,
        backgroundColor: "#FFFFFF",
      };

    case "right":
      return {
        position: "absolute" as const,
        right: -2,
        top: size / 2 - thickness / 2,
        width: size * 0.3,
        height: thickness,
        backgroundColor: "#FFFFFF",
      };
  }
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F3F5F7",
  },

  header: {
    minHeight: 72,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#D9E0E6",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#17212B",
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: "#66737F",
  },

  progressPercent: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0B4F8A",
  },

  /* =======================================================
     START
  ======================================================= */

  startContainer: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  eyeIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#EAF3FA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  startTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: "#17212B",
    textAlign: "center",
  },

  startDescription: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: "#66737F",
    textAlign: "center",
    maxWidth: 340,
  },

  instructionCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E0E6",
    borderRadius: 12,
    padding: 15,
    marginTop: 22,
  },

  instructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 13,
  },

  instructionText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    lineHeight: 18,
    color: "#17212B",
  },

  warningCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF8E6",
    borderWidth: 1,
    borderColor: "#F2D58A",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },

  warningText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    lineHeight: 17,
    color: "#674F12",
  },

  /* =======================================================
     TEST
  ======================================================= */

  testContainer: {
    flex: 1,
    padding: 20,
  },

  progressTrack: {
    height: 5,
    backgroundColor: "#DCE2E7",
    borderRadius: 3,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#0B4F8A",
  },

  questionTitle: {
    marginTop: 28,
    fontSize: 20,
    fontWeight: "800",
    color: "#17212B",
    textAlign: "center",
  },

  questionDescription: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: "#66737F",
    textAlign: "center",
  },

  testArea: {
    flex: 1,
    minHeight: 250,
    alignItems: "center",
    justifyContent: "center",
  },

  landolt: {
    backgroundColor: "#17212B",
    alignItems: "center",
    justifyContent: "center",
  },

  landoltInner: {
    backgroundColor: "#F3F5F7",
  },

  landoltGap: {},

  chooseText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#66737F",
    textAlign: "center",
    marginBottom: 10,
  },

  directionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  directionButton: {
    width: "48%",
    minHeight: 54,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E0E6",
    borderRadius: 9,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  directionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#17212B",
  },

  testFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    paddingHorizontal: 10,
  },

  testFooterText: {
    marginLeft: 6,
    fontSize: 9,
    color: "#66737F",
    textAlign: "center",
  },

  /* =======================================================
     RESULT
  ======================================================= */

  resultContainer: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  resultIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#EAF3FA",
    alignItems: "center",
    justifyContent: "center",
  },

  resultTitle: {
    marginTop: 18,
    fontSize: 24,
    fontWeight: "800",
    color: "#17212B",
  },

  score: {
    marginTop: 10,
    fontSize: 52,
    fontWeight: "900",
    color: "#0B4F8A",
  },

  scoreDescription: {
    marginTop: -2,
    fontSize: 12,
    color: "#66737F",
  },

  resultDescription: {
    marginTop: 18,
    maxWidth: 340,
    fontSize: 13,
    lineHeight: 20,
    color: "#66737F",
    textAlign: "center",
  },

  resultNotice: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EAF3FA",
    borderWidth: 1,
    borderColor: "#C7DDED",
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
  },

  resultNoticeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    lineHeight: 17,
    color: "#17212B",
  },

  primaryButton: {
    width: "100%",
    minHeight: 50,
    backgroundColor: "#0B4F8A",
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  secondaryButton: {
    width: "100%",
    minHeight: 48,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E0E6",
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 9,
  },

  secondaryButtonText: {
    color: "#17212B",
    fontSize: 13,
    fontWeight: "700",
  },
});