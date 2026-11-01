# Stripe Sandbox Setup & PCI DSS Guide - TrafficConnect

This guide takes you from a new Stripe account to a working card payment
for traffic fines, in sandbox (test) mode. Follow the steps in order.

---

## 0. How the payment works (read this first)

```
Citizen taps "Pay fine"
        │
        ▼
App ──(fineId + ID number + device ID)──► Cloud Function createFinePayment
                              │  reads amount from Firestore
                              │  creates Stripe PaymentIntent
                              ▼
App ◄──(client secret)──── Cloud Function
        │
        ▼
Stripe PaymentSheet (Stripe's own UI)  ◄── card number typed HERE
        │                                   (never reaches our code)
        ▼
Stripe ──(signed webhook)──► Cloud Function stripeWebhook
                              │  verifies signature
                              ▼
                       Fine marked PAID in Firestore
```

Key points:

- **The card number never touches our app, our server or our database.**
  Stripe's SDK collects it. This can reduce PCI scope, but does not by itself
  determine the applicable PCI DSS questionnaire. See Section 9.
- **The app cannot mark a fine as paid.** Only the verified Stripe webhook can.
- **The amount comes from the database**, not from the app.

### Before starting: important checks for this checkout

This guide is for a **sandbox project containing test data only**. Do not use
real citizen data, deploy the current Firestore rules to a production project,
or accept live payments by following this guide alone.

The current checkout has three setup items that must be resolved as you follow
the steps:

1. The installed app dependency is `@stripe/stripe-react-native@0.50.3`, but
   `functions/src/index.ts` says its ephemeral-key API version was copied from
   SDK version `0.84.0`. **Resolve this before beginning the payment setup**:
   verify that `CLIENT_SDK_API_VERSION` is correct for the native SDK actually
   bundled by `0.50.3`, and update the backend value if it is not. Do not
   proceed to deployment or testing with an unverified API version. The final
   troubleshooting section explains what to check.
2. There is no `.firebaserc` in this checkout yet. Step 3 associates this
   folder with the Firebase project. Verify the project ID in Firebase Console
   before running any deploy command.
3. There is no root `.env` file yet, and the Functions dependencies have not
   been installed in this checkout. Steps 5 and 7 cover those first-time
   setup tasks.

The setup uses a deployed webhook, so deploy the callable payment function
first, create the Stripe test-mode webhook endpoint, then store its signing
secret and deploy the webhook function. Do not deploy all Functions before
following that order.

---

## 1. Create your Stripe account and get the test keys

1. Sign in at https://dashboard.stripe.com
2. Look at the top-right corner of the dashboard. Make sure the **Test mode**
   toggle is ON. Everything you do in test mode is sandbox only, with no real money.
3. Go to **Developers → API keys**. You will see two keys:
   - **Publishable key** starts with `pk_test_`. This goes in the app. It is safe to ship.
   - **Secret key** starts with `sk_test_`. Reveal it and copy it. It must never go
     in the app, in Git, or in a chat or email. It goes only into Firebase secrets (Step 4).
4. Keep this page open. You'll need both keys.

> If you ever paste a secret key somewhere public, click **Roll key** on the
> same page to replace it immediately.

---

## 2. Install the tools

Use Node.js 22 (the Functions runtime is pinned to Node 22), plus the Firebase
CLI and Stripe CLI:

```bash
npm install -g firebase-tools
```

Install the Stripe CLI from https://docs.stripe.com/stripe-cli, then sign in:

```bash
stripe login
```

It opens your browser and links the CLI to your sandbox account.

---

## 3. Upgrade the Firebase project (required)

Cloud Functions that call Stripe need outbound internet access, which Google
only allows on the **Blaze (pay-as-you-go)** plan. Sandbox usage stays
almost free, but the plan must be active.

1. Open https://console.firebase.google.com and confirm the exact **Project ID**
   in Project settings. This guide currently expects `schoolprojcet` (spelled
   exactly that way); if your project ID differs, use your actual ID in every
   command and URL below. Do not assume the display name is the project ID.
2. Prefer a separate Firebase **test project** with synthetic data. The mobile
   app's Firebase config in `src/services/firebase.ts` is hardcoded to
   `schoolprojcet`; `firebase use` changes the CLI deploy target but does not
   change which Firebase project the app connects to. If you choose a new test
   project, copy its web app configuration from Firebase Console into that
   file, and confirm its `projectId` matches the project selected below.
