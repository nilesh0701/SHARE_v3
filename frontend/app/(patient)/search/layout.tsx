import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find a Doctor",
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
