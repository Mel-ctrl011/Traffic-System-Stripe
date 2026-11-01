import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

// 🔹 Your Firebase config
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

async function seedCitizenData() {
  const snapshot = await getDocs(collection(db, "citizens"));

  console.log(`Found ${snapshot.size} citizens`);

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

    console.log(`✓ Updated ${citizen.id}`);
  }

  console.log("Done.");
}

seedCitizenData().catch(console.error);