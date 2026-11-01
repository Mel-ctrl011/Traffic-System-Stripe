
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { db } from "./firebase";
import type { AppointmentBookingData } from "../types/appointment";

/* =========================================================
   TYPES
========================================================= */

export type CreateAppointmentInput = {
  userId: string;
  booking: AppointmentBookingData;
};

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";

export type AppointmentActionType =
  | "cancellation"
  | "rescheduling";

export const APPOINTMENT_PENALTY_AMOUNT = 150;

export interface FirestoreAppointment {
  id: string;
  userId: string;
  appointmentNumber: string;

  service: {
    id: string;
    name: string;
    description?: string | null;
    duration?: string | null;
  };

  branch: {
    id: string;
    name: string;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    phone?: string | null;
    hours?: string | null;
  };

  date: string;
  time: string;
  status: AppointmentStatus;
  createdAt?: any;
  updatedAt?: any;
}

type AppointmentActionInput = {
  appointmentId: string;
  userId: string;
  citizenId: string;
  reason: string;
  actionId: string;
};

type RescheduleAppointmentInput =
  AppointmentActionInput & {
    newDate: string;
    newTime: string;
  };

/* =========================================================
   CREATE APPOINTMENT
========================================================= */

export const createAppointment = async ({
  userId,
  booking,
}: CreateAppointmentInput): Promise<{
  appointmentId: string;
  appointmentNumber: string;
}> => {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (
    !booking.service ||
    !booking.branch ||
    !booking.date ||
    !booking.time
  ) {
    throw new Error("Incomplete appointment information.");
  }

  const appointmentNumber = `APT-${Date.now()}`;

  const appointmentData = {
    userId,
    appointmentNumber,

    service: {
      id: booking.service.id,
      name: booking.service.name,
      description: booking.service.description ?? null,
      duration: booking.service.duration ?? null,
    },

    branch: {
      id: booking.branch.id,
      name: booking.branch.name,
      address: booking.branch.address ?? null,
      city: booking.branch.city ?? null,
      province: booking.branch.province ?? null,
      phone: booking.branch.phone ?? null,
      hours: booking.branch.hours ?? null,
    },

    date: booking.date,
    time: booking.time,
    status: "confirmed",

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const appointmentRef = await addDoc(
    collection(db, "appointments"),
    appointmentData
  );

  console.log("[appointmentService] Appointment created:", {
    appointmentId: appointmentRef.id,
    appointmentNumber,
  });

  return {
    appointmentId: appointmentRef.id,
    appointmentNumber,
  };
};

/* =========================================================
   GET MY APPOINTMENTS
========================================================= */

export const getMyAppointments = async (
  userId: string
): Promise<FirestoreAppointment[]> => {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const appointmentsQuery = query(
    collection(db, "appointments"),
    where("userId", "==", userId)
  );

  const snapshot = await getDocs(appointmentsQuery);

  const appointments = snapshot.docs.map((appointmentDoc) => ({
    ...appointmentDoc.data(),
    id: appointmentDoc.id,
  })) as FirestoreAppointment[];

  appointments.sort((a, b) => {
    return `${a.date} ${a.time}`.localeCompare(
      `${b.date} ${b.time}`
    );
  });

  console.log(
    "[appointmentService] Appointments loaded:",
    appointments.length
  );

  return appointments;
};

/* =========================================================
   VALIDATE ACTION INPUT
========================================================= */

const validateActionInput = (
  input: AppointmentActionInput
) => {
  if (!input.appointmentId.trim()) {
    throw new Error("Appointment ID is required.");
  }

  if (!input.userId.trim()) {
    throw new Error("User ID is required.");
  }

  if (!input.citizenId.trim()) {
    throw new Error("Citizen ID is required.");
  }

  if (!input.reason.trim()) {
    throw new Error("Please provide a reason.");
  }

  if (!input.actionId.trim()) {
    throw new Error("Action ID is required.");
  }
};

/* =========================================================
   RECORD PENALTY AND UPDATE APPOINTMENT
========================================================= */

const applyAppointmentPenalty = async (
  input: AppointmentActionInput,
  actionType: AppointmentActionType,
  newSchedule?: {
    date: string;
    time: string;
  }
): Promise<void> => {
  validateActionInput(input);

  if (
    actionType === "rescheduling" &&
    (!newSchedule?.date || !newSchedule?.time)
  ) {
    throw new Error("The new appointment date and time are required.");
  }

  const appointmentRef = doc(
    db,
    "appointments",
    input.appointmentId
  );

  // The caller must reuse the same actionId when retrying
  // the same operation. This prevents a retry from creating
  // a second penalty document for that action.
  const penaltyRef = doc(
    db,
    "fines",
    input.actionId
  );

  await runTransaction(db, async (transaction) => {
    const appointmentSnapshot =
      await transaction.get(appointmentRef);

    if (!appointmentSnapshot.exists()) {
      throw new Error("Appointment not found.");
    }

    const appointment = appointmentSnapshot.data();

    // Never let a citizen apply an action to someone else's booking.
    if (appointment.userId !== input.userId) {
      throw new Error("You are not authorised to change this appointment.");
    }

    if (
      appointment.status !== "confirmed" &&
      appointment.status !== "pending"
    ) {
      throw new Error(
        "Only pending or confirmed appointments can be changed."
      );
    }

    const penaltySnapshot = await transaction.get(penaltyRef);

    // A repeated action ID must not create another charge.
    if (penaltySnapshot.exists()) {
      const existingPenalty = penaltySnapshot.data();

      if (
        existingPenalty.appointmentId !== input.appointmentId ||
        existingPenalty.citizenId !== input.citizenId ||
        existingPenalty.type !== actionType
      ) {
        throw new Error(
          "This action ID has already been used for another operation."
        );
      }

      // The same operation was already recorded.
      return;
    }

    const penaltyRecord = {
      citizenId: input.citizenId,
      appointmentId: input.appointmentId,
      appointmentNumber: appointment.appointmentNumber ?? input.appointmentId,

      type: actionType,
      category: "appointment_penalty",
      offence:
        actionType === "cancellation"
          ? "Appointment cancellation penalty"
          : "Appointment rescheduling penalty",

      description:
        actionType === "cancellation"
          ? "Penalty charged for cancelling an appointment."
          : "Penalty charged for rescheduling an appointment.",

      reason: input.reason.trim(),

      amount: APPOINTMENT_PENALTY_AMOUNT,
      fineAmount: APPOINTMENT_PENALTY_AMOUNT,
      outstandingAmount: APPOINTMENT_PENALTY_AMOUNT,

      currency: "ZAR",
      status: "outstanding",
      paymentStatus: "outstanding",

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    transaction.set(penaltyRef, penaltyRecord);

    if (actionType === "cancellation") {
      transaction.update(appointmentRef, {
        status: "cancelled",
        cancellationReason: input.reason.trim(),
        cancellationPenaltyId: input.actionId,
        updatedAt: serverTimestamp(),
      });
    } else {
      transaction.update(appointmentRef, {
        date: newSchedule!.date,
        time: newSchedule!.time,
        reschedulingReason: input.reason.trim(),
        lastReschedulingPenaltyId: input.actionId,
        updatedAt: serverTimestamp(),
      });
    }
  });

  console.log("[appointmentService] Appointment action completed:", {
    appointmentId: input.appointmentId,
    actionType,
    penaltyId: input.actionId,
    amount: APPOINTMENT_PENALTY_AMOUNT,
  });
};

/* =========================================================
   CANCEL APPOINTMENT
========================================================= */

export const cancelAppointment = async (
  input: AppointmentActionInput
): Promise<void> => {
  console.log("[appointmentService] Cancellation requested:", {
    appointmentId: input.appointmentId,
    actionId: input.actionId,
  });

  await applyAppointmentPenalty(input, "cancellation");
};

/* =========================================================
   RESCHEDULE APPOINTMENT
========================================================= */

export const rescheduleAppointment = async (
  input: RescheduleAppointmentInput
): Promise<void> => {
  console.log("[appointmentService] Rescheduling requested:", {
    appointmentId: input.appointmentId,
    newDate: input.newDate,
    newTime: input.newTime,
    actionId: input.actionId,
  });

  await applyAppointmentPenalty(
    input,
    "rescheduling",
    {
      date: input.newDate,
      time: input.newTime,
    }
  );
};
