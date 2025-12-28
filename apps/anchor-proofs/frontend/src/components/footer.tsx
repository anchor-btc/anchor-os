'use client';

import { Footer } from '@AnchorProtocol/ui';
import { FileCheck } from 'lucide-react';

export function ProofsFooter() {
  return (
    <Footer
      appName="Proofs"
      appIcon={FileCheck}
      accentColor="emerald"
      docsUrl="https://docs.anchor-protocol.com/apps/proofs"
    />
  );
}
