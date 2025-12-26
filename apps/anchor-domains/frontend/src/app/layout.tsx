import type { Metadata } from 'next';
import Script from 'next/script';
import { Providers } from './providers';
import { AppShell, AppMain, APP_BACKGROUND_CLASS } from '@AnchorProtocol/ui';
import { Header } from '@/components/header';
import { DomainsFooter } from '@/components/footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'Anchor Domains - Decentralized DNS on Bitcoin',
  description:
    'Register and manage .btc, .sat, .anchor, .anc, .bit domains on the Bitcoin blockchain using the Anchor protocol',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`dark antialiased ${APP_BACKGROUND_CLASS}`}>
        <Providers>
          <AppShell header={<Header />} footer={<DomainsFooter />}>
            <AppMain size="lg">{children}</AppMain>
          </AppShell>
        </Providers>
        {/* Anchor OS Bridge - enables URL sync when running in dashboard iframe */}
        <Script src="http://localhost:8000/anchor-os-bridge.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
