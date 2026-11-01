
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "./firebase";

/* =========================================================
   TYPES
========================================================= */

export type ApplicationStatus =
  | "Pending"
  | "Processing"
  | "Approved"
  | "Completed"
  | "Rejected";

export interface Application {
  id: string;
  citizenId: string;
  type: string;
  description: string;
  submittedDate: string;
  reference: string;
  status: ApplicationStatus;
  createdAt?: any;
  updatedAt?: any;
}

/* =========================================================
   GET CITIZEN APPLICATIONS
========================================================= */

export const getCitizenApplications = async (
  citizenId: string
): Promise<Application[]> => {
  console.log(
    "[ApplicationService] ===== START ====="
  );

  console.log(
    "[ApplicationService] Citizen ID:",
    JSON.stringify(citizenId)
  );

  if (!citizenId || !citizenId.trim()) {
    console.error(
      "[ApplicationService] Missing citizen ID."
    );

    return [];
  }

  try {
    const applicationsRef = collection(
      db,
      "applications"
    );

    const applicationsQuery = query(
      applicationsRef,
      where("citizenId", "==", citizenId.trim())
    );

    console.log(
      "[ApplicationService] Collection: applications"
    );

    console.log(
      "[ApplicationService] Searching citizenId:",
      citizenId.trim()
    );

    const snapshot = await getDocs(
      applicationsQuery
    );

    console.log(
      "[ApplicationService] Documents found:",
      snapshot.size
    );

    const applications: Application[] =
      snapshot.docs.map((applicationDoc) => {
        const data = applicationDoc.data();

        console.log(
          "[ApplicationService] Document ID:",
          applicationDoc.id
        );

        console.log(
          "[ApplicationService] Stored citizenId:",
          data.citizenId
        );

        console.log(
          "[ApplicationService] Stored fields:",
          Object.keys(data)
        );

        return {
          id: applicationDoc.id,

          citizenId: data.citizenId ?? "",

          type:
            data.type ??
            "Unknown Application",

          description:
            data.description ??
            "Application submitted through Moova.",

          submittedDate:
            data.submittedDate ??
            formatDate(data.createdAt),

          reference:
            data.reference ??
            `APP-${applicationDoc.id}`,

          status:
            data.status ?? "Pending",

          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });

    // Sort newest first without requiring a Firestore
    // composite index for createdAt.
    applications.sort((a, b) => {
      return getTimestamp(b.createdAt) -
        getTimestamp(a.createdAt);
    });

    console.log(
      "[ApplicationService] Final application count:",
      applications.length
    );

    console.log(
      "[ApplicationService] ===== END ====="
    );

    return applications;
  } catch (error) {
    console.error(
      "[ApplicationService] Failed to load applications:",
      error
    );

    throw error;
  }
};

/* =========================================================
   DATE HELPERS
========================================================= */

const getTimestamp = (value: any): number => {
  if (!value) {
    return 0;
  }

  try {
    if (typeof value.toMillis === "function") {
      return value.toMillis();
    }

    if (typeof value.toDate === "function") {
      return value.toDate().getTime();
    }

    const date = new Date(value);

    const timestamp = date.getTime();

    return Number.isNaN(timestamp) ? 0 : timestamp;
  } catch {
    return 0;
  }
};

const formatDate = (value: any): string => {
  if (!value) {
    return "Unknown date";
  }

  try {
    const timestamp = getTimestamp(value);

    if (!timestamp) {
      return "Unknown date";
    }

    return new Date(timestamp).toLocaleDateString(
      "en-ZA",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  } catch {
    return "Unknown date";
  }
};
