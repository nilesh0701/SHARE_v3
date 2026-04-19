import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import AuthBootstrap from "@/components/auth/auth-bootstrap";
import ThemeProvider from "@/components/theme/theme-provider";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "SHARE - Healthcare Platform",
    template: "SHARE - %s",
  },
  description: "Book doctors and manage your medical records securely",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/favicon.png",
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.className} share-mesh-bg min-h-screen text-[var(--app-fg)]`}>
        <AuthBootstrap>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthBootstrap>
      </body>
    </html>
  );
}
