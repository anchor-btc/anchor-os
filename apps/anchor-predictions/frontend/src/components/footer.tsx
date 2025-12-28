'use client';

import { Footer } from '@AnchorProtocol/ui';
import { Ticket } from 'lucide-react';

export function PredictionsFooter() {
  return (
    <Footer
      appName="Predictions"
      appIcon={Ticket}
      accentColor="amber"
      docsUrl="https://docs.anchor-protocol.com/apps/predictions"
    />
  );
}
