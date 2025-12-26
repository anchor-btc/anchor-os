'use client';

import { Footer } from '@AnchorProtocol/ui';
import { Coins } from 'lucide-react';

export function TokensFooter() {
  return (
    <Footer
      appName="Tokens"
      appIcon={Coins}
      accentColor="amber"
      docsUrl="http://localhost:3900/apps/tokens"
    />
  );
}
