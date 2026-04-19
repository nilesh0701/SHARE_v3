import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Doctor Profile",
};

export default function DoctorProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
