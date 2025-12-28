'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchStats, formatNumber } from '@/lib/api';
import { AppHeader, AppLogo, NavLink, NavGroup, Container } from '@AnchorProtocol/ui';
import { MapPin, Activity, BookOpen, User, Home } from 'lucide-react';

const DOCS_URL = 'https://docs.anchor-protocol.com/apps/places';

export function Header() {
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    refetchInterval: 30000,
  });

  return (
    <AppHeader variant="blur">
      <Container>
        <nav className="flex items-center h-16 gap-6">
          <AppLogo
            appName="Places"
            appIcon={MapPin}
            accentColor="blue"
            subtitle="Pin Messages on Bitcoin"
          />

          {/* Divider */}
          <div className="w-px h-6 bg-white/10" />

          {/* Stats */}
          {stats && (
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-blue-500" />
                <span className="text-foreground font-medium">
                  {formatNumber(stats.total_markers)}
                </span>
                <span className="text-muted-foreground">markers</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-foreground font-medium">
                  {formatNumber(stats.total_replies)}
                </span>
                <span className="text-muted-foreground">replies</span>
              </div>
              {stats.last_block_height && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Block</span>
                  <span className="text-foreground font-mono">#{stats.last_block_height}</span>
                </div>
              )}
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Navigation */}
          <NavGroup gap="sm">
            <NavLink href="/" icon={Home} accentColor="blue">
              Map
            </NavLink>
            <NavLink href="/my-places" icon={User} accentColor="blue">
              My Places
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
