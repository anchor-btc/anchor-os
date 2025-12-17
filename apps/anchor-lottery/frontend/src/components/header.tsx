"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ticket, Trophy, Clock, HelpCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Lotteries", icon: Ticket },
  { href: "/my-tickets", label: "My Tickets", icon: Trophy },
  { href: "/history", label: "History", icon: Clock },
  { href: "/how-it-works", label: "How It Works", icon: HelpCircle },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Ticket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Anchor Lottery</h1>
              <p className="text-xs text-gray-400">Trustless Bitcoin Lottery</p>
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
                      ? "bg-amber-500/20 text-amber-400"
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
            href="/create"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Lottery
          </Link>
        </div>
      </div>
    </header>
  );
}

