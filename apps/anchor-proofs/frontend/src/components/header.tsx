"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileCheck, Home, Shield, List, FileText, User, ExternalLink } from "lucide-react";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Stamp", href: "/stamp", icon: FileCheck },
  { name: "Validate", href: "/validate", icon: Shield },
  { name: "Proofs", href: "/proofs", icon: List },
  { name: "My Proofs", href: "/my-proofs", icon: User },
];

const DOCS_URL = "http://localhost:3900/apps/proofs";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">
              Anchor<span className="text-emerald-500">Proofs</span>
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                    transition-colors duration-200
                    ${
                      isActive
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.name}</span>
                </Link>
              );
            })}
            {/* External Docs Link */}
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors duration-200"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Docs</span>
              <ExternalLink className="w-3 h-3 opacity-50" />
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
