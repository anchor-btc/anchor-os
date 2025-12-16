"use client";

import Link from "next/link";
import {
  Anchor,
  Github,
  Twitter,
  BookOpen,
  Code2,
  MessageSquare,
  BarChart3,
  FileText,
  Heart,
  Zap,
  ExternalLink,
} from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-white to-gray-50 border-t border-gray-200 mt-16">
      {/* Main Footer */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-2 rounded-lg shadow-md">
                <Anchor className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">ANCHOR</span>
            </Link>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              A minimalist metaprotocol for recording chained messages on the Bitcoin blockchain.
            </p>
            <div className="flex items-center gap-3">
              <SocialLink href="https://github.com/AnchorProtocol" icon={<Github className="h-4 w-4" />} label="GitHub" />
              <SocialLink href="https://twitter.com/AnchorProtocol" icon={<Twitter className="h-4 w-4" />} label="Twitter" />
              <SocialLink href="https://discord.gg/anchorprotocol" icon={<DiscordIcon className="h-4 w-4" />} label="Discord" />
            </div>
          </div>

          {/* Protocol */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-500" />
              Protocol
            </h3>
            <ul className="space-y-3">
              <FooterLink href="/about" label="Whitepaper" />
              <FooterLink href="/about#specification" label="Specification v1" />
              <FooterLink href="/about#magic" label="Magic Bytes" />
              <FooterLink href="/about#threading" label="Threading Semantics" />
            </ul>
          </div>

          {/* Developers */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Code2 className="h-4 w-4 text-orange-500" />
              Developers
            </h3>
            <ul className="space-y-3">
              <FooterLink href="/developers" label="Documentation" />
              <FooterLink href="/developers#rust-sdk" label="Rust SDK" />
              <FooterLink href="/developers#typescript-sdk" label="TypeScript SDK" />
              <FooterLink href="/developers#api" label="API Reference" />
            </ul>
          </div>

          {/* Explorer */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-orange-500" />
              Explorer
            </h3>
            <ul className="space-y-3">
              <FooterLink href="/threads" label="All Threads" />
              <FooterLink href="/stats" label="Network Stats" />
              <FooterLink href="/compose" label="Create Message" />
              <FooterLink href="https://github.com/AnchorProtocol/anchor" label="Source Code" external />
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-200 bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>© {currentYear} ANCHOR Protocol.</span>
              <span className="hidden md:inline">•</span>
              <span className="flex items-center gap-1">
                Built with <Heart className="h-3 w-3 text-red-500 fill-red-500" /> on Bitcoin
              </span>
            </div>

            {/* Center - Protocol Badge */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-50 to-amber-50 rounded-full border border-orange-100">
              <Zap className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-orange-700">
                ANCHOR v1 • Magic: 0xA11C0001
              </span>
            </div>

            {/* Right */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <Link href="/about" className="hover:text-orange-500 transition-colors">
                About
              </Link>
              <span>•</span>
              <a
                href="https://github.com/AnchorProtocol/anchor/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-orange-500 transition-colors flex items-center gap-1"
              >
                MIT License
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Wave */}
      <div className="h-1 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400" />
    </footer>
  );
}

function SocialLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="p-2.5 bg-gray-100 hover:bg-orange-100 text-gray-600 hover:text-orange-600 rounded-lg transition-colors"
    >
      {icon}
    </a>
  );
}

function FooterLink({
  href,
  label,
  external,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  if (external) {
    return (
      <li>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-500 hover:text-orange-500 transition-colors flex items-center gap-1"
        >
          {label}
          <ExternalLink className="h-3 w-3" />
        </a>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={href}
        className="text-sm text-gray-500 hover:text-orange-500 transition-colors"
      >
        {label}
      </Link>
    </li>
  );
}

// Custom Discord icon since lucide doesn't have one
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

