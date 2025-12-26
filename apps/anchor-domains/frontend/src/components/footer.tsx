'use client';

import { Footer } from '@AnchorProtocol/ui';
import { Globe } from 'lucide-react';

export function DomainsFooter() {
  return (
    <Footer
      appName="Domains"
      appIcon={Globe}
      accentColor="orange"
      docsUrl="http://localhost:3900/kinds/dns.html"
    />
  );
}
