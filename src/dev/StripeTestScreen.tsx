import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { useStripe } from "@stripe/stripe-react-native";

/* =========================================================
   DEV ONLY: Stripe PaymentSheet test with no Cloud Functions.

   Paste a PaymentIntent client_secret created with the Stripe CLI.
   Enabled by EXPO_PUBLIC_STRIPE_TEST_SCREEN=true in .env.
   Delete this file before release.
========================================================= */

const CLIENT_SECRET_PATTERN = /^pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/;

export default function StripeTestScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [clientSecret, setClientSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  const runTest = async () => {
    const secret = clientSecret.trim();

    if (!CLIENT_SECRET_PATTERN.test(secret)) {
      setResult(
        "That does not look like a PaymentIntent client_secret (pi_..._secret_...)."
      );
      return;
    }

    setBusy(true);
    setResult("Opening payment sheet...");

    try {
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "TrafficConnect Test",
        paymentIntentClientSecret: secret,
        allowsDelayedPaymentMethods: false,
      });

      if (initError) {
        setResult(`Setup failed: ${initError.code} - ${initError.message}`);
        return;
      }

      const { error } = await presentPaymentSheet();

      if (error) {
        if (error.code === "Canceled") {
          setResult("Canceled: the payment sheet was closed.");
        } else {
          setResult(`Payment failed: ${error.code} - ${error.message}`);
        }
        return;
      }

      setResult(
        "Payment succeeded. Check the PaymentIntent in the Stripe dashboard (Payments)."
      );
    } catch (error: any) {
      setResult(`Unexpected error: ${error?.message ?? String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Stripe test (dev only)</Text>

      <Text style={styles.label}>
        Paste the client_secret from the Stripe CLI
      </Text>

      <TextInput
        style={styles.input}
        value={clientSecret}
        onChangeText={setClientSecret}
        placeholder="pi_..._secret_..."
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        editable={!busy}
      />

      <Pressable
        style={[styles.button, busy && styles.buttonDisabled]}
        onPress={runTest}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Open payment sheet</Text>
        )}
      </Pressable>

      {!!result && <Text style={styles.result}>{result}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0D0D0",
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    fontSize: 13,
    color: "#000",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#3F51B5",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  result: {
    marginTop: 20,
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
});
