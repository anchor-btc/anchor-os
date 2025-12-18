import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ANCHOR OS",
  description: "Operating System for the Anchor Bitcoin stack",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <Providers>
          <div className="flex min-h-screen">
            <Suspense fallback={<div className="w-64 bg-card border-r border-border" />}>
              <Sidebar />
            </Suspense>
            <main className="flex-1 ml-64 p-8 bg-grid">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}

