"use client";

import {
  Search,
  Bitcoin,
  Grid3X3,
  Map,
  Coins,
  ExternalLink,
  ArrowRight,
} from "lucide-react";

const links = [
  {
    name: "ANCHOR Explorer",
    description: "Browse messages and threads",
    href: "http://localhost:3000",
    icon: Search,
    color: "orange",
  },
  {
    name: "Anchor Tokens",
    description: "UTXO-based tokens like Runes",
    href: "http://localhost:3017",
    icon: Coins,
    color: "amber",
  },
  {
    name: "BTC Explorer",
    description: "Bitcoin block explorer",
    href: "http://localhost:3003",
    icon: Bitcoin,
    color: "yellow",
  },
  {
    name: "AnchorCanvas",
    description: "Collaborative Bitcoin canvas",
    href: "http://localhost:3200",
    icon: Grid3X3,
    color: "purple",
  },
  {
    name: "AnchorMap",
    description: "Bitcoin-powered map markers",
    href: "http://localhost:3007",
    icon: Map,
    color: "blue",
  },
];

const colorClasses: Record<string, { bg: string; text: string; hover: string }> = {
  orange: {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    hover: "hover:border-orange-500/30",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    hover: "hover:border-amber-500/30",
  },
  yellow: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-500",
    hover: "hover:border-yellow-500/30",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-500",
    hover: "hover:border-purple-500/30",
  },
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    hover: "hover:border-blue-500/30",
  },
};

export function QuickLinks() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Quick Access</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {links.map((link) => {
          const colors = colorClasses[link.color];
          return (
            <a
              key={link.name}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`group bg-card border border-border rounded-xl p-4 card-hover ${colors.hover}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}
                  >
                    <link.icon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {link.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {link.description}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

