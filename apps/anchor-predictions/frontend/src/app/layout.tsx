import type { Metadata } from 'next';
import Script from 'next/script';
import { Providers } from './providers';
import { AppShell, AppMain, APP_BACKGROUND_CLASS } from '@AnchorProtocol/ui';
import { Header } from '@/components/header';
import { PredictionsFooter } from '@/components/footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'Anchor Predictions - Trustless Bitcoin Predictions',
  description: 'Trustless prediction markets with DLC-based payouts on Bitcoin',
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
          <AppShell header={<Header />} footer={<PredictionsFooter />}>
            <AppMain size="lg">{children}</AppMain>
          </AppShell>
        </Providers>
        <Script src="http://localhost:8000/anchor-os-bridge.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
