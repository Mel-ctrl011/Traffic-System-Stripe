
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";

/* =========================================================
   TYPES
========================================================= */

type TestStage =
  | "intro"
  | "visual"
  | "colour"
  | "reaction"
  | "results";

type VisualQuestion = {
  id: number;
  letters: string;
  size: number;
};

type ColourQuestion = {
  id: number;
  number: string;
  options: string[];
};

type ResultLevel =
  | "Excellent"
  | "Good"
  | "Needs Attention"
  | "Retake Recommended";

/* =========================================================
   VISUAL QUESTIONS
========================================================= */

const VISUAL_QUESTIONS: VisualQuestion[] = [
  {
    id: 1,
    letters: "E",
    size: 58,
  },
  {
    id: 2,
    letters: "FP",
    size: 48,
  },
  {
    id: 3,
    letters: "TOZ",
    size: 40,
  },
  {
    id: 4,
    letters: "LPED",
    size: 32,
  },
  {
    id: 5,
    letters: "PECFD",
    size: 26,
  },
  {
    id: 6,
    letters: "EDFCZP",
    size: 21,
  },
];

/*
 * The user chooses what they believe they see.
 * This is deliberately a simple entertainment-style
 * screening rather than a medically calibrated Snellen test.
 */
const VISUAL_OPTIONS: Record<number, string[]> = {
  1: ["E", "F", "P", "B"],
  2: ["FP", "FE", "PF", "EP"],
  3: ["TOZ", "T0Z", "TOP", "TOF"],
  4: ["LPED", "LPEC", "LPDE", "FPED"],
  5: ["PECFD", "PECFP", "PECED", "PFCFD"],
  6: ["EDFCZP", "EDFCZB", "EFCZDP", "EDFCZQ"],
};

/* =========================================================
   COLOUR QUESTIONS
========================================================= */

const COLOUR_QUESTIONS: ColourQuestion[] = [
  {
    id: 1,
    number: "12",
    options: ["12", "8", "29", "6"],
  },
  {
    id: 2,
    number: "8",
    options: ["3", "8", "5", "12"],
  },
  {
    id: 3,
    number: "29",
    options: ["29", "70", "12", "8"],
  },
];

/* =========================================================
   HELPERS
========================================================= */

function getResultLevel(score: number): ResultLevel {
  if (score >= 90) {
    return "Excellent";
  }

  if (score >= 75) {
    return "Good";
  }

  if (score >= 55) {
    return "Needs Attention";
  }

  return "Retake Recommended";
}

function getResultDescription(result: ResultLevel) {
  switch (result) {
    case "Excellent":
      return "Your results were very strong across the checks.";

    case "Good":
      return "Your results were generally good during this screening.";

    case "Needs Attention":
      return "Some areas produced weaker results. Consider repeating the screening.";

    case "Retake Recommended":
      return "Your results suggest that you should repeat the screening and consider a professional eye examination if you have concerns.";

    default:
      return "";
  }
}

/* =========================================================
   COMPONENT
========================================================= */

