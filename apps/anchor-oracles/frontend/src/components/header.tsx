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
import { Eye, Users, Calendar, AlertTriangle, BookOpen } from "lucide-react";

export function Header() {
  return (
    <AppHeader variant="dark">
      <Container>
        <nav className="flex items-center h-16">
          <AppLogo
            appName="Oracles"
            appIcon={Eye}
            accentColor="purple"
            subtitle="Decentralized Oracle Network"
          />

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <NavGroup gap="sm">
              <NavLink href="/" icon={Eye} accentColor="purple">
                Dashboard
              </NavLink>
              <NavLink href="/oracles" icon={Users} accentColor="purple">
                Oracles
              </NavLink>
              <NavLink href="/events" icon={Calendar} accentColor="purple">
                Events
              </NavLink>
              <NavLink href="/disputes" icon={AlertTriangle} accentColor="purple">
                Disputes
              </NavLink>
              <NavLink href="http://localhost:3900/apps/oracles" icon={BookOpen} external>
                Docs
              </NavLink>
            </NavGroup>

            <Button asChild variant="default" className="bg-purple-600 hover:bg-purple-700">
              <Link href="/register">
                Become an Oracle
              </Link>
            </Button>
          </div>
        </nav>
      </Container>
    </AppHeader>
  );
}
