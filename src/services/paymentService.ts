/* =========================================================
   CARD PAYMENTS VIA STRIPE

   The app never sees card numbers. It asks our backend for a
   PaymentIntent, then hands control to Stripe's PaymentSheet,
   which collects card details inside Stripe's own SDK.

   The backend checks the citizen's ID number and device (the same
   check the login uses) before creating a payment. The fine is
   marked paid by the backend webhook, so this file only waits for
   that result. It never writes payment state itself.
========================================================= */

import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { Platform } from "react-native";

import { db, functions } from "./firebase";
import { showFinePaymentSheet } from "./stripePayment";
import { getDeviceInfo } from "../utils/device";

type FinePaymentResponse = {
  paymentIntentClientSecret: string;
  paymentIntentId: string;
  customerId: string;
  ephemeralKeySecret: string;
};

export type FinePaymentOutcome =
  | { status: "paid"; paymentReference: string | null }
  | { status: "canceled" }
  | { status: "pending" };

/* Opens Stripe's payment sheet for a fine. */
export async function payFineWithCard(
  fineId: string,
  idNumber: string
): Promise<FinePaymentOutcome> {
  if (Platform.OS === "web") {
    throw new Error(
      "Card payments are only available in the iOS and Android app."
    );
  }

  const device = await getDeviceInfo();

  const createFinePayment = httpsCallable<
    { fineId: string; idNumber: string; deviceId: string },
    FinePaymentResponse
  >(functions, "createFinePayment");

  const { data } = await createFinePayment({
    fineId,
    idNumber,
    deviceId: device.deviceId,
  });

  const sheetResult = await showFinePaymentSheet({
    customerId: data.customerId,
    customerEphemeralKeySecret: data.ephemeralKeySecret,
    paymentIntentClientSecret: data.paymentIntentClientSecret,
  });

  if (sheetResult === "canceled") {
    return { status: "canceled" };
  }

  // Card accepted by Stripe. The webhook now marks the fine paid.
  return waitForFinePaid(fineId);
}

/* Polls the fine until the webhook has marked it paid. */
export async function waitForFinePaid(
  fineId: string,
  timeoutMs = 30000
): Promise<FinePaymentOutcome> {
  const ref = doc(db, "fines", fineId);
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const snap = await getDoc(ref);
    const data = snap.data();

    if (data && (data.paymentStatus === "paid" || data.status === "paid")) {
      return {
        status: "paid",
        paymentReference: data.paymentReference ?? null,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return { status: "pending" };
}
