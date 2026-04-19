import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import AuthBootstrap from "@/components/auth/auth-bootstrap";
import ThemeProvider from "@/components/theme/theme-provider";

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.className} min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]`}>
        <AuthBootstrap>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthBootstrap>
      </body>
    </html>
  );
}