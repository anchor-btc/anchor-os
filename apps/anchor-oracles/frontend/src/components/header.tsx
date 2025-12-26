"use client";

import Link from "next/link";
import {
  AppHeader,
  AppLogo,
  NavLink,
  NavGroup,
  NavDropdown,
  Container,
  Button,
} from "@AnchorProtocol/ui";
import { Eye, Home, Users, Calendar, AlertTriangle, BookOpen, UserPlus, User, CheckCircle, Compass } from "lucide-react";

const DOCS_URL = "http://localhost:3900/apps/oracles";

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
              <NavLink href="/" icon={Home} accentColor="purple">
                Home
              </NavLink>
              <NavLink href="/oracles" icon={Users} accentColor="purple">
                Oracles
              </NavLink>
              <NavLink href="/events" icon={Calendar} accentColor="purple">
                Events
              </NavLink>
              <NavDropdown
                label="Explore"
                icon={Compass}
                accentColor="purple"
                items={[
                  { href: "/attestations", label: "Attestations", icon: CheckCircle },
                  { href: "/disputes", label: "Disputes", icon: AlertTriangle },
                ]}
              />
              <NavLink href="/my-oracles" icon={User} accentColor="purple">
                My Oracles
              </NavLink>
              <NavLink href={DOCS_URL} icon={BookOpen} external>
                Docs
              </NavLink>
            </NavGroup>

            <Button asChild variant="default" className="bg-purple-600 hover:bg-purple-700">
              <Link href="/register" className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Become an Oracle
              </Link>
            </Button>
          </div>
        </nav>
      </Container>
    </AppHeader>
  );
}
