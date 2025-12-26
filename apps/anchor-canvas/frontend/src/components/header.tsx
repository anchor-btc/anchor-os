'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchStats, formatNumber } from '@/lib/api';
import { AppHeader, AppLogo, NavLink, NavGroup, Container } from '@AnchorProtocol/ui';
import { Grid3X3, Palette, Zap, Box, BookOpen, Home } from 'lucide-react';

const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL
  ? `${process.env.NEXT_PUBLIC_DOCS_URL}/kinds/state.html`
  : 'http://localhost:3900/kinds/state.html';

export function Header() {
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    refetchInterval: 10000,
  });

  return (
    <AppHeader variant="dark">
      <Container>
        <nav className="flex items-center h-14 gap-6">
          <AppLogo
            appName="Canvas"
            appIcon={Grid3X3}
            accentColor="rose"
            subtitle="Collaborative Pixel Art on Bitcoin"
          />

          {/* Divider */}
          <div className="w-px h-6 bg-white/10" />

          {/* Stats - Compact pills */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <Grid3X3 size={13} className="text-rose-500" />
              <span className="text-xs font-medium text-white/80 font-mono">
                {formatNumber(stats?.total_pixels_painted || 0)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <Zap size={13} className="text-cyan-400" />
              <span className="text-xs font-medium text-white/80 font-mono">
                {formatNumber(stats?.total_transactions || 0)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <Box size={13} className="text-amber-500" />
              <span className="text-xs font-medium text-white/80 font-mono">
                #{stats?.last_block_height?.toLocaleString() || '—'}
              </span>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Navigation */}
          <NavGroup gap="sm">
            <NavLink href="/" icon={Home} accentColor="rose">
              Canvas
            </NavLink>
            <NavLink href="/my-pixels" icon={Palette} accentColor="rose">
              My Pixels
            </NavLink>
            <NavLink href={DOCS_URL} icon={BookOpen} external>
              Docs
            </NavLink>
          </NavGroup>
        </nav>
      </Container>
    </AppHeader>
  );
}
