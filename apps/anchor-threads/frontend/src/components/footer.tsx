'use client';

import { Footer } from '@AnchorProtocol/ui';
import { MessageSquare } from 'lucide-react';

export function ThreadsFooter() {
  return (
    <Footer
      appName="Threads"
      appIcon={MessageSquare}
      accentColor="cyan"
      docsUrl="http://localhost:3900/apps/threads"
    />
  );
}
