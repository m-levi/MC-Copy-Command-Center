import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import GlobalKeyboardShortcuts from "@/components/GlobalKeyboardShortcuts";
import DebugPanel from "@/components/DebugPanel";
import DebugPromptSelector from "@/components/DebugPromptSelector";
import PageTransition from "@/components/PageTransition";

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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <PageTransition>
            {children}
          </PageTransition>
          <GlobalKeyboardShortcuts />
          <DebugPanel />
          <DebugPromptSelector />
        </ThemeProvider>
      </body>
    </html>
  );
}
