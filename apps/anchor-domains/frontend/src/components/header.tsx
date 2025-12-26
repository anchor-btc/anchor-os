'use client';

import Link from 'next/link';
import { Globe, Home, List, User, BookOpen, PlusCircle } from 'lucide-react';

const DOCS_URL = 'http://localhost:3900/kinds/dns.html';
import { AppHeader, AppLogo, NavLink, NavGroup, Container, Button } from '@AnchorProtocol/ui';

export function Header() {
  return (
    <AppHeader variant="dark">
      <Container>
        <nav className="flex items-center h-16">
          <AppLogo
            appName="Domains"
            appIcon={Globe}
            accentColor="orange"
            subtitle="Decentralized DNS on Bitcoin"
          />

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <NavGroup gap="md" className="hidden md:flex">
              <NavLink href="/" icon={Home} accentColor="orange">
                Home
              </NavLink>
              <NavLink href="/domains" icon={List} accentColor="orange">
                Browse
              </NavLink>
              <NavLink href="/my-domains" icon={User} accentColor="orange">
                My Domains
              </NavLink>
              <NavLink href={DOCS_URL} icon={BookOpen} external>
                Docs
              </NavLink>
            </NavGroup>

            <Button asChild variant="default" className="bg-orange-600 hover:bg-orange-700">
              <Link href="/register" className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4" />
                Register
              </Link>
            </Button>
          </div>
        </nav>
      </Container>
    </AppHeader>
  );
}
