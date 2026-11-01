import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../services/firebase";

export async function seedCitizenIdentityData() {
  try {
    const snapshot = await getDocs(collection(db, "citizens"));

    for (const citizen of snapshot.docs) {
      const data = citizen.data();
      const idNumber = citizen.id;

      const updates: any = {};

      // Don't overwrite existing data
      if (!data.idNumber) {
        updates.idNumber = idNumber;
      }

      if (!data.birthDate) {
        const year = idNumber.substring(0, 2);
        const month = idNumber.substring(2, 4);
        const day = idNumber.substring(4, 6);

        const fullYear =
          parseInt(year) <= new Date().getFullYear() % 100
            ? `20${year}`
            : `19${year}`;

        updates.birthDate = `${fullYear}-${month}-${day}`;
      }

      if (!data.gender) {
        const genderDigits = parseInt(idNumber.substring(6, 10));

        updates.gender =
          genderDigits >= 5000 ? "Male" : "Female";
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(
          doc(db, "citizens", citizen.id),
          updates
        );

        console.log(`✅ Updated ${citizen.id}`);
      } else {
        console.log(`⏭️ ${citizen.id} already up to date`);
      }
    }

    console.log("🎉 Migration completed");
  } catch (e) {
    console.log(e);
  }
}