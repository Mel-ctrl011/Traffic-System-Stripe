import {
  initPaymentSheet,
  presentPaymentSheet,
} from "@stripe/stripe-react-native";

type FinePaymentSheetOptions = {
  customerId: string;
  customerEphemeralKeySecret: string;
  paymentIntentClientSecret: string;
};

export async function showFinePaymentSheet(
  options: FinePaymentSheetOptions
): Promise<"complete" | "canceled"> {
  const { error: initError } = await initPaymentSheet({
    merchantDisplayName: "TrafficConnect",
    ...options,
    allowsDelayedPaymentMethods: false,
  });

  if (initError) {
    throw new Error(initError.message);
  }

  const { error: presentError } = await presentPaymentSheet();

  if (presentError) {
    if (presentError.code === "Canceled") {
      return "canceled";
    }
    throw new Error(presentError.message);
  }

  return "complete";
}
