import type { Metadata } from "next";
import Script from "next/script";
import { Providers } from "./providers";
import { AppShell, AppMain, APP_BACKGROUND_CLASS } from "@AnchorProtocol/ui";
import { Header } from "@/components/header";
import { OraclesFooter } from "@/components/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anchor Oracles - Decentralized Oracle Network",
  description: "Decentralized oracle network for Bitcoin using the Anchor Protocol",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`dark antialiased ${APP_BACKGROUND_CLASS}`}>
        <Providers>
          <AppShell
            header={<Header />}
            footer={<OraclesFooter />}
          >
            <AppMain size="lg">{children}</AppMain>
          </AppShell>
        </Providers>
        <Script src="http://localhost:8000/anchor-os-bridge.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
