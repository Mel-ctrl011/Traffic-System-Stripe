import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { getDeviceInfo } from "../utils/device";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* =========================================================
   FINE TYPE
========================================================= */

export type CitizenFine = {
  id: string;
  ticketId: string;
  reference: string;
  email?: string;
  type: string;
  category: string;

  offence: string;
  description?: string;

  date: string;
  issuedAt?: string;
  offenceDate?: string;

  location: string;
  cameraLocation?: string;

  vehicleId: string;
  registrationNumber: string;

  recordedSpeed?: number;
  speed?: number;
  speedLimit?: number;

  amount: number;
  fineAmount?: number;
  outstandingAmount?: number;

  status: "Outstanding" | "Paid" | "Disputed";

  paymentStatus: "Unpaid" | "Paid" | "Disputed";

  dueDate: string;

  paymentReference?: string;
  paidAt?: string;

  createdAt?: string;
};

/* =========================================================
   VEHICLE
========================================================= */

export type CitizenVehicle = {
  vehicleId: string;
  registrationNumber: string;

  make: string;
  model: string;
  year: number;
  colour: string;

  vin: string;
  engineNumber: string;

  licenceDisk: {
    number: string;
    expiryDate: string;
    status: string;
  };

  ownership: {
    owner: boolean;
    financed: boolean;
  };

  roadworthy: boolean;
  stolen: boolean;
};

/* =========================================================
   CITIZEN USER
========================================================= */

export type CitizenUser = {
   id: string;
  phone: string;
 
  verified: boolean;

  fullName?: string;
  idNumber?: string;

  accountStatus?: string;

  biometricEnabled?: boolean;

  vehicleCount?: number;

  devices?: any;

  /* =======================================================
     DRIVER LICENSE
  ======================================================= */

  driverLicense?: {
    number: string;
    status: string;
    expiryDate: string;
    issueDate: string;
    class: string;
    cardNumber: string;
  };

  /* =======================================================
     DIGITAL LICENSE
  ======================================================= */

  digitalLicense?: {
    enabled: boolean;
    qrToken: string;
    lastGenerated: string;
  };

  /* =======================================================
     COLLECTION
  ======================================================= */

  collection?: {
    productionStatus: string;
    readyForCollection: boolean;
    location: string;
  };

  /* =======================================================
     OWNERSHIP
  ======================================================= */

  ownership?: {
    verified: boolean;
  };

  /* =======================================================
     PROFILE
  ======================================================= */

  profilePhoto?: string;

  signaturePhoto?: string;

  gender?: string;

  birthDate?: string;

  address?: {
    street: string;
    suburb: string;
    city: string;
    province: string;
    postalCode: string;
  };

  /* =======================================================
     LICENSE HISTORY
  ======================================================= */

  licenceHistory?: {
    type: string;
    date: string;
    office: string;
    licenseStatus?: boolean;
  }[];

  /* =======================================================
     VEHICLES
  ======================================================= */

  vehicles?: CitizenVehicle[];

  /* =======================================================
     FINES
  ======================================================= */

  fines?: CitizenFine[];

  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  notifications?: any[];

  /* =======================================================
     EMERGENCY CONTACTS
  ======================================================= */

  emergencyContacts?: any[];

  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };

  /* =======================================================
     PREFERENCES
  ======================================================= */

  preferences?: {
    biometricLogin: boolean;
    darkMode: boolean;
    notifications: boolean;
  };

  /* =======================================================
     MEDICAL
  ======================================================= */

  medical?: {
    conditions: string;
    organDonor: boolean;
  };

  /* =======================================================
     RENEWAL
  ======================================================= */

  renewal?: {
    status: string;
    submittedAt: string;
    collectionCentre: string;
  };
};

/* =========================================================
   AUTH CONTEXT TYPE
========================================================= */

type AuthContextType = {
  user: CitizenUser | null;

  loading: boolean;

  isLoggedIn: boolean;

  device: any;

  setIsLoggedIn: (value: boolean) => void;

  setUser: (user: CitizenUser | null) => void;

  reloadUser: () => Promise<void>;
};

/* =========================================================
   CONTEXT
========================================================= */

const AuthContext = createContext<AuthContextType>({
  user: null,

  loading: true,

  isLoggedIn: false,

  device: null,

  setIsLoggedIn: () => {},

  setUser: () => {},

  reloadUser: async () => {},
});

/* =========================================================
   PROVIDER
========================================================= */

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, setUser] =
    useState<CitizenUser | null>(null);

  const [device, setDevice] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  /* =======================================================
     LOAD USER
  ======================================================= */

  const loadSession = async () => {
    try {
      setLoading(true);

      /* -----------------------------------------------
         GET DEVICE
      ------------------------------------------------ */

      const dev = await getDeviceInfo();

      setDevice(dev);

      /* -----------------------------------------------
         GET SAVED USER ID
      ------------------------------------------------ */

      const savedUserId =
        await AsyncStorage.getItem("userId");

      if (!savedUserId) {
        setUser(null);
        setIsLoggedIn(false);
        return;
      }

      /* -----------------------------------------------
         GET CITIZEN DOCUMENT
      ------------------------------------------------ */

      const ref = doc(
        db,
        "citizens",
        savedUserId
      );

      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setUser(null);
        setIsLoggedIn(false);
        return;
      }

      /* -----------------------------------------------
         FIRESTORE DATA
      ------------------------------------------------ */

      const data =
        snap.data() as CitizenUser;

      /* -----------------------------------------------
         DEVICE GUARD
      ------------------------------------------------ */

      if (
        !data.devices ||
        !dev?.deviceId ||
        !data.devices?.[dev.deviceId]
      ) {
        console.log(
          "Device not authorised"
        );

        setUser(null);
        setIsLoggedIn(false);

        return;
      }

      /* -----------------------------------------------
         NORMALISE FINES
      ------------------------------------------------ */

      const fines = Array.isArray(data.fines)
        ? data.fines
        : [];

      /* -----------------------------------------------
         SET USER
      ------------------------------------------------ */

      setUser({
        ...data,
         id: snap.id,
        fines,
      });

      setIsLoggedIn(true);

    } catch (error) {

      console.error(
        "AuthContext load error:",
        error
      );

      setUser(null);

      setIsLoggedIn(false);

    } finally {

      setLoading(false);

    }
  };

  /* =======================================================
     INITIAL SESSION
  ======================================================= */

  useEffect(() => {
    loadSession();
  }, []);

  /* =======================================================
     PROVIDER
  ======================================================= */

  return (
    <AuthContext.Provider
      value={{
        user,

        loading,

        isLoggedIn,

        device,

        setIsLoggedIn,

        setUser,

        reloadUser: loadSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/* =========================================================
   HOOK
========================================================= */

export const useAuth = () =>
  useContext(AuthContext);