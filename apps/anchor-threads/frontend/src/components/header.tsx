"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Anchor, MessageSquare, BarChart3, PenLine, FileText, Code } from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    // Check initial scroll position
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  const navLinkClass = (path: string) => {
    const base = "flex items-center gap-2 transition-colors";
    if (isActive(path)) {
      return `${base} text-orange-500 font-medium`;
    }
    return `${base} text-gray-500 hover:text-gray-900`;
  };

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm" 
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="container mx-auto px-4 max-w-6xl">
        <nav className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Anchor className="h-7 w-7 text-primary anchor-animate" />
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            </div>
            <span className="font-bold text-xl tracking-tight">
              ANCHOR
              <span className="text-muted-foreground text-sm font-normal ml-2">
                Explorer
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/threads" className={navLinkClass("/threads")}>
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Threads</span>
            </Link>
            <Link href="/stats" className={navLinkClass("/stats")}>
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Stats</span>
            </Link>
            <Link href="/about" className={navLinkClass("/about")}>
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">About</span>
            </Link>
            <Link href="/developers" className={navLinkClass("/developers")}>
              <Code className="h-4 w-4" />
              <span className="hidden sm:inline">Devs</span>
            </Link>
            <Link
              href="/compose"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive("/compose")
                  ? "bg-orange-600 text-white"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              <PenLine className="h-4 w-4" />
              <span>Compose</span>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
