import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { MaterialIcons } from "@expo/vector-icons";
import { db } from "../services/firebase";

const LOCATIONS = [
  "Pretoria Road",
  "Church Street",
  "Soshanguve Road",
  "Wonderboom Road",
  "Tsamaya Road",
  "Ben Schoeman Highway",
  "Nelson Mandela Drive",
];

const SPEED_LIMITS = [40, 50, 60, 80, 100, 120];

const FINE_AMOUNTS = [
  250,
  500,
  750,
  1000,
  1500,
  2000,
];

const OFFENCES = [
  "Exceeding prescribed speed limit",
  "Speeding detected by camera",
  "Exceeding posted speed limit",
];

function randomItem<T>(items: T[]): T {
  return items[
    Math.floor(Math.random() * items.length)
  ];
}

function randomInt(min: number, max: number) {
  return Math.floor(
    Math.random() * (max - min + 1)
  ) + min;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function generateTicketId() {
  return `TKT-${new Date().getFullYear()}-${randomInt(
    100000,
    999999
  )}`;
}

function generateStatus() {
  const number = randomInt(1, 100);

  if (number <= 60) return "outstanding";
  if (number <= 90) return "paid";

  return "disputed";
}

export default function GenerateTestFinesButton() {
  const [loading, setLoading] = useState(false);

  const generateFines = async () => {
    if (loading) return;

    try {
      setLoading(true);

      /*
       * READ ALL CITIZENS
       */
      const citizensSnapshot = await getDocs(
        collection(db, "citizens")
      );

      if (citizensSnapshot.empty) {
        Alert.alert(
          "No Citizens",
          "There are no citizens in your database."
        );

        return;
      }

      /*
       * FIRESTORE BATCH
       */
      let batch = writeBatch(db);

      let batchCount = 0;
      let totalFines = 0;

      const commitBatch = async () => {
        if (batchCount === 0) return;

        await batch.commit();

        batch = writeBatch(db);
        batchCount = 0;
      };

      /*
       * PROCESS EVERY CITIZEN
       */
      for (const citizenDoc of citizensSnapshot.docs) {
        const citizen = citizenDoc.data();

        const citizenId = citizenDoc.id;

        const vehicles = Array.isArray(
          citizen.vehicles
        )
          ? citizen.vehicles
          : [];

        /*
         * Generate 1–3 fines
         * for each citizen.
         */
        const numberOfFines = randomInt(1, 3);

        for (
          let i = 0;
          i < numberOfFines;
          i++
        ) {
          /*
           * VEHICLE
           */
          const vehicle =
            vehicles.length > 0
              ? randomItem(vehicles)
              : null;

          /*
           * SPEED
           */
          const speedLimit =
            randomItem(SPEED_LIMITS);

          const recordedSpeed =
            speedLimit +
            randomInt(5, 40);

          /*
           * MONEY
           */
          const amount =
            randomItem(FINE_AMOUNTS);

          /*
           * STATUS
           */
          const status =
            generateStatus();

          let paymentStatus = "unpaid";
          let outstandingAmount = amount;
          let paidAt = null;

          if (status === "paid") {
            paymentStatus = "paid";
            outstandingAmount = 0;
            paidAt =
              Timestamp.fromDate(
                new Date()
              );
          }

          if (status === "disputed") {
            paymentStatus = "disputed";
          }

          /*
           * DATES
           */
          const now = new Date();

          const offenceDate =
            addDays(
              now,
              -randomInt(1, 60)
            );

          const issuedAt =
            addDays(
              offenceDate,
              randomInt(1, 3)
            );

          const dueDate =
            addDays(
              issuedAt,
              30
            );

          /*
           * IDs
           */
          const fineRef = doc(
            collection(db, "fines")
          );

          const ticketId =
            generateTicketId();

          /*
           * FINE DOCUMENT
           */
          const fine = {
            fineId: fineRef.id,

            citizenId,

            citizenName:
              citizen.fullName ?? "",

            ticketId,

            reference: ticketId,

            type: "speed_camera",

            category: "Speed Camera",

            offence:
              randomItem(OFFENCES),

            description:
              "Vehicle was recorded travelling above the applicable speed limit.",

            vehicleId:
              vehicle?.vehicleId ?? null,

            registrationNumber:
              vehicle?.registrationNumber ??
              "TEST VEHICLE",

            recordedSpeed,

            speed: recordedSpeed,

            speedLimit,

            location:
              randomItem(LOCATIONS),

            cameraLocation:
              randomItem(LOCATIONS),

            date:
              offenceDate.toISOString(),

            offenceDate:
              offenceDate.toISOString(),

            issuedAt:
              issuedAt.toISOString(),

            dueDate:
              dueDate.toISOString(),

            amount,

            fineAmount: amount,

            outstandingAmount,

            currency: "ZAR",

            status,

            paymentStatus,

            paidAt,

            issuingAuthority:
              "Traffic Department",

            /*
             * Lets us identify
             * test data later.
             */
            isTestData: true,

            createdAt:
              Timestamp.fromDate(now),

            updatedAt:
              Timestamp.fromDate(now),
          };

          batch.set(
            fineRef,
            fine
          );

          batchCount++;
          totalFines++;

          /*
           * Firestore batch limit
           */
          if (batchCount >= 450) {
            await commitBatch();
          }
        }
      }

      /*
       * COMMIT REMAINING FINES
       */
      await commitBatch();

      Alert.alert(
        "Fines Generated",
        `${totalFines} test fines were successfully created for ${citizensSnapshot.size} citizens.`
      );
    } catch (error) {
      console.error(
        "Generate fines error:",
        error
      );

      Alert.alert(
        "Error",
        "Something went wrong while generating the fines."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        loading && styles.buttonDisabled,
      ]}
      activeOpacity={0.8}
      onPress={generateFines}
      disabled={loading}
    >
      {loading ? (
        <>
          <ActivityIndicator
            size="small"
            color="#FFFFFF"
          />

          <Text style={styles.text}>
            Generating...
          </Text>
        </>
      ) : (
        <>
          <MaterialIcons
            name="add-circle-outline"
            size={20}
            color="#FFFFFF"
          />

          <Text style={styles.text}>
            Generate Test Fines
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#1565C0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  text: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});