export default function VisionTestScreen() {
  const navigation = useNavigation<any>();

  const { user } = useAuth();

  const [stage, setStage] = useState<TestStage>("intro");

  const [visualIndex, setVisualIndex] = useState(0);
  const [visualScore, setVisualScore] = useState(0);

  const [colourIndex, setColourIndex] = useState(0);
  const [colourScore, setColourScore] = useState(0);

  const [reactionTime, setReactionTime] = useState<number | null>(null);

  const [reactionReady, setReactionReady] =
    useState(false);

  const [reactionStarted, setReactionStarted] =
    useState(false);

  const [reactionAttempts, setReactionAttempts] =
    useState(0);

  const [reactionTimes, setReactionTimes] =
    useState<number[]>([]);

  const [saving, setSaving] = useState(false);

  const reactionStartRef =
    useRef<number | null>(null);

  const reactionTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      if (reactionTimeoutRef.current) {
        clearTimeout(
          reactionTimeoutRef.current
        );
      }
    };
  }, []);

  /* =======================================================
     CURRENT VISUAL QUESTION
  ======================================================= */

  const currentVisual =
    VISUAL_QUESTIONS[visualIndex];

  /* =======================================================
     CURRENT COLOUR QUESTION
  ======================================================= */

  const currentColour =
    COLOUR_QUESTIONS[colourIndex];

  /* =======================================================
     START TEST
  ======================================================= */

  const startTest = () => {
    setStage("visual");
    setVisualIndex(0);
    setVisualScore(0);
    setColourIndex(0);
    setColourScore(0);
    setReactionTimes([]);
    setReactionTime(null);
  };

  /* =======================================================
     VISUAL ANSWER
  ======================================================= */

  const answerVisual = (answer: string) => {
    if (!currentVisual) {
      return;
    }

    const correct =
      answer === currentVisual.letters;

    if (correct) {
      setVisualScore(
        (previous) => previous + 1
      );
    }

    if (
      visualIndex <
      VISUAL_QUESTIONS.length - 1
    ) {
      setVisualIndex(
        (previous) => previous + 1
      );

      return;
    }

    setStage("colour");
  };

  /* =======================================================
     COLOUR ANSWER
  ======================================================= */

  const answerColour = (answer: string) => {
    if (!currentColour) {
      return;
    }

    const correct =
      answer === currentColour.number;

    if (correct) {
      setColourScore(
        (previous) => previous + 1
      );
    }

    if (
      colourIndex <
      COLOUR_QUESTIONS.length - 1
    ) {
      setColourIndex(
        (previous) => previous + 1
      );

      return;
    }

    startReactionTest();
  };

  /* =======================================================
     START REACTION TEST
  ======================================================= */

  const startReactionTest = () => {
    setStage("reaction");
    setReactionReady(false);
    setReactionStarted(false);
    setReactionAttempts(0);
    setReactionTimes([]);
    setReactionTime(null);

    scheduleReaction();
  };

  /* =======================================================
     SCHEDULE REACTION
  ======================================================= */

  const scheduleReaction = () => {
    setReactionReady(false);
    setReactionStarted(false);

    const delay =
      Math.floor(
        Math.random() * 2500
      ) + 1500;

    reactionTimeoutRef.current =
      setTimeout(() => {
        reactionStartRef.current =
          Date.now();

        setReactionReady(true);
        setReactionStarted(true);
      }, delay);
  };

  /* =======================================================
     REACTION TAP
  ======================================================= */

  const handleReactionTap = () => {
    /*
     * User tapped too early.
     */

    if (!reactionReady) {
      if (reactionTimeoutRef.current) {
        clearTimeout(
          reactionTimeoutRef.current
        );
      }

      Alert.alert(
        "Too Early",
        "Wait for the screen to change before tapping."
      );

      scheduleReaction();

      return;
    }

    if (!reactionStartRef.current) {
      return;
    }

    const elapsed =
      Date.now() -
      reactionStartRef.current;

    setReactionTime(elapsed);

    setReactionTimes(
      (previous) => [
        ...previous,
        elapsed,
      ]
    );

    setReactionAttempts(
      (previous) => previous + 1
    );

    if (reactionAttempts >= 2) {
      return;
    }

    setTimeout(() => {
      scheduleReaction();
    }, 700);
  };

  /* =======================================================
     FINISH REACTION
  ======================================================= */

  const finishReactionTest = () => {
    const times = reactionTimes;

    if (times.length === 0) {
      Alert.alert(
        "Reaction Test",
        "Please complete at least one reaction attempt."
      );

      return;
    }

    setStage("results");
  };

  /* =======================================================
     CALCULATE REACTION SCORE
  ======================================================= */

  const averageReactionTime = useMemo(() => {
    if (!reactionTimes.length) {
      return null;
    }

    const total =
      reactionTimes.reduce(
        (sum, value) =>
          sum + value,
        0
      );

    return Math.round(
      total / reactionTimes.length
    );
  }, [reactionTimes]);

  /* =======================================================
     SCORE
  ======================================================= */

  const overallScore = useMemo(() => {
    const visualPercentage =
      (visualScore /
        VISUAL_QUESTIONS.length) *
      100;

    const colourPercentage =
      (colourScore /
        COLOUR_QUESTIONS.length) *
      100;

    let reactionPercentage = 50;

    if (
      averageReactionTime !== null
    ) {
      if (
        averageReactionTime <= 250
      ) {
        reactionPercentage = 100;
      } else if (
        averageReactionTime <= 350
      ) {
        reactionPercentage = 85;
      } else if (
        averageReactionTime <= 450
      ) {
        reactionPercentage = 70;
      } else if (
        averageReactionTime <= 600
      ) {
        reactionPercentage = 55;
      } else {
        reactionPercentage = 35;
      }
    }

    return Math.round(
      visualPercentage * 0.5 +
        colourPercentage * 0.25 +
        reactionPercentage * 0.25
    );
  }, [
    visualScore,
    colourScore,
    averageReactionTime,
  ]);

  const resultLevel =
    getResultLevel(overallScore);

  /* =======================================================
     SAVE RESULT
  ======================================================= */

  const saveResult = async () => {
    if (!user) {
      Alert.alert(
        "Not Logged In",
        "Please log in before saving your vision screening."
      );

      return;
    }

    if (saving) {
      return;
    }

    try {
      setSaving(true);

      /*
       * IMPORTANT:
       *
       * We only save the screening result.
       *
       * We do NOT duplicate:
       * - ID number
       * - full name
       * - driver's licence number
       * - vehicle information
       *
       * Those already belong to citizens/{userId}.
       */

      await addDoc(
        collection(
          db,
          "citizens",
          user.idNumber || "unknown",
          "visionChecks"
        ),
        {
          date: new Date()
            .toISOString(),

          overallScore,

          overallResult:
            resultLevel,

          visualScore: Math.round(
            (visualScore /
              VISUAL_QUESTIONS.length) *
              100
          ),

          colourScore: Math.round(
            (colourScore /
              COLOUR_QUESTIONS.length) *
              100
          ),

          reactionTime:
            averageReactionTime,

          reactionAttempts:
            reactionTimes.length,

          purpose:
            "Entertainment / educational screening",

          medicalDisclaimer:
            "This screening is not a medical diagnosis and does not replace a professional eye examination.",

          createdAt:
            serverTimestamp(),
        }
      );

      Alert.alert(
        "Screening Saved",
        "Your vision screening result has been saved to your citizen profile.",
        [
          {
            text: "Done",
            onPress: () =>
              navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.log(
        "Vision result save error:",
        error
      );

      Alert.alert(
        "Save Failed",
        "Your screening was completed, but the result could not be saved."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     PROGRESS
  ======================================================= */

  const getProgress = () => {
    switch (stage) {
      case "visual":
        return 25;

      case "colour":
        return 50;

      case "reaction":
        return 75;

      case "results":
        return 100;

      default:
        return 0;
    }
  };

  /* =======================================================
     HEADER
  ======================================================= */

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          if (stage === "intro") {
            navigation.goBack();
          } else {
            setStage("intro");
          }
        }}
      >
        <Ionicons
          name="arrow-back"
          size={21}
          color={COLORS.text}
        />
      </TouchableOpacity>

      <View style={styles.headerInformation}>
        <Text style={styles.headerTitle}>
          Vision Check
        </Text>

        <Text style={styles.headerSubtitle}>
          Interactive eyesight screening
        </Text>
      </View>
    </View>
  );

  /* =======================================================
     INTRO
  ======================================================= */

  const renderIntro = () => (
    <>
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons
            name="eye-outline"
            size={34}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.heroTitle}>
          Test Your Vision
        </Text>

        <Text style={styles.heroDescription}>
          Take a short interactive vision
          screening covering visual
          recognition, colour recognition
          and reaction speed.
        </Text>
      </View>

      <View style={styles.warningBox}>
        <Ionicons
          name="information-circle-outline"
          size={21}
          color={COLORS.primary}
        />

        <Text style={styles.warningText}>
          This is an entertainment and
          educational screening only. It is
          not a medical eye examination,
          diagnosis or official driver's
          licence test.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          What you'll do
        </Text>

        <FeatureRow
          icon="eye-outline"
          title="Visual Recognition"
          description="Identify letters as they become smaller."
        />

        <FeatureRow
          icon="color-palette-outline"
          title="Colour Vision"
          description="Identify numbers inside colour patterns."
        />

        <FeatureRow
          icon="flash-outline"
          title="Reaction Speed"
          description="Tap when the screen changes."
        />

        <FeatureRow
          icon="analytics-outline"
          title="Overall Result"
          description="Receive a simple screening score."
        />
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={startTest}
      >
        <Text style={styles.primaryButtonText}>
          Start Vision Check
        </Text>

        <Ionicons
          name="arrow-forward"
          size={19}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </>
  );

  /* =======================================================
     VISUAL TEST
  ======================================================= */

  const renderVisualTest = () => (
    <>
      <ProgressBar progress={getProgress()} />

      <View style={styles.testCard}>
        <Text style={styles.testEyebrow}>
          VISUAL RECOGNITION
        </Text>

        <Text style={styles.testTitle}>
          What do you see?
        </Text>

        <Text style={styles.testDescription}>
          Read the letters in the centre
          of the screen and select the
          correct answer.
        </Text>

        <View style={styles.eyeChart}>
          <Text
            style={[
              styles.eyeLetters,
              {
                fontSize:
                  currentVisual.size,
              },
            ]}
          >
            {currentVisual.letters}
          </Text>
        </View>

        <Text style={styles.questionCounter}>
          Question {visualIndex + 1} of{" "}
          {VISUAL_QUESTIONS.length}
        </Text>

        <View style={styles.optionsGrid}>
          {VISUAL_OPTIONS[
            currentVisual.id
          ].map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.answerButton}
              onPress={() =>
                answerVisual(option)
              }
            >
              <Text
                style={
                  styles.answerButtonText
                }
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </>
  );

  /* =======================================================
     COLOUR TEST
  ======================================================= */

  const renderColourTest = () => (
    <>
      <ProgressBar progress={getProgress()} />

      <View style={styles.testCard}>
        <Text style={styles.testEyebrow}>
          COLOUR VISION
        </Text>

        <Text style={styles.testTitle}>
          What number do you see?
        </Text>

        <Text style={styles.testDescription}>
          Look at the coloured pattern and
          select the number you believe is
          displayed.
        </Text>

        <View style={styles.colourPlate}>
          <View style={styles.colourDots}>
            {Array.from({
              length: 90,
            }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.colourDot,
                  {
                    width:
                      8 +
                      (index % 3),
                    height:
                      8 +
                      (index % 3),
                    opacity:
                      0.45 +
                      ((index * 7) %
                        50) /
                        100,
                  },
                ]}
              />
            ))}
          </View>

          <Text style={styles.colourNumber}>
            {currentColour.number}
          </Text>
        </View>

        <Text style={styles.questionCounter}>
          Question {colourIndex + 1} of{" "}
          {COLOUR_QUESTIONS.length}
        </Text>

        <View style={styles.optionsGrid}>
          {currentColour.options.map(
            (option) => (
              <TouchableOpacity
                key={option}
                style={styles.answerButton}
                onPress={() =>
                  answerColour(option)
                }
              >
                <Text
                  style={
                    styles.answerButtonText
                  }
                >
                  {option}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    </>
  );

  /* =======================================================
     REACTION TEST
  ======================================================= */

  const renderReactionTest = () => (
    <>
      <ProgressBar progress={getProgress()} />

      <View style={styles.testCard}>
        <Text style={styles.testEyebrow}>
          REACTION SPEED
        </Text>

        <Text style={styles.testTitle}>
          Tap when the screen changes
        </Text>

        <Text style={styles.testDescription}>
          Wait for the test area to change,
          then tap it as quickly as possible.
        </Text>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.reactionArea,
            reactionReady &&
              styles.reactionAreaReady,
          ]}
          onPress={handleReactionTap}
        >
          <Ionicons
            name={
              reactionReady
                ? "flash"
                : "hand-left-outline"
            }
            size={45}
            color="#FFFFFF"
          />

          <Text
            style={styles.reactionText}
          >
            {reactionReady
              ? "TAP NOW"
              : "WAIT..."}
          </Text>
        </TouchableOpacity>

        {reactionTime !== null && (
          <View
            style={styles.reactionResult}
          >
            <Text
              style={
                styles.reactionResultLabel
              }
            >
              Last reaction
            </Text>

            <Text
              style={
                styles.reactionResultValue
              }
            >
              {reactionTime} ms
            </Text>
          </View>
        )}

        <Text style={styles.attemptText}>
          Attempts completed:{" "}
          {reactionTimes.length}
        </Text>

        {reactionTimes.length > 0 && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={
              finishReactionTest
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              View Results
            </Text>

            <Ionicons
              name="arrow-forward"
              size={19}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  /* =======================================================
     RESULTS
  ======================================================= */

  const renderResults = () => (
    <>
      <View style={styles.resultHero}>
        <View style={styles.resultIcon}>
          <Ionicons
            name="eye-outline"
            size={36}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.resultTitle}>
          {resultLevel}
        </Text>

        <Text style={styles.resultScore}>
          {overallScore}%
        </Text>

        <Text
          style={styles.resultDescription}
        >
          {getResultDescription(
            resultLevel
          )}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Screening Results
        </Text>

        <ResultRow
          icon="eye-outline"
          title="Visual Recognition"
          value={`${Math.round(
            (visualScore /
              VISUAL_QUESTIONS.length) *
              100
          )}%`}
        />

        <ResultRow
          icon="color-palette-outline"
          title="Colour Vision"
          value={`${Math.round(
            (colourScore /
              COLOUR_QUESTIONS.length) *
              100
          )}%`}
        />

        <ResultRow
          icon="flash-outline"
          title="Reaction Speed"
          value={
            averageReactionTime !== null
              ? `${averageReactionTime} ms`
              : "N/A"
          }
        />
      </View>

      <View style={styles.warningBox}>
        <Ionicons
          name="medical-outline"
          size={21}
          color={COLORS.primary}
        />

        <Text style={styles.warningText}>
          This result is not a medical
          diagnosis and should not be used
          to determine whether you are fit
          to drive. If you have concerns
          about your eyesight, consult a
          qualified eye-care professional.
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.primaryButton,
          saving &&
            styles.primaryButtonDisabled,
        ]}
        disabled={saving}
        onPress={saveResult}
      >
        <Text
          style={styles.primaryButtonText}
        >
          {saving
            ? "Saving..."
            : "Save Screening Result"}
        </Text>

        {!saving && (
          <Ionicons
            name="save-outline"
            size={19}
            color="#FFFFFF"
          />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={startTest}
        disabled={saving}
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Retake Test
        </Text>
      </TouchableOpacity>
    </>
  );

  /* =======================================================
     MAIN RENDER
  ======================================================= */

  return (
    <SafeAreaView style={styles.safe}>
      {renderHeader()}

      <ScrollView
        contentContainerStyle={
          styles.container
        }
        showsVerticalScrollIndicator={false}
      >
        {stage === "intro" &&
          renderIntro()}

        {stage === "visual" &&
          renderVisualTest()}

        {stage === "colour" &&
          renderColourTest()}

        {stage === "reaction" &&
          renderReactionTest()}

        {stage === "results" &&
          renderResults()}
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   FEATURE ROW
========================================================= */

function FeatureRow({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Ionicons
          name={icon}
          size={20}
          color={COLORS.primary}
        />
      </View>

      <View style={styles.featureInformation}>
        <Text style={styles.featureTitle}>
          {title}
        </Text>

        <Text
          style={
            styles.featureDescription
          }
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

/* =========================================================
   RESULT ROW
========================================================= */

function ResultRow({
  icon,
  title,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
}) {
  return (
    <View style={styles.resultRow}>
      <View style={styles.resultRowIcon}>
        <Ionicons
          name={icon}
          size={20}
          color={COLORS.primary}
        />
      </View>

      <Text style={styles.resultRowTitle}>
        {title}
      </Text>

      <Text style={styles.resultRowValue}>
        {value}
      </Text>
    </View>
  );
}

/* =========================================================
   PROGRESS BAR
========================================================= */

function ProgressBar({
  progress,
}: {
  progress: number;
}) {
  return (
    <View style={styles.progressWrapper}>
      <View style={styles.progressBackground}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress}%`,
            },
          ]}
        />
      </View>

      <Text style={styles.progressText}>
        {progress}% complete
      </Text>
    </View>
  );
}

/* =========================================================
   COLOURS
========================================================= */

const COLORS = {
  primary: "#0B4F8A",
  primaryDark: "#083B68",
  background: "#F3F5F7",
  text: "#17212B",
  textLight: "#66737F",
  border: "#D9E0E6",
  card: "#FFFFFF",
  success: "#18794E",
  error: "#B42318",
  softBlue: "#EAF3FA",
};

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    padding: 16,
    paddingBottom: 40,
  },

  /* =======================================================
     HEADER
  ======================================================= */

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF2F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  headerInformation: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.text,
  },

  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },

  /* =======================================================
     HERO
  ======================================================= */

  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  heroTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: COLORS.text,
  },

  heroDescription: {
    textAlign: "center",
    color: COLORS.textLight,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },

  /* =======================================================
     WARNING
  ======================================================= */

  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.softBlue,
    borderWidth: 1,
    borderColor: "#C7DDED",
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },

  warningText: {
    flex: 1,
    marginLeft: 8,
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 17,
  },

  /* =======================================================
     CARD
  ======================================================= */

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 17,
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
  },

  /* =======================================================
     FEATURES
  ======================================================= */

  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEF1F3",
  },

  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  featureInformation: {
    flex: 1,
  },

  featureTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },

  featureDescription: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 3,
    lineHeight: 16,
  },

  /* =======================================================
     BUTTONS
  ======================================================= */

  primaryButton: {
    minHeight: 49,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 15,
  },

  primaryButtonDisabled: {
    opacity: 0.55,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  secondaryButton: {
    minHeight: 47,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 9,
  },

  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  /* =======================================================
     PROGRESS
  ======================================================= */

  progressWrapper: {
    marginBottom: 14,
  },

  progressBackground: {
    height: 7,
    borderRadius: 5,
    backgroundColor: "#DDE3E8",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 5,
  },

  progressText: {
    marginTop: 6,
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: "700",
    textAlign: "right",
  },

  /* =======================================================
     TEST
  ======================================================= */

  testCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  testEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 0.8,
  },

  testTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 5,
  },

  testDescription: {
    fontSize: 12,
    color: COLORS.textLight,
    lineHeight: 18,
    marginTop: 5,
  },

  eyeChart: {
    height: 230,
    marginTop: 20,
    borderRadius: 12,
    backgroundColor: "#FAFBFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  eyeLetters: {
    color: "#111111",
    fontWeight: "900",
    letterSpacing: 5,
  },

  questionCounter: {
    textAlign: "center",
    color: COLORS.textLight,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 14,
  },

  optionsGrid: {
    marginTop: 13,
    gap: 9,
  },

  answerButton: {
    minHeight: 47,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  answerButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },

  /* =======================================================
     COLOUR TEST
  ======================================================= */

  colourPlate: {
    width: 230,
    height: 230,
    borderRadius: 115,
    marginTop: 20,
    alignSelf: "center",
    backgroundColor: "#E8EEF2",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  colourDots: {
    position: "absolute",
    width: 220,
    height: 220,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    padding: 8,
  },

  colourDot: {
    borderRadius: 20,
    backgroundColor: "#7A9FB7",
  },

  colourNumber: {
    fontSize: 62,
    fontWeight: "900",
    color: "#344F63",
    letterSpacing: 3,
  },

  /* =======================================================
     REACTION
  ======================================================= */

  reactionArea: {
    height: 270,
    marginTop: 20,
    borderRadius: 14,
    backgroundColor: "#273746",
    alignItems: "center",
    justifyContent: "center",
  },

  reactionAreaReady: {
    backgroundColor: "#18794E",
  },

  reactionText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 12,
    letterSpacing: 1,
  },

  reactionResult: {
    marginTop: 14,
    padding: 14,
    borderRadius: 10,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
  },

  reactionResultLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: "700",
  },

  reactionResultValue: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.primary,
    marginTop: 3,
  },

  attemptText: {
    textAlign: "center",
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 10,
  },

  /* =======================================================
     RESULTS
  ======================================================= */

  resultHero: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  resultIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  resultTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.text,
    marginTop: 12,
  },

  resultScore: {
    fontSize: 42,
    fontWeight: "900",
    color: COLORS.primary,
    marginTop: 2,
  },

  resultDescription: {
    textAlign: "center",
    color: COLORS.textLight,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  resultRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#EEF1F3",
  },

  resultRowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.softBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  resultRowTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
  },

  resultRowValue: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "900",
  },
});
