"use client";

import { Globe, Search, PlusCircle, FileText, User, BookOpen } from "lucide-react";
import {
  AppHeader,
  AppLogo,
  NavLink,
  NavGroup,
  Container,
} from "@AnchorProtocol/ui";

export function Header() {
  return (
    <AppHeader variant="dark">
      <Container>
        <nav className="flex items-center h-16">
          <AppLogo
            appName="Domains"
            appIcon={Globe}
            accentColor="orange"
          />

          <div className="flex-1" />

          <NavGroup gap="md" className="hidden md:flex">
            <NavLink href="/" icon={Search} accentColor="orange">
              Search
            </NavLink>
            <NavLink href="/register" icon={PlusCircle} accentColor="orange">
              Register
            </NavLink>
            <NavLink href="/domains" icon={FileText} accentColor="orange">
              Browse
            </NavLink>
            <NavLink href="/my-domains" icon={User} accentColor="orange">
              My Domains
            </NavLink>
            <NavLink href="http://localhost:3900/kinds/dns.html" icon={BookOpen} external>
              Docs
            </NavLink>
          </NavGroup>
        </nav>
      </Container>
    </AppHeader>
  );
}
