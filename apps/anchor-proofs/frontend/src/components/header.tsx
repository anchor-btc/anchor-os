'use client';

import Link from 'next/link';
import { AppHeader, AppLogo, NavLink, NavGroup, Container, Button } from '@AnchorProtocol/ui';
import { FileCheck, Home, Shield, List, User, BookOpen } from 'lucide-react';

const DOCS_URL = 'https://docs.anchor-protocol.com/apps/proofs';

export function Header() {
  return (
    <AppHeader variant="dark">
      <Container>
        <nav className="flex items-center h-16">
          <AppLogo
            appName="Proofs"
            appIcon={FileCheck}
            accentColor="emerald"
            subtitle="Proof of Existence on Bitcoin"
          />

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <NavGroup gap="sm">
              <NavLink href="/" icon={Home} accentColor="emerald">
                Home
              </NavLink>
              <NavLink href="/validate" icon={Shield} accentColor="emerald">
                Validate
              </NavLink>
              <NavLink href="/proofs" icon={List} accentColor="emerald">
                Proofs
              </NavLink>
              <NavLink href="/my-proofs" icon={User} accentColor="emerald">
                My Proofs
              </NavLink>
              <NavLink href={DOCS_URL} icon={BookOpen} external>
                Docs
              </NavLink>
            </NavGroup>

            <Button asChild variant="default" className="bg-emerald-600 hover:bg-emerald-700">
              <Link href="/stamp" className="flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                Stamp a File
              </Link>
            </Button>
          </div>
        </nav>
      </Container>
    </AppHeader>
  );
}
