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
import { Ticket, Home, Trophy, Clock, BookOpen, Plus } from "lucide-react";

const DOCS_URL = "http://localhost:3900/apps/predictions";

export function Header() {
  return (
    <AppHeader variant="dark">
      <Container>
        <nav className="flex items-center h-16">
          <AppLogo
            appName="Predictions"
            appIcon={Ticket}
            accentColor="amber"
            subtitle="Trustless Bitcoin Predictions"
          />

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <NavGroup gap="sm">
              <NavLink href="/" icon={Home} accentColor="amber">
                Home
              </NavLink>
              <NavLink href="/markets" icon={Ticket} accentColor="amber">
                Markets
              </NavLink>
              <NavLink href="/my-tickets" icon={Trophy} accentColor="amber">
                My Bets
              </NavLink>
              <NavLink href="/history" icon={Clock} accentColor="amber">
                History
              </NavLink>
              <NavLink href={DOCS_URL} icon={BookOpen} external>
                Docs
              </NavLink>
            </NavGroup>

            <Button asChild variant="default" className="bg-amber-600 hover:bg-amber-700">
              <Link href="/create" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Market
              </Link>
            </Button>
          </div>
        </nav>
      </Container>
    </AppHeader>
  );
}
