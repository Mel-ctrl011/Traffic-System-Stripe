/* =========================================================
   TRAFFIC CONNECT - PAYMENT BACKEND (Stripe, sandbox first)

   PCI DSS NOTE
   - Card numbers, expiry and CVC are entered in Stripe's
     PaymentSheet inside the mobile app. They never reach
     this code, Firestore, or any log.
   - The Stripe SECRET key lives only in Firebase secrets.
     It is never shipped inside the app.
   - The app sends a fineId plus the citizen's ID number and device
     ID. The amount is read from Firestore here, never trusted
     from the client.
   - Fines are marked paid ONLY by the signed Stripe webhook
     (payment_intent.succeeded), never by the app.
========================================================= */

import { initializeApp } from "firebase-admin/app";
import {
  FieldValue,
  getFirestore,
  type DocumentData,
} from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2";
import {
  HttpsError,
  onCall,
  onRequest,
} from "firebase-functions/v2/https";
import Stripe from "stripe";

initializeApp();
setGlobalOptions({ region: "us-central1", maxInstances: 10 });

const db = getFirestore();

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");

/* API version used when creating ephemeral keys. The mobile SDK
   checks this matches the Core API version it was built against.
   '2024-12-15' is the CORE version listed by
   @stripe/stripe-react-native 0.84.0 (src/connect/testUtils.ts).
   Re-check it whenever you upgrade the mobile SDK. */
const CLIENT_SDK_API_VERSION = "2024-12-15" as Stripe.LatestApiVersion;

const CURRENCY = "zar";
// Check Stripe's current minimum for ZAR before going live.
const MIN_AMOUNT_CENTS = 500; // R5.00

let stripeClient: Stripe | null = null;
function stripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(STRIPE_SECRET_KEY.value());
  }
  return stripeClient;
}

/* =========================================================
   HELPERS
========================================================= */

/* The app has no Firebase Auth session. The citizen is identified the
   same way the login identifies them: the ID number must exist and the
   device must be registered to that citizen. */
async function citizenFromRequest(data: unknown): Promise<string> {
  const body = (data ?? {}) as { idNumber?: unknown; deviceId?: unknown };
  const idNumber = String(body.idNumber ?? "").trim();
  const deviceId = String(body.deviceId ?? "").trim();

  if (!idNumber || !deviceId) {
    throw new HttpsError(
      "invalid-argument",
      "Login details are missing. Please log in again."
    );
  }

  const citizen = await db.collection("citizens").doc(idNumber).get();
  const devices = (citizen.get("devices") ?? {}) as Record<string, unknown>;

  if (!citizen.exists || !devices[deviceId]) {
    throw new HttpsError(
      "permission-denied",
      "Please log in again on this device."
    );
  }

  return idNumber;
}

function toCents(amountRands: number): number {
  return Math.round(amountRands * 100);
}

function isFinePaid(fine: DocumentData): boolean {
  const status = String(fine.status ?? "").toLowerCase();
  return (
    fine.paymentStatus === "paid" ||
    status === "paid" ||
    status === "settled" ||
    Number(fine.outstandingAmount ?? 0) <= 0
  );
}

/* Gets or creates the Stripe Customer linked to a citizen.
   Only the Stripe customer ID is stored in our database. */
async function getOrCreateCustomer(citizenId: string): Promise<string> {
  const citizenRef = db.collection("citizens").doc(citizenId);
  const citizen = await citizenRef.get();

  const existing = citizen.get("stripeCustomerId") as string | undefined;
  if (existing) return existing;

  const customer = await stripe().customers.create(
    {
      name: citizen.get("fullName") ?? undefined,
      email: citizen.get("email") ?? undefined,
    },
    { idempotencyKey: `customer-${citizenId}` }
  );

  await citizenRef.update({ stripeCustomerId: customer.id });
  return customer.id;
}

/* =========================================================
   2) PAY A FINE

   Creates a Stripe PaymentIntent for the fine's outstanding
   amount and returns what PaymentSheet needs. Nothing about
   the card is handled here.
========================================================= */

