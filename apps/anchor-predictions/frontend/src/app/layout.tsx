import type { Metadata } from "next";
import Script from "next/script";
import { Providers } from "./providers";
import { Header } from "@/components/header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anchor Lottery - Trustless Bitcoin Lottery",
  description: "Trustless lottery with DLC-based payouts on Bitcoin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-gradient-to-b from-gray-950 to-black">
        <Providers>
          <Header />
          <main className="container mx-auto px-4 py-8">{children}</main>
        </Providers>
        <Script src="http://localhost:8000/anchor-os-bridge.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}

