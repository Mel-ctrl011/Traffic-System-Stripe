
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { doc, writeBatch } from "firebase/firestore";
import { db } from "../services/firebase";

/**
 * TEST DATA ONLY
 *
 * This component injects fictional outstanding fines
 * into the Firestore test database.
 *
 * It is intended for development/testing.
 */

type TestFine = {
  fineId: string;
  citizenId: string;
  offence: string;
  amount: number;
  date: string;
  location: string;
  status: "Outstanding";
  description: string;
};

const TEST_FINES: TestFine[] = [
  {
    fineId: "FINE-1000000000001-001",
    citizenId: "1000000000001",
    offence: "Speeding",
    amount: 750,
    date: "2026-08-12",
    location: "N1 Pretoria",
    status: "Outstanding",
    description: "Exceeded the prescribed speed limit.",
  },
  {
    fineId: "FINE-1000000000002-001",
    citizenId: "1000000000002",
    offence: "Traffic Signal Violation",
    amount: 1000,
    date: "2026-08-15",
    location: "Pretoria Central",
    status: "Outstanding",
    description: "Failed to comply with a traffic signal.",
  },
  {
    fineId: "FINE-1000000000002-002",
    citizenId: "1000000000002",
    offence: "Speeding",
    amount: 750,
    date: "2026-08-22",
    location: "R21 Pretoria",
    status: "Outstanding",
    description: "Exceeded the prescribed speed limit.",
  },
  {
    fineId: "FINE-1000000000003-001",
    citizenId: "1000000000003",
    offence: "Illegal Parking",
    amount: 450,
    date: "2026-08-18",
    location: "Church Square",
    status: "Outstanding",
    description: "Vehicle parked in a restricted area.",
  },
  {
    fineId: "FINE-1000000000004-001",
    citizenId: "1000000000004",
    offence: "Speeding",
    amount: 850,
    date: "2026-08-25",
    location: "N4 Pretoria",
    status: "Outstanding",
    description: "Exceeded the prescribed speed limit.",
  },
  {
    fineId: "FINE-1000000000005-001",
    citizenId: "1000000000005",
    offence: "Driving Without Required Documentation",
    amount: 1200,
    date: "2026-08-28",
    location: "Pretoria DLTC",
    status: "Outstanding",
    description: "Required vehicle documentation was not available.",
  },
  {
    fineId: "FINE-1000000000006-001",
    citizenId: "1000000000006",
    offence: "Speeding",
    amount: 1500,
    date: "2026-08-30",
    location: "Lynnwood Road",
    status: "Outstanding",
    description: "Exceeded the prescribed speed limit.",
  },
  {
    fineId: "FINE-1000000000007-001",
    citizenId: "1000000000007",
    offence: "Speeding",
    amount: 750,
    date: "2026-09-01",
    location: "N1 Pretoria",
    status: "Outstanding",
    description: "Exceeded the prescribed speed limit.",
  },
  {
    fineId: "FINE-1000000000007-002",
    citizenId: "1000000000007",
    offence: "Illegal Parking",
    amount: 450,
    date: "2026-09-03",
    location: "Pretoria CBD",
    status: "Outstanding",
    description: "Vehicle parked in a restricted area.",
  },
  {
    fineId: "FINE-1000000000008-001",
    citizenId: "1000000000008",
    offence: "Traffic Signal Violation",
    amount: 1000,
    date: "2026-09-04",
    location: "Sunnyside",
    status: "Outstanding",
    description: "Failed to comply with a traffic signal.",
  },
];

/**
 * Inject test fines into:
 *
 * fines/{fineId}
 *
 * and also update:
 *
 * citizens/{citizenId}.fines
 */
export default function DevSeedFines() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const injectFines = async () => {
    if (loading) return;

    try {
      setLoading(true);
      setResult("");

      const batch = writeBatch(db);

      /**
       * Group fines by citizen.
       */
      const finesByCitizen: Record<string, TestFine[]> = {};

      TEST_FINES.forEach((fine) => {
        if (!finesByCitizen[fine.citizenId]) {
          finesByCitizen[fine.citizenId] = [];
        }

        finesByCitizen[fine.citizenId].push(fine);

        /**
         * Create/update individual fine document.
         */
        const fineRef = doc(db, "fines", fine.fineId);

        batch.set(
          fineRef,
          {
            fineId: fine.fineId,
            citizenId: fine.citizenId,
            offence: fine.offence,
            amount: fine.amount,
            date: fine.date,
            location: fine.location,
            status: fine.status,
            description: fine.description,
            currency: "ZAR",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      });

      /**
       * Update the citizen documents.
       *
       * This matches the structure you showed:
       *
       * citizens/{citizenId}
       *      fines: [...]
       */
      Object.entries(finesByCitizen).forEach(
        ([citizenId, citizenFines]) => {
          const citizenRef = doc(db, "citizens", citizenId);

          const finesForCitizen = citizenFines.map((fine) => ({
            fineId: fine.fineId,
            offence: fine.offence,
            amount: fine.amount,
            date: fine.date,
            location: fine.location,
            status: fine.status,
            description: fine.description,
          }));

          batch.set(
            citizenRef,
            {
              fines: finesForCitizen,
            },
            { merge: true }
          );
        }
      );

      await batch.commit();

      const total = TEST_FINES.reduce(
        (sum, fine) => sum + fine.amount,
        0
      );

      setResult(
        `Injected ${TEST_FINES.length} fines · Total outstanding: R${total.toLocaleString()}`
      );

      Alert.alert(
        "Test fines injected",
        `${TEST_FINES.length} fictional outstanding fines were added.\n\nTotal: R${total.toLocaleString()}`
      );
    } catch (error) {
      console.error("Error injecting test fines:", error);

      setResult("Failed to inject test data.");

      Alert.alert(
        "Injection failed",
        error instanceof Error
          ? error.message
          : "Could not inject test fines."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>
          Developer Test Data
        </Text>

        <Text style={styles.warningText}>
          This will add fictional outstanding traffic fines to
          the Firestore test database.
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          loading && styles.buttonDisabled,
        ]}
        onPress={injectFines}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.buttonText}>
              Injecting...
            </Text>
          </>
        ) : (
          <Text style={styles.buttonText}>
            💰 Inject Test Fines
          </Text>
        )}
      </TouchableOpacity>

      {result ? (
        <Text style={styles.result}>
          {result}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  warningBox: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFF7ED",
  },

  warningTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#9A3412",
    marginBottom: 5,
  },

  warningText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#7C2D12",
  },

  button: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#C2410C",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  result: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    color: "#166534",
  },
});