export const createFinePayment = onCall(
  { secrets: [STRIPE_SECRET_KEY] },
  async (request) => {
    const citizenId = await citizenFromRequest(request.data);
    const fineId = String(request.data?.fineId ?? "").trim();

    if (!fineId) {
      throw new HttpsError("invalid-argument", "fineId is required.");
    }

    const fineRef = db.collection("fines").doc(fineId);
    const fineSnap = await fineRef.get();

    if (!fineSnap.exists) {
      throw new HttpsError("not-found", "Fine not found.");
    }

    const fine = fineSnap.data()!;

    if (fine.citizenId !== citizenId) {
      throw new HttpsError("permission-denied", "This fine is not yours.");
    }

    if (isFinePaid(fine)) {
      throw new HttpsError(
        "failed-precondition",
        "This fine has already been paid."
      );
    }

    const amountDue = Number(
      fine.outstandingAmount ?? fine.fineAmount ?? fine.amount ?? 0
    );
    const amountCents = toCents(amountDue);

    if (!Number.isFinite(amountCents) || amountCents < MIN_AMOUNT_CENTS) {
      throw new HttpsError(
        "failed-precondition",
        "There is no valid amount due on this fine."
      );
    }

    const customerId = await getOrCreateCustomer(citizenId);

    const intent = await stripe().paymentIntents.create({
      amount: amountCents,
      currency: CURRENCY,
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      // Lets PaymentSheet offer "save for future payments".
      // The customer decides; we never store card details.
      setup_future_usage: "off_session",
      description: `Traffic fine ${fineId}`,
      // Only non-personal references go to Stripe metadata.
      metadata: { type: "traffic_fine", fineId },
    });

    const ephemeralKey = await stripe().ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: CLIENT_SDK_API_VERSION }
    );

    await db.collection("paymentIntents").doc(intent.id).set({
      citizenId,
      fineId,
      amountCents,
      status: "requires_payment",
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      paymentIntentClientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      customerId,
      ephemeralKeySecret: ephemeralKey.secret,
    };
  }
);

/* =========================================================
   3) SAVED CARDS (Stripe holds them; we only list/remove)
========================================================= */

export const listSavedCards = onCall(
  { secrets: [STRIPE_SECRET_KEY] },
  async (request) => {
    const citizenId = await citizenFromRequest(request.data);

    const citizen = await db.collection("citizens").doc(citizenId).get();
    const customerId = citizen.get("stripeCustomerId") as string | undefined;
    if (!customerId) return { cards: [] };

    const list = await stripe().paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    return {
      cards: list.data.map((pm) => ({
        id: pm.id,
        brand: pm.card?.brand ?? "card",
        last4: pm.card?.last4 ?? "????",
        expMonth: pm.card?.exp_month ?? null,
        expYear: pm.card?.exp_year ?? null,
      })),
    };
  }
);

export const deleteSavedCard = onCall(
  { secrets: [STRIPE_SECRET_KEY] },
  async (request) => {
    const citizenId = await citizenFromRequest(request.data);
    const paymentMethodId = String(request.data?.paymentMethodId ?? "");

    if (!paymentMethodId.startsWith("pm_")) {
      throw new HttpsError("invalid-argument", "Invalid card reference.");
    }

    const citizen = await db.collection("citizens").doc(citizenId).get();
    const customerId = citizen.get("stripeCustomerId") as string | undefined;

    const pm = await stripe().paymentMethods.retrieve(paymentMethodId);

    // Only detach cards that belong to this citizen's customer.
    if (!customerId || pm.customer !== customerId) {
      throw new HttpsError("permission-denied", "Card not found.");
    }

    await stripe().paymentMethods.detach(paymentMethodId);
    return { ok: true };
  }
);

/* =========================================================
   4) WEBHOOK - the ONLY place a fine becomes paid

   Stripe signs each event. We verify that signature with the
   webhook secret before trusting anything in the body.
========================================================= */