3. Upgrade the selected test project to **Blaze** and add a billing method.

Then log in and select the project from the project folder:

```bash
firebase login
firebase use schoolprojcet
```

If Firebase asks which project to use, select the same Project ID you verified
above. Before deploying, run `firebase projects:list` and confirm that project
is accessible to the logged-in account. Never continue if the selected project
is unknown or contains production data.

---

## 4. Store the Stripe secret key safely

Run this and paste your `sk_test_...` key when prompted. It is stored encrypted
in Google Secret Manager and never appears in your code:

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
```

Do not run this step again with the key written into a file or command history.

---

## 5. Deploy the backend and register the webhook

From the project root, install the exact locked Functions dependencies and
build them:

```bash
npm ci --prefix functions
npm --prefix functions run build
```

Check the `CLIENT_SDK_API_VERSION` note in Step 0 before deploying. The first
deploy creates only the callable function needed to create a fine payment.
This avoids deploying `stripeWebhook` before its signing secret exists:

```bash
firebase deploy --only functions:createFinePayment
```

Confirm the payment functions exist:

```bash
firebase functions:list
```

You should see `createFinePayment` in `us-central1`. The webhook function is
not deployed yet, so construct its expected URL from the verified project ID
and region:

```
https://us-central1-<your-project-id>.cloudfunctions.net/stripeWebhook
```

Now, in the Stripe dashboard with **Test mode still enabled**, add an endpoint
using that expected URL. It may return `404` until the webhook function is
deployed in the next substep.

1. In the Stripe dashboard (test mode), go to **Developers → Webhooks → Add endpoint**
2. Endpoint URL: paste the `stripeWebhook` URL above
3. Select these events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Click **Add endpoint**, then **Reveal** the **Signing secret** (starts with `whsec_`)

Store the signing secret, then deploy the webhook function:

```bash
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
firebase deploy --only functions:stripeWebhook
```

After deployment, return to that endpoint in Stripe and use **Send test
event** (or retry its earlier delivery). Confirm the delivery receives a 2xx
response before attempting a card payment. Also check `firebase functions:log`
if the delivery fails.

The existing payment callable stays deployed. If you later change backend
code, rebuild and deploy the changed functions. Deploying all Functions is
appropriate only after **both** secrets exist:

```bash
firebase deploy --only functions
```

> **Local testing alternative:** instead of a deployed URL, you can forward
> events to your machine with `stripe listen --forward-to <your-url>`. The
> command prints a temporary `whsec_` secret to use instead. Most teams
> start with the deployed URL.

---

## 6. Firestore rules: test-project use only

The checked-in `firestore.rules` is not a complete or production-safe ruleset.
Firebase replaces **all** rules on deploy, so deploying it can break unrelated
screens. It also permits public reads of citizens, fines, and payment history,
and allows citizen updates to fields other than `stripeCustomerId`. Never
deploy it to a project containing real citizen data.

The app's current login does not create a Firebase Authentication session.
Therefore these rules cannot securely restrict reads to the signed-in citizen.
The Firebase Admin SDK used by Cloud Functions bypasses Firestore rules, but
the app's direct Firestore reads still depend on the rules already deployed to
the project. A new Firebase project normally denies those reads by default.
For this sandbox guide:

- If the existing rules deny the app access to `fines`, `citizens`, or
  `paymentHistory`, the screen/login/payment status reads can fail.
- Only if you have confirmed this is a **separate, disposable test project
  containing synthetic data only**, you may deploy the checked-in rules to
  make the demo flow work:

  ```bash
  firebase deploy --only firestore:rules
  ```

- Do not deploy these rules to production or use them with real citizen data.
  Before production use, implement Firebase Auth and complete user-scoped
  Firestore rules, then review and test the full ruleset.

The app's development seed buttons write fines directly from the device and
will fail if client writes are correctly blocked. Do not weaken production
rules to make those buttons work; seed synthetic test data through an admin
script or emulator instead.

## 7. Configure and run the app

The app dependency is already declared in `package.json`; do not install a
different Stripe version by hand. Check Expo's expected versions:

```bash
npx expo install --check
```

Create a `.env` file in the project root, next to `package.json`, and put only
the Stripe **test publishable key** in it:

```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...your key...
```

The `.env` file must not be committed. Do not put an `sk_test_...` or
`whsec_...` value in this file. **Expo Go and the web app cannot run this
native PaymentSheet integration.** On Windows, use an Android development
build; local iOS builds require macOS.

```bash
npx expo prebuild
npx expo run:android
```

This project already has an `android` directory. Do not add `--clean` to
`expo prebuild`; review any native project changes before keeping them. Android
Studio, an Android SDK, and a connected device or emulator must be installed
and available. Alternatively, use an appropriately configured EAS development
build.

After changing `.env`, stop any running Metro process and restart it with a
cleared cache:

```bash
npx expo start -c
```

Install/open the locally built Android app, not Expo Go. Rebuild the native app
after changing native dependencies or Expo plugin configuration.

---

## 8. Test the payment

Use these sandbox cards in the payment sheet. Use any future expiry date
(e.g. `12/30`), any 3-digit CVC, and any postcode.

| Card number           | Result                                   |
|-----------------------|------------------------------------------|
| `4242 4242 4242 4242` | Succeeds                                 |
| `4000 0025 0000 3155` | Requires authentication (3-D Secure)     |
| `4000 0000 0000 9995` | Declined (insufficient funds)            |

Test flow:

1. Log in and open the outstanding penalties screen (the one listing unpaid fines)
2. Tap the pay button on an unpaid fine, then choose **Card payment**
3. Enter `4242 4242 4242 4242`. Allow up to 30 seconds for the app's webhook
   polling window; if it times out, check webhook delivery before retrying.
   Do not tap Pay repeatedly: the current backend creates a new PaymentIntent
   for each attempt and does not prevent multiple intents for the same fine.
4. Check the result in three places:
   - Stripe dashboard: **Payments** shows the succeeded payment
   - Firestore: the fine has `status: "paid"`, and `paymentHistory` has a new document
   - Cloud Functions logs: `firebase functions:log`

If the fine doesn't update, check that the webhook endpoint in Stripe shows
successful deliveries (**Developers → Webhooks**). A failed delivery usually
means the `STRIPE_WEBHOOK_SECRET` doesn't match the endpoint.

---

## 9. PCI DSS: what this design does and what you still own

### What PCI DSS is

PCI DSS is the Payment Card Industry Data Security Standard. Any business that
handles card data must follow it. The amount of work depends on how much card
data touches your systems. Your situation depends on your payment setup.

### PCI scope needs confirmation

Stripe's PaymentSheet collects card data in Stripe's own SDK. Our code only
handles payment references and IDs. This may reduce PCI scope, but it does not
by itself certify the project for SAQ A. Confirm the applicable questionnaire
and requirements with Stripe, your acquirer, or a qualified assessor.

### What the code does for you

| Requirement area | What is in place |
|------------------|------------------|
| No card data in our systems | Card entry is in Stripe's SDK. The old raw-card screen is deleted. |
| No CVV storage | We never receive a CVV. Nothing stores it. |
| Secrets protected | The Stripe secret key and webhook secret belong in Firebase Secret Manager, not the app or Git. Keep the `.env` file local and verify it is ignored by Git before committing. |
| Server-side amounts | The app sends only a `fineId`. The backend reads the amount. |
| Verified callbacks | The webhook checks Stripe's signature before trusting an event. |
| Webhook retries | Repeated delivery of the same successful PaymentIntent is handled once. Separate PaymentIntents for one fine are not prevented. |
| Amount check | The webhook compares the amount received with the recorded intent amount. If they differ, it records a mismatch; it cannot reverse a payment already accepted by Stripe. |
| Access control | The current login has no Firebase Auth session. The checked-in rules are not safe to deploy as a production policy; use a test project and complete rules review first. |
| Minimal data sent to Stripe | Only the fine ID goes into payment metadata, not ID numbers. |
| Truncated card data only | The webhook stores card brand and last four digits, not the full card number or CVV. Confirm display and retention requirements with your assessor/acquirer. |

### What you still have to do

These are your responsibilities. The code cannot do them for you.

1. **Strengthen the login.** Login uses ID number plus device ID, which the device
   can supply itself. Add a one-time code (SMS/OTP) before go-live. This is the
   most important security gap, because the payment session trusts the login.
2. **Enable Firebase App Check** on Functions and Firestore to block requests
   from anything other than your genuine app.
3. **Keep the Stripe account secure.** Turn on two-factor authentication for
   every Stripe user. Remove former team members. Roll keys if exposed.
4. **Keep logs clean.** Never log request bodies from payment calls. Current code
   logs only IDs and messages. Check any new logging you add.
5. **Keep dependencies updated.** Run `npm audit` regularly and update the Stripe
   SDKs when Stripe announces new API versions.
6. **Complete the applicable PCI DSS assessment** as required by Stripe and
   your acquirer; do not assume the integration automatically qualifies for SAQ A.
7. **Use live keys only after review.** Going live needs Stripe business
   verification and live keys (`pk_live_` / `sk_live_`). Replace the keys in
   Firebase secrets and `.env`. Do not put live keys into a test build.
8. **Get a professional review before handling real public money.** A government
   service may face additional requirements (data protection law, retention,
   audit). This guide is not a compliance certification. A Qualified Security
   Assessor (QSA) can confirm your scope.

---

## 10. What is still simulated or missing

- Saved cards: the backend has listing and deletion functions (`listSavedCards`,
  `deleteSavedCard`), but no screen calls them yet. The backend sets
  `setup_future_usage: "off_session"`; verify the desired consent and saved
  payment-method UX with Stripe before offering this to users.
- EFT and digital wallet options were simulated and have been removed from the
  fine payment screen. They can be added later through real providers.
- Appointment booking fees still use the old flow. Apply the same
  `createFinePayment` pattern with a new backend function.
- **Login is the original one.** Its ID number and device check still runs on the device, and the citizen data it reads stays open. Moving login to Firebase Auth is the next step. When that happens, the rules can require a signed-in user.
- **Payment functions check the ID number and device on every call**, using the same registration the login uses.

---

## 11. Quick troubleshooting

| Symptom | Likely cause and fix |
|---------|----------------------|
| "Stripe is not configured" or blank payment sheet | `.env` missing, or Metro not restarted with `-c` |
| Payment sheet doesn't open in Expo Go | Expo Go isn't supported. Use `expo run:android` or an EAS dev build. |
| `functions/not-found` when paying | `createFinePayment` isn't deployed to the selected project/region. Run `firebase functions:list`, confirm the project, then deploy `firebase deploy --only functions:createFinePayment`. |
| "Please log in again on this device." | The device ID isn't in the citizen's `devices` map. Log in once through the normal flow on this device. |
| "Login details are missing" | Log out and back in. |
| Fine stays "Pending" after a successful payment | Webhook not delivered or wrong `STRIPE_WEBHOOK_SECRET`. Check Stripe's **Webhooks** page. |
| Functions fail with network errors | Project is not on the Blaze plan (Step 3). |
| API version error from Stripe | `CLIENT_SDK_API_VERSION` in `functions/src/index.ts` doesn't match the mobile SDK. Update it after upgrading `@stripe/stripe-react-native`. |
| App says payment is pending | The app waits at most 30 seconds for the webhook update. Check Stripe delivery attempts and Functions logs before retrying. |
| Fine is rejected as already paid or has no valid amount | Check its Firestore fields. It needs a positive `outstandingAmount` (at least R5.00) and the correct `citizenId`; see the final troubleshooting section. |
| Payment history is empty after a decline | Failed intents are recorded internally, but the current payment-history screen only reads successful `paymentHistory` records. |

## 12. Files changed in this integration

```
functions/                              NEW  backend (Stripe + webhook)
  src/index.ts
  package.json, package-lock.json, tsconfig.json (Node.js 22 runtime)
