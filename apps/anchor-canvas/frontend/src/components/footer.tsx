"use client";

import { Footer } from "@AnchorProtocol/ui";
import { Grid3X3 } from "lucide-react";

export function CanvasFooter() {
  return (
    <Footer
      appName="Canvas"
      appIcon={Grid3X3}
      accentColor="rose"
      docsUrl="http://localhost:3900/kinds/state.html"
    />
  );
}

