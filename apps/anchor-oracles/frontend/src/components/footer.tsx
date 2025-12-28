'use client';

import { Footer } from '@AnchorProtocol/ui';
import { Eye } from 'lucide-react';

export function OraclesFooter() {
  return (
    <Footer
      appName="Oracles"
      appIcon={Eye}
      accentColor="purple"
      docsUrl="https://docs.anchor-protocol.com/apps/oracles"
    />
  );
}