export const stripeWebhook = onRequest(
  { secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] },
  async (req, res) => {
    const signature = req.headers["stripe-signature"];

    let event: Stripe.Event;
    try {
      event = stripe().webhooks.constructEvent(
        req.rawBody,
        signature as string,
        STRIPE_WEBHOOK_SECRET.value()
      );
    } catch {
      res.status(400).send("Invalid signature");
      return;
    }

    try {
      if (event.type === "payment_intent.succeeded") {
        await markFinePaid(event.data.object as Stripe.PaymentIntent);
      } else if (event.type === "payment_intent.payment_failed") {
        await markIntentFailed(event.data.object as Stripe.PaymentIntent);
      }
      res.json({ received: true });
    } catch (error) {
      // Returning 500 makes Stripe retry the event later.
      console.error("Webhook processing failed", event.id, error);
      res.status(500).send("Processing failed");
    }
  }
);

async function markFinePaid(pi: Stripe.PaymentIntent): Promise<void> {
  if (pi.metadata.type !== "traffic_fine") return;

  const intentRef = db.collection("paymentIntents").doc(pi.id);
  const historyRef = db.collection("paymentHistory").doc(pi.id);

  // Card brand and last 4 are safe to store (PCI allows
  // truncated PANs). We fetch them from Stripe, not from the app.
  let cardBrand: string | null = null;
  let cardLast4: string | null = null;
  if (typeof pi.payment_method === "string") {
    const pm = await stripe().paymentMethods.retrieve(pi.payment_method);
    cardBrand = pm.card?.brand ?? null;
    cardLast4 = pm.card?.last4 ?? null;
  }

  await db.runTransaction(async (tx) => {
    const intentSnap = await tx.get(intentRef);
    const historySnap = await tx.get(historyRef);

    // Webhooks can be delivered more than once. Process once.
    if (historySnap.exists) return;
    if (!intentSnap.exists) {
      throw new Error(`Unknown payment intent ${pi.id}`);
    }

    const intent = intentSnap.data()!;
    const fineRef = db.collection("fines").doc(intent.fineId as string);
    const fineSnap = await tx.get(fineRef);

    if (!fineSnap.exists) {
      throw new Error(`Fine ${intent.fineId} missing for ${pi.id}`);
    }

    const fine = fineSnap.data()!;
    const amountRands = pi.amount_received / 100;

    // Money received must match what we asked for.
    if (pi.amount_received !== intent.amountCents) {
      tx.update(intentRef, { status: "amount_mismatch" });
      tx.set(historyRef, {
        reference: pi.id,
        status: "failed",
        reason: "amount_mismatch",
        fineId: intent.fineId,
        citizenId: fine.citizenId ?? null,
        amount: amountRands,
        currency: "ZAR",
        createdAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    tx.update(intentRef, { status: "succeeded" });

    tx.update(fineRef, {
      outstandingAmount: 0,
      status: "paid",
      paymentStatus: "paid",
      paymentReference: pi.id,
      paymentMethod: "card",
      paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    tx.set(historyRef, {
      paymentId: pi.id,
      reference: pi.id,
      type: "traffic_fine",
      description: `Traffic fine payment: ${
        fine.offence ?? fine.description ?? "Traffic violation"
      }`,
      citizenId: fine.citizenId ?? null,
      fineId: intent.fineId,
      ticketId: fine.ticketId ?? fine.reference ?? intent.fineId,
      registrationNumber: fine.registrationNumber ?? null,
      amount: amountRands,
      currency: "ZAR",
      method: "card",
      methodLabel: "Card payment",
      cardBrand,
      cardLast4,
      status: "completed",
      processor: "stripe",
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

async function markIntentFailed(pi: Stripe.PaymentIntent): Promise<void> {
  if (pi.metadata.type !== "traffic_fine") return;
  await db
    .collection("paymentIntents")
    .doc(pi.id)
    .set(
      {
        status: "failed",
        failureMessage:
          pi.last_payment_error?.message ?? "Payment was declined.",
      },
      { merge: true }
    );
}
