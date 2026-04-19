import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Medical Records",
};

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
