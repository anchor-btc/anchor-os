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
import { Ticket, Trophy, Clock, HelpCircle, Plus } from "lucide-react";

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
              <NavLink href="/" icon={Ticket} accentColor="amber">
                Markets
              </NavLink>
              <NavLink href="/my-tickets" icon={Trophy} accentColor="amber">
                My Bets
              </NavLink>
              <NavLink href="/history" icon={Clock} accentColor="amber">
                History
              </NavLink>
              <NavLink href="/how-it-works" icon={HelpCircle} accentColor="amber">
                How It Works
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
