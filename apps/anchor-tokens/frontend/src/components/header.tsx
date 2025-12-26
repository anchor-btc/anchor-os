'use client';

import Link from 'next/link';
import { AppHeader, AppLogo, NavLink, NavGroup, Container, Button } from '@AnchorProtocol/ui';
import { Coins, Home, Wallet, BookOpen, Plus } from 'lucide-react';

const DOCS_URL = 'http://localhost:3900/apps/tokens';

export function Header() {
  return (
    <AppHeader variant="dark">
      <Container>
        <nav className="flex items-center h-16">
          <AppLogo
            appName="Tokens"
            appIcon={Coins}
            accentColor="amber"
            subtitle="UTXO-based Tokens on Bitcoin"
          />

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <NavGroup gap="sm">
              <NavLink href="/" icon={Home} accentColor="amber">
                Home
              </NavLink>
              <NavLink href="/tokens" icon={Coins} accentColor="amber">
                Tokens
              </NavLink>
              <NavLink href="/wallet" icon={Wallet} accentColor="amber">
                Wallet
              </NavLink>
              <NavLink href={DOCS_URL} icon={BookOpen} external>
                Docs
              </NavLink>
            </NavGroup>

            <Button asChild variant="default" className="bg-amber-600 hover:bg-amber-700">
              <Link href="/deploy" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Deploy Token
              </Link>
            </Button>
          </div>
        </nav>
      </Container>
    </AppHeader>
  );
}
