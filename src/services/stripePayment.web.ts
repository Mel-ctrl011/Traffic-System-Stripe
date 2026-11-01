type FinePaymentSheetOptions = {
  customerId: string;
  customerEphemeralKeySecret: string;
  paymentIntentClientSecret: string;
};

export async function showFinePaymentSheet(
  _options: FinePaymentSheetOptions
): Promise<"complete" | "canceled"> {
  throw new Error("Card payments are only available in the iOS and Android app.");
}
