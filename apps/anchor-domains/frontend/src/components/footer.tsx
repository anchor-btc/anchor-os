'use client';

import { Footer } from '@AnchorProtocol/ui';
import { Globe } from 'lucide-react';

export function DomainsFooter() {
  return (
    <Footer
      appName="Domains"
      appIcon={Globe}
      accentColor="orange"
      docsUrl="https://docs.anchor-protocol.com/kinds/dns.html"
    />
  );
}
