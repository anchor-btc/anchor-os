import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Anchor Canvas - Collaborative Pixel Art on Bitcoin',
  description: 'A collaborative pixel canvas on Bitcoin. Paint pixels, own them forever.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="dark antialiased min-h-screen bg-background">
        <Providers>{children}</Providers>
        <Script src="http://localhost:8000/anchor-os-bridge.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
