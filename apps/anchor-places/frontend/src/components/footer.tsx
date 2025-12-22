"use client";

import { Footer } from "@AnchorProtocol/ui";
import { MapPin } from "lucide-react";

export function PlacesFooter() {
  return (
    <Footer
      appName="Places"
      appIcon={MapPin}
      accentColor="blue"
      docsUrl="http://localhost:3900/apps/places"
    />
  );
}

