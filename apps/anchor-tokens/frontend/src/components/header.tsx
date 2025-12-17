"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins, Wallet, Book, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/tokens", label: "Tokens", icon: Coins },
  { href: "/deploy", label: "Deploy", icon: Plus },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/docs", label: "Docs", icon: Book },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-lg flex items-center justify-center">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">Anchor Tokens</span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                    isActive
                      ? "bg-orange-500/20 text-orange-400"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
