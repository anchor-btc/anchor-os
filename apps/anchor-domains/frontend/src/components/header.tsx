"use client";

import Link from "next/link";
import { Globe, Search, PlusCircle, FileText, Wallet, User, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getWalletBalance, formatSats } from "@/lib/api";
import {
  AppHeader,
  AppLogo,
  NavLink,
  NavGroup,
  Container,
} from "@AnchorProtocol/ui";

export function Header() {
  const { data: balance } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: getWalletBalance,
    refetchInterval: 10000,
  });

  return (
    <AppHeader variant="dark">
      <Container>
        <nav className="flex items-center justify-between h-16">
          <AppLogo
            appName="Domains"
            appIcon={Globe}
            accentColor="orange"
          />

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

          {/* Wallet Balance */}
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-lg">
            <Wallet className="h-4 w-4 text-orange-500" />
            <span className="text-white font-mono text-sm">
              {balance ? formatSats(balance.total) : "Loading..."}
            </span>
          </div>
        </nav>
      </Container>
    </AppHeader>
  );
}
