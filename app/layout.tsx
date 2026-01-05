import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import GlobalKeyboardShortcuts from "@/components/GlobalKeyboardShortcuts";
import PageTransition from "@/components/PageTransition";
import { BackgroundGenerationProvider } from "@/contexts/BackgroundGenerationContext";
import DebugComponentsWrapper from "@/components/DebugComponentsWrapper";

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
            <GlobalKeyboardShortcuts />
            <DebugComponentsWrapper />
          </BackgroundGenerationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
