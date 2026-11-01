import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { Alert } from "react-native";

export async function seedCitizenData() {
  try {
    const snapshot = await getDocs(collection(db, "citizens"));

    for (const citizen of snapshot.docs) {
      await updateDoc(doc(db, "citizens", citizen.id), {
        driverLicense: {
          number: `DL-${citizen.id.slice(-6)}`,
          status: "Valid",
          expiryDate: "2030-03-12",
          issueDate: "2025-03-12",
          class: "B",
          cardNumber: `CARD-${citizen.id}`,
        },

        digitalLicense: {
          enabled: true,
          qrToken: `QR-${citizen.id}`,
          lastGenerated: new Date().toISOString(),
        },

        collection: {
          productionStatus: "Ready",
          readyForCollection: true,
          location: "Pretoria DLTC",
        },

        ownership: {
          verified: true,
        },
      });

      console.log(`Updated ${citizen.id}`);
    }

    Alert.alert("Success", "All citizens updated successfully.");
  } catch (error) {
    console.error(error);
    Alert.alert("Error", "Failed to seed citizen data.");
  }
}