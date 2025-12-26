import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Anchor Protocol - Messages on Bitcoin. Forever.',
  description:
    'A Bitcoin-native messaging protocol for embedding structured, immutable data directly on the Bitcoin blockchain.',
  keywords: ['Bitcoin', 'Protocol', 'Messaging', 'Blockchain', 'OP_RETURN', 'Immutable'],
  authors: [{ name: 'Anchor Protocol' }],
  openGraph: {
    title: 'Anchor Protocol',
    description: 'Messages on Bitcoin. Forever.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        {/* Grain texture overlay */}
        <div className="grain-overlay" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
