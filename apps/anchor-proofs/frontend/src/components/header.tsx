"use client";

import {
  AppHeader,
  AppLogo,
  NavLink,
  NavGroup,
  Container,
} from "@AnchorProtocol/ui";
import { FileCheck, Home, Shield, List, User, FileText } from "lucide-react";

const DOCS_URL = "http://localhost:3900/apps/proofs";

export function Header() {
  return (
    <AppHeader variant="dark">
      <Container>
        <nav className="flex items-center justify-between h-16">
          <AppLogo
            appName="Proofs"
            appIcon={FileCheck}
            accentColor="emerald"
          />

          <NavGroup gap="sm">
            <NavLink href="/" icon={Home} accentColor="emerald">
              Home
            </NavLink>
            <NavLink href="/stamp" icon={FileCheck} accentColor="emerald">
              Stamp
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
            <NavLink href={DOCS_URL} icon={FileText} external>
              Docs
            </NavLink>
          </NavGroup>
        </nav>
      </Container>
    </AppHeader>
  );
}
