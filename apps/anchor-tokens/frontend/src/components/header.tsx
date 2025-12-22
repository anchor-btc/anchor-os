"use client";

import {
  AppHeader,
  AppLogo,
  NavLink,
  NavGroup,
  Container,
} from "@AnchorProtocol/ui";
import { Coins, Wallet, Book, Plus } from "lucide-react";

export function Header() {
  return (
    <AppHeader variant="dark">
      <Container>
        <nav className="flex items-center justify-between h-16">
          <AppLogo
            appName="Tokens"
            appIcon={Coins}
            accentColor="amber"
          />

          <NavGroup gap="sm">
            <NavLink href="/tokens" icon={Coins} accentColor="amber">
              Tokens
            </NavLink>
            <NavLink href="/deploy" icon={Plus} accentColor="amber">
              Deploy
            </NavLink>
            <NavLink href="/wallet" icon={Wallet} accentColor="amber">
              Wallet
            </NavLink>
            <NavLink href="http://localhost:3900/apps/tokens" icon={Book} external>
              Docs
            </NavLink>
          </NavGroup>
        </nav>
      </Container>
    </AppHeader>
  );
}
