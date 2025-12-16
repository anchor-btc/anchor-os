import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "BitDNS - Decentralized DNS on Bitcoin",
  description: "Register and manage .bit domains on the Bitcoin blockchain using the Anchor protocol",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
