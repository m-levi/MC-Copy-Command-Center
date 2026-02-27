import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import GlobalKeyboardShortcuts from "@/components/GlobalKeyboardShortcuts";
import PageTransition from "@/components/PageTransition";
import { BackgroundGenerationProvider } from "@/contexts/BackgroundGenerationContext";
import DebugComponentsWrapper from "@/components/DebugComponentsWrapper";
import PWARegistration from "@/components/PWARegistration";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Email Copywriter AI",
  description: "AI-powered email copywriting tool for e-commerce brands",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Command Center",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <BackgroundGenerationProvider>
            <PageTransition>
              {children}
            </PageTransition>
            <PWAInstallPrompt />
            <PWARegistration />
            <GlobalKeyboardShortcuts />
            <DebugComponentsWrapper />
          </BackgroundGenerationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
