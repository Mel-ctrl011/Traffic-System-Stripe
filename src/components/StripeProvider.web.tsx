import type { ReactElement } from "react";

type StripeProviderProps = {
  children: ReactElement;
  publishableKey: string;
};

export default function StripeProvider({
  children,
}: StripeProviderProps) {
  return <>{children}</>;
}
