import type { Metadata } from 'next';
import Script from 'next/script';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { AppShell, AppMain, APP_BACKGROUND_CLASS } from '@AnchorProtocol/ui';
import { Header } from '@/components/header';
import { TokensFooter } from '@/components/footer';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Anchor Tokens - UTXO-based Tokens on Bitcoin',
  description: 'Deploy, mint, and transfer tokens on Bitcoin using the Anchor Protocol',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} dark antialiased ${APP_BACKGROUND_CLASS}`}
      >
        <Providers>
          <AppShell header={<Header />} footer={<TokensFooter />}>
            <AppMain size="lg">{children}</AppMain>
          </AppShell>
        </Providers>
        <Script src="http://localhost:8000/anchor-os-bridge.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
