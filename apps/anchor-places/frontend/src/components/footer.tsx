'use client';

import { Footer } from '@AnchorProtocol/ui';
import { MapPin } from 'lucide-react';

export function PlacesFooter() {
  return (
    <Footer
      appName="Places"
      appIcon={MapPin}
      accentColor="blue"
      docsUrl="https://docs.anchor-protocol.com/apps/places"
    />
  );
}
