import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anchor OS - Your Bitcoin Stack. Your Rules.",
  description:
    "Run a full Bitcoin node, Electrum server, and decentralized apps - all from one dashboard. Take control of your Bitcoin stack.",
  keywords: ["Bitcoin", "Node", "Electrum", "Self-Sovereign", "Dashboard", "Anchor OS"],
  authors: [{ name: "Anchor Protocol" }],
  openGraph: {
    title: "Anchor OS",
    description: "Your Bitcoin Stack. Your Rules.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans min-h-screen">
        {children}
      </body>
    </html>
  );
}

