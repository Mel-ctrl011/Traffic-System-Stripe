import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCcj7eBah4tE30icEb3lXgLOCHK6LAvqg8",
  authDomain: "schoolprojcet.firebaseapp.com",
  projectId: "schoolprojcet",
  storageBucket: "schoolprojcet.firebasestorage.app",
  messagingSenderId: "161894342641",
  appId: "1:161894342641:web:5356bc6874dda4ecc36e50",
  measurementId: "G-RYSBWN8EGJ",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addRenewalFields() {
  const snapshot = await getDocs(collection(db, "citizens"));

  for (const citizen of snapshot.docs) {
    const data = citizen.data();

    const updates: any = {};

    // Address
    if (!data.address) {
      updates.address = {
        street: "",
        suburb: "",
        city: "",
        province: "",
        postalCode: "",
      };
    }

    // Emergency Contact
    if (!data.emergencyContact) {
      updates.emergencyContact = {
        name: "",
        phone: "",
        relationship: "",
      };
    }

    // Medical
    if (!data.medical) {
      updates.medical = {
        conditions: "",
        organDonor: false,
      };
    }

    // Renewal
    if (!data.renewal) {
      updates.renewal = {
        status: "None",
        submittedAt: "",
        collectionCentre:
          data.collection?.location || "",
      };
    }

    // Profile photos
    if (!data.profilePhoto) {
      updates.profilePhoto = "";
    }

    if (!data.signaturePhoto) {
      updates.signaturePhoto = "";
    }

    if (Object.keys(updates).length > 0) {
      await updateDoc(doc(db, "citizens", citizen.id), updates);

      console.log(`Updated ${citizen.id}`);
    } else {
      console.log(`${citizen.id} already up to date`);
    }
  }

  console.log("Done!");
}

addRenewalFields();