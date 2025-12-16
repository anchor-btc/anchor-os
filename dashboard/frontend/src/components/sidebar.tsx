"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Anchor,
  LayoutDashboard,
  Server,
  Wallet,
  Bitcoin,
  ExternalLink,
  Map,
  Grid3X3,
  Search,
  AppWindow,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Apps", href: "/apps", icon: AppWindow },
  { name: "Bitcoin Node", href: "/node", icon: Bitcoin },
  { name: "Wallet", href: "/wallet", icon: Wallet },
];

const externalLinks = [
  { name: "Explorer", href: "http://localhost:3000", icon: Search },
  { name: "BTC Explorer", href: "http://localhost:3003", icon: Bitcoin },
  { name: "PixelMap", href: "http://localhost:3005", icon: Grid3X3 },
  { name: "AnchorMap", href: "http://localhost:3007", icon: Map },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Anchor className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground">ANCHOR</h1>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-3">
          Menu
        </p>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}

        {/* External Links */}
        <div className="pt-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-3">
            Apps
          </p>
          {externalLinks.map((item) => (
            <a
              key={item.name}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors group"
            >
              <item.icon className="w-5 h-5" />
              {item.name}
              <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      </nav>

      {/* Advanced */}
      <div className="p-4">
        <Link
          href="/services"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
            pathname === "/services"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Settings className="w-4 h-4" />
          Advanced Services
        </Link>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span>Stack Running</span>
        </div>
      </div>
    </aside>
  );
}

