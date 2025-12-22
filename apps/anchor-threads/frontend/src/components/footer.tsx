"use client";

import { Footer } from "@AnchorProtocol/ui";
import { Anchor } from "lucide-react";

export function ThreadsFooter() {
  return (
    <Footer
      appName="Threads"
      appIcon={Anchor}
      accentColor="orange"
      docsUrl="http://localhost:3900/apps/threads"
    />
  );
}
