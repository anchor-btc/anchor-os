'use client';

import Link from 'next/link';
import { AppHeader, AppLogo, NavLink, NavGroup, Container, Button } from '@AnchorProtocol/ui';
import { Home, MessageSquare, User, PenLine, BookOpen } from 'lucide-react';

const DOCS_URL = 'http://localhost:3900/apps/threads';

export function Header() {
  return (
    <AppHeader variant="blur">
      <Container>
        <nav className="flex items-center justify-between h-16">
          <AppLogo
            appName="Threads"
            appIcon={MessageSquare}
            accentColor="cyan"
            subtitle="Threaded Messages on Bitcoin"
          />

          <NavGroup gap="md">
            <NavLink href="/" icon={Home} accentColor="cyan">
              Home
            </NavLink>
            <NavLink href="/threads" icon={MessageSquare} accentColor="cyan">
              Threads
            </NavLink>
            <NavLink href="/my-threads" icon={User} accentColor="cyan">
              My Threads
            </NavLink>
            <NavLink href={DOCS_URL} icon={BookOpen} external>
              Docs
            </NavLink>
            <Button asChild variant="accent">
              <Link href="/compose" className="flex items-center gap-2">
                <PenLine className="h-4 w-4" />
                <span>Compose</span>
              </Link>
            </Button>
          </NavGroup>
        </nav>
      </Container>
    </AppHeader>
  );
}
