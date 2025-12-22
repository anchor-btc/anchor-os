import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell, AppMain, APP_BACKGROUND_CLASS } from "@AnchorProtocol/ui";
import { Header } from "@/components/header";
import { ProofsFooter } from "@/components/footer";

export const metadata: Metadata = {
  title: "Anchor Proofs - Proof of Existence on Bitcoin",
  description:
    "Timestamp any file on the Bitcoin blockchain. Create immutable proof that your document existed at a specific point in time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`dark antialiased ${APP_BACKGROUND_CLASS}`}>
        <Providers>
          <AppShell
            header={<Header />}
            footer={<ProofsFooter />}
          >
            <AppMain size="lg">{children}</AppMain>
          </AppShell>
        </Providers>
        <Script src="http://localhost:8000/anchor-os-bridge.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
