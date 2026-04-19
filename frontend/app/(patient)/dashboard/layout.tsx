import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function PatientDashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
