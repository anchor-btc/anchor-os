"use client";

import Link from "next/link";
import {
  AppHeader,
  AppLogo,
  NavLink,
  NavGroup,
  Container,
  Button,
} from "@AnchorProtocol/ui";
import { Anchor, MessageSquare, User, PenLine, FileText } from "lucide-react";

export function Header() {
  return (
    <AppHeader variant="blur">
      <Container>
        <nav className="flex items-center justify-between h-16">
          <AppLogo
            appName="Threads"
            appIcon={Anchor}
            accentColor="orange"
          />

          <NavGroup gap="md">
            <NavLink href="/threads" icon={MessageSquare} accentColor="orange">
              Threads
            </NavLink>
            <NavLink href="/my-threads" icon={User} accentColor="orange">
              My Threads
            </NavLink>
            <NavLink href="http://localhost:3900/apps/threads" icon={FileText} external>
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
