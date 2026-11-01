import { StripeProvider as NativeStripeProvider } from "@stripe/stripe-react-native";
import type { ReactElement } from "react";

type StripeProviderProps = {
  children: ReactElement;
  publishableKey: string;
};

export default function StripeProvider({
  children,
  publishableKey,
}: StripeProviderProps) {
  return (
    <NativeStripeProvider publishableKey={publishableKey}>
      {children}
    </NativeStripeProvider>
  );
}