firestore.rules                         NEW  payment-related rules
firebase.json                           NEW  functions + rules config (Node.js 22)
STRIPE_SETUP_GUIDE.md                   NEW  this guide
.env.example                            NEW  publishable key template
App.tsx                                 EDIT StripeProvider wrapper
app.json                                EDIT Stripe Expo plugin
.gitignore                              EDIT ignore .env and build output
src/services/firebase.ts                EDIT adds functions export only
src/services/paymentService.ts          NEW  PaymentSheet helpers
src/screens/PAYMENTS/outstanding-penalties.tsx
                                        EDIT Stripe flow; card only
src/navigation/MainNavigator.tsx        EDIT route for old card screen removed
src/screens/PAYMENTS/card-payments.tsx  DELETED raw card-entry placeholder
```

Phase 1 and Phase 2 files from earlier sessions (`paymentService.ts` in those
outputs, `savedCards` collection, `gatewayService.ts`, `webhookHandler.ts`) are
**not** part of this project and should not be used. They stored card
numbers in Firestore and simulated gateways. This integration replaces that approach.

---

## 13. Setup errors you may encounter and how to troubleshoot them

Use the checks below in order. Never paste Stripe secret keys, webhook signing
secrets, client secrets, or full Firebase/Stripe logs into a public issue or
chat.

| Error or symptom | Likely cause | What to check / how to recover |
|---|---|---|
| `Project not found`, `No currently active project`, or deploy targets the wrong project | The CLI is not logged in, this folder has no project alias yet, or the ID is wrong | Run `firebase login`, then `firebase projects:list`. Confirm the exact Project ID in Firebase Console and run `firebase use <exact-project-id>`. Stop if it is not the intended sandbox project. |
| `Billing account not configured`, API enablement error, or Cloud Functions deployment rejected | Project is not on Blaze, billing is not linked, or a required Google API is still enabling | Confirm the test project is on Blaze and has a billing account. Enable the APIs requested by the Firebase error, wait for provisioning, then retry. Functions can incur charges; set billing alerts. |
| Deployment rejects `nodejs20`, says the runtime is decommissioned, or complains about the Functions engine | Node.js 20 reached its Cloud Functions decommission date on 2026-10-30 | This checkout is configured for the supported `nodejs22` runtime in `firebase.json` and `functions/package.json`. Confirm those files are current and use Node.js 22 locally before retrying. See the [Cloud Functions runtime support schedule](https://cloud.google.com/functions/docs/runtime-support). |
| `npm ci --prefix functions` fails or Functions build cannot resolve modules | Node/npm version mismatch, network failure, or install was run from a different checkout | Run `node --version` (use Node 22), confirm you are at the folder containing `firebase.json`, then rerun `npm ci --prefix functions` followed by `npm --prefix functions run build`. Read the first package/build error rather than proceeding to deploy. |
| `npm audit` reports vulnerabilities in Functions dependencies | A transitive dependency advisory is present; the current production audit reports moderate `uuid` advisories through Firebase Admin dependencies | Run `npm audit --omit=dev --prefix functions` and review the affected dependency path. Do not use `npm audit fix --force` blindly; it can introduce a major Firebase Admin upgrade. Resolve and retest before any production launch. |
| Deploy says a secret is missing, or `stripeWebhook` will not deploy | The webhook secret is not available yet, or its secret version is not active | Follow the staged order exactly: deploy `createFinePayment`; register the endpoint in Stripe Test mode; set `STRIPE_WEBHOOK_SECRET`; then deploy `stripeWebhook`. Keep `STRIPE_SECRET_KEY` set before deploying `createFinePayment`. |
| `functions/not-found` or `NOT_FOUND` when starting payment | `createFinePayment` was not deployed to this project/region | Run `firebase functions:list`, select the intended project with `firebase use`, and confirm `createFinePayment` is in `us-central1`. Deploy it with `firebase deploy --only functions:createFinePayment`. |
| `unauthenticated`, `permission-denied`, or “Please log in again on this device” | The current app login is not Firebase Auth; the callable expects the ID number and the locally generated device ID to match a registered device | Log in through the app on that same test device, then try again. Confirm the test citizen document ID equals the entered ID number and its `devices` map contains the current device ID. Do not manually make citizen data public or use this mechanism for production authentication. |
| “This fine is not yours” | Fine ownership field does not match the citizen ID sent by the app | Check that `fines/{fineId}.citizenId` exactly matches the logged-in user's `idNumber` (same string, including leading zeroes). |
| “This fine has already been paid” for a fine that looks unpaid | The backend considers `paymentStatus`/`status` paid, settled, or `outstandingAmount` zero/missing | Inspect the exact fine document. For this implementation, use a test fine with `outstandingAmount` set to a positive amount; do not rely only on `fineAmount`/`amount` when `outstandingAmount` is absent. |
| “There is no valid amount due” | Amount is missing, non-numeric, below the backend minimum, or not in expected units | Set a numeric `outstandingAmount` in rand (not cents), at least R5.00. The backend converts rand to cents and charges ZAR. |
| Stripe reports an invalid API version or ephemeral-key failure | The API version passed when creating the ephemeral key does not match the native Stripe SDK | Stop and reconcile `CLIENT_SDK_API_VERSION` in `functions/src/index.ts` with the native Stripe Core API version for the actually installed `@stripe/stripe-react-native` version. This checkout installs `0.50.3`, while a source comment refers to `0.84.0`; verify from the installed SDK/release source rather than copying the comment. Rebuild Functions and redeploy after correcting it. |
| Blank PaymentSheet, “Stripe is not configured,” or invalid publishable key | `.env` is absent, contains a secret key, has a typo, or Metro was not restarted | Confirm the root `.env` has `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...` from the same Stripe test account as the backend secret. Restart with `npx expo start -c`. Never use `sk_test_` or `whsec_` in the app. |
| `Importing native-only module ...` during web bundling, or payment is unavailable in browser | This SDK is native-only in this project | Run a rebuilt Android development app. Do not use web or Expo Go for the Stripe PaymentSheet flow. |
| PaymentSheet does not open after upgrading/installing Stripe | The installed app binary does not include the native Stripe module | Run `npx expo prebuild` (without `--clean`), then `npx expo run:android`. Reinstall the resulting app and open it instead of Expo Go. |
| Gradle reports missing SDK/JDK, or Android build cannot find a device | Android Studio/SDK/JDK is not installed/configured or no emulator/device is available | Install/configure Android Studio and the SDK required by the project's Gradle files, accept SDK licenses, start an emulator or connect a device with USB debugging, then retry `npx expo run:android`. |
| Stripe webhook shows `400 Invalid signature` | Wrong `whsec_`, endpoint configured in the wrong Stripe mode, or secret belongs to a different endpoint | In Stripe Test mode, open the exact endpoint URL and use its current signing secret. Set that value with `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET` and redeploy `stripeWebhook`. Do not use the Stripe API secret as the webhook secret. |
| Stripe webhook gets `404` | URL/path is wrong or `stripeWebhook` was not deployed | Copy the deployed `stripeWebhook` URL from `firebase functions:list`; confirm the project ID and region, then retry Stripe's delivery. |
| Stripe webhook gets `500` or fine stays pending after a successful card entry | Function error, Firestore record mismatch, or webhook could not update the fine | Check the Stripe event's delivery response and Firebase Functions logs. Confirm the matching `paymentIntents/{pi_id}` record and referenced fine exist. Fix the underlying test data/configuration, then use Stripe's retry for the same event. |
| Payment succeeds in Stripe but the app says pending | Webhook delivery failed, client reads are denied by the deployed Firestore rules, or the 30-second polling window elapsed | Check Stripe webhook delivery first, then Functions logs and the fine's Firestore `status`/`paymentStatus`. Confirm the app can read that fine under the currently deployed rules. Refresh after fixing the cause; do not pay again until you have verified whether Stripe already charged the test PaymentIntent. |
| Amount-mismatch record appears | The received Stripe amount differs from the amount recorded for that PaymentIntent | Do not mark the fine paid manually. Compare the intent, fine amount, currency, and webhook logs, and investigate the test data. Contact the project owner before retrying. |
| Firestore `permission-denied` while loading fines or payment history | Existing Firestore rules do not allow the app's direct reads | Check the active rules in Firebase Console. Never make production reads public to bypass this. Deploy the checked-in rules only to a disposable sandbox with synthetic data; use reviewed, user-scoped rules for production. |
| A second payment attempt creates another Stripe payment | The current backend creates a new PaymentIntent on each call and does not enforce one intent per fine | Check the Stripe dashboard before retrying. For this guide, make only one attempt at a time and verify the first PaymentIntent/webhook result before starting another. |

### Final go/no-go checklist

Do not begin the card test until all of these are true:

- The selected Firebase project is a disposable sandbox with synthetic data,
  and its exact Project ID is confirmed.
- The mobile app's `src/services/firebase.ts` configuration points to that
  same test project; selecting a Firebase CLI project alone does not change it.
- Cloud Functions use the Node.js 22 runtime, and your local Node version is 22.
- Both Functions secrets are set; `createFinePayment` and `stripeWebhook` are
  deployed in `us-central1`.
- The Stripe endpoint is configured in **Test mode** with the correct
  `whsec_`, and a test delivery succeeds.
- `CLIENT_SDK_API_VERSION` has been verified for the installed Stripe native
  SDK version (`0.50.3` in this checkout), rather than assumed from the stale
  `0.84.0` comment.
- The root `.env` contains only the matching `pk_test_` publishable key.
- The Android development build includes Stripe, the test citizen can log in
  on that device, and a test fine has matching `citizenId` plus numeric
  `outstandingAmount` of at least R5.00.
- You know how to inspect Stripe's PaymentIntent and webhook delivery before
  retrying, to avoid creating multiple payment attempts.
