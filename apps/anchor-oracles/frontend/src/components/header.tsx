"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, Users, FileCheck, AlertTriangle, Calendar, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: Eye },
  { href: "/oracles", label: "Oracles", icon: Users },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/disputes", label: "Disputes", icon: AlertTriangle },
  { href: "/docs", label: "Docs", icon: BookOpen },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Anchor Oracles</h1>
              <p className="text-xs text-gray-400">Decentralized Oracle Network</p>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-purple-500/20 text-purple-400"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/register"
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
          >
            Become an Oracle
          </Link>
        </div>
      </div>
    </header>
  );
}

