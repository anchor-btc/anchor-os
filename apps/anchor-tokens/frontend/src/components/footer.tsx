'use client';

import { Footer } from '@AnchorProtocol/ui';
import { Coins } from 'lucide-react';

export function TokensFooter() {
  return (
    <Footer
      appName="Tokens"
      appIcon={Coins}
      accentColor="amber"
      docsUrl="https://docs.anchor-protocol.com/apps/tokens"
    />
  );
}
