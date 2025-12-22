import type { Metadata } from "next";
import Script from "next/script";
import { Providers } from "./providers";
import { AppShell, AppMain } from "@AnchorProtocol/ui";
import { Header } from "@/components/header";
import { DomainsFooter } from "@/components/footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anchor Domains - Decentralized DNS on Bitcoin",
  description: "Register and manage .btc, .sat, .anchor, .anc, .bit domains on the Bitcoin blockchain using the Anchor protocol",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Providers>
          <AppShell
            header={<Header />}
            footer={<DomainsFooter />}
          >
            <AppMain>{children}</AppMain>
          </AppShell>
        </Providers>
        {/* Anchor OS Bridge - enables URL sync when running in dashboard iframe */}
        <Script src="http://localhost:8000/anchor-os-bridge.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}

            <AppMain>{children}</AppMain>
          </AppShell>
        </Providers>
        {/* Anchor OS Bridge - enables URL sync when running in dashboard iframe */}
        <Script src="http://localhost:8000/anchor-os-bridge.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}

            <AppMain>{children}</AppMain>
          </AppShell>
        </Providers>
        {/* Anchor OS Bridge - enables URL sync when running in dashboard iframe */}
        <Script src="http://localhost:8000/anchor-os-bridge.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}

            <AppMain>{children}</AppMain>
          </AppShell>
        </Providers>
        {/* Anchor OS Bridge - enables URL sync when running in dashboard iframe */}
        <Script src="http://localhost:8000/anchor-os-bridge.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
