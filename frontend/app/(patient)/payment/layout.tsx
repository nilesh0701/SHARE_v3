import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment",
};

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
