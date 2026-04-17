import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import AuthBootstrap from "@/components/auth/auth-bootstrap";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SHARE — Healthcare Platform",
  description: "Book doctors and manage your medical records securely",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-gray-50 text-gray-900 min-h-screen`}>
        <AuthBootstrap>{children}</AuthBootstrap>
      </body>
    </html>
  );
}