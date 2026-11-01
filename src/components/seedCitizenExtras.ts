import {
  collection,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";

import { db } from "../services/firebase";

export async function seedCitizenExtras() {
  try {
    const snapshot = await getDocs(collection(db, "citizens"));

    console.log(`Found ${snapshot.size} citizens`);

    for (const citizen of snapshot.docs) {
      const id = citizen.id;

      await setDoc(
        doc(db, "citizens", id),
        {
          profilePhoto: "",
          signaturePhoto: "",

          licenceHistory: [
            {
              type: "Issued",
              date: "2025-03-12",
              office: "Pretoria DLTC",
            },
          ],

          vehicles: [
            {
              vehicleId: "VH001",
              registrationNumber: "ABC123GP",
              make: "Toyota",
              model: "Corolla",
              year: 2022,
              colour: "White",

              vin: "VIN001",
              engineNumber: "ENG001",

              licenceDisk: {
                number: "LD001",
                expiryDate: "2027-03-12",
                status: "Valid",
              },

              ownership: {
                owner: true,
                financed: false,
              },

              roadworthy: true,
              stolen: false,
            },
          ],

          fines: [],

          notifications: [],

          emergencyContacts: [],

          preferences: {
            biometricLogin: false,
            darkMode: false,
            notifications: true,
          },
        },
        { merge: true } // <-- Only adds new fields
      );

      console.log(`✓ Updated ${id}`);
    }

    console.log("✅ Finished updating all citizens.");
  } catch (error) {
    console.error(error);
  }
}