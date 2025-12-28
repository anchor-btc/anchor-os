'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  Palette,
  Network,
  Languages,
  Bell,
  LayoutGrid,
  Database,
  ChevronRight,
  User,
  ExternalLink,
  Anchor,
  BookOpen,
  Globe,
  Users,
  Github,
  MessageCircle,
} from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { useQuery } from '@tanstack/react-query';
import { fetchUserProfile } from '@/lib/api';

const DASHBOARD_BACKEND_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_BACKEND_URL || 'http://localhost:8010';

const WIDGET_STORAGE_KEY = 'anchor-dashboard-widgets';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  'pt-BR': 'Português (Brasil)',
  es: 'Español',
};

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { currentTheme } = useTheme();
  const { isAuthEnabled } = useAuth();

  const [networkChain, setNetworkChain] = useState<string>('...');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean | null>(null);
  const [widgetCount, setWidgetCount] = useState<number>(0);

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: fetchUserProfile,
  });

  useEffect(() => {
    // Fetch network info
    fetch(`${DASHBOARD_BACKEND_URL}/bitcoin/info`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.chain) {
          setNetworkChain(data.chain.charAt(0).toUpperCase() + data.chain.slice(1));
        }
      })
      .catch(() => setNetworkChain('Offline'));

    // Fetch notification settings
    fetch(`${DASHBOARD_BACKEND_URL}/settings/notifications`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.setting?.value?.enabled !== undefined) {
          setNotificationsEnabled(data.setting.value.enabled);
        }
      })
      .catch(() => {});

    // Get widget count from localStorage
    try {
      const saved = localStorage.getItem(WIDGET_STORAGE_KEY);
      if (saved) {
        const widgets = JSON.parse(saved);
        setWidgetCount(widgets.filter((w: { enabled: boolean }) => w.enabled).length);
      }
    } catch {
      setWidgetCount(0);
    }
  }, []);

  const currentLanguage = LANGUAGE_NAMES[i18n.language] || i18n.language;

  // Check if avatar is an image (base64 or URL)
  const isImageAvatar =
    userProfile?.avatar_url?.startsWith('data:') || userProfile?.avatar_url?.startsWith('http');

  const settingsCards = [
    {
      href: '/settings/profile',
      labelKey: 'settings.sections.profile.title',
      icon: <User className="w-6 h-6" />,
      descriptionKey: 'settings.sections.profile.description',
      preview: (
        <div className="flex items-center gap-2">
          {isImageAvatar ? (
            <Image
              src={userProfile?.avatar_url || ''}
              alt="Avatar"
              width={24}
              height={24}
              className="w-6 h-6 rounded-full object-cover"
              unoptimized
            />
          ) : (
            <span className="text-lg">{userProfile?.avatar_url || '🧑‍💻'}</span>
          )}
          <span className="text-sm text-muted-foreground">{userProfile?.name || 'Bitcoiner'}</span>
        </div>
      ),
    },
    {
      href: '/settings/appearance',
      labelKey: 'settings.sections.appearance.title',
      icon: <Palette className="w-6 h-6" />,
      descriptionKey: 'settings.sections.appearance.description',
      preview: (
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full border border-border"
            style={{ backgroundColor: currentTheme.preview.primary }}
          />
          <span className="text-sm text-muted-foreground">{currentTheme.name}</span>
        </div>
      ),
    },
    {
      href: '/settings/security',
      labelKey: 'settings.sections.security.title',
      icon: <Shield className="w-6 h-6" />,
      descriptionKey: 'settings.sections.security.description',
      preview: (
        <span className="text-sm text-muted-foreground">
          {isAuthEnabled ? t('security.enabled') : t('security.disabled')}
        </span>
      ),
    },
    {
      href: '/settings/network',
      labelKey: 'settings.sections.network.title',
      icon: <Network className="w-6 h-6" />,
      descriptionKey: 'settings.sections.network.description',
      preview: <span className="text-sm text-muted-foreground">{networkChain}</span>,
    },
    {
      href: '/settings/language',
      labelKey: 'settings.sections.language.title',
      icon: <Languages className="w-6 h-6" />,
      descriptionKey: 'settings.sections.language.description',
      preview: <span className="text-sm text-muted-foreground">{currentLanguage}</span>,
    },
    {
      href: '/settings/notifications',
      labelKey: 'settings.sections.notifications.title',
      icon: <Bell className="w-6 h-6" />,
      descriptionKey: 'settings.sections.notifications.description',
      preview: (
        <span className="text-sm text-muted-foreground">
          {notificationsEnabled === null
            ? '...'
            : notificationsEnabled
              ? t('notifications.enable')
              : t('common.disabled')}
        </span>
      ),
    },
    {
      href: '/settings/dashboard',
      labelKey: 'settings.sections.dashboard.title',
      icon: <LayoutGrid className="w-6 h-6" />,
      descriptionKey: 'settings.sections.dashboard.description',
      preview: <span className="text-sm text-muted-foreground">{widgetCount} widgets</span>,
    },
    {
      href: '/settings/data',
      labelKey: 'settings.sections.data.title',
      icon: <Database className="w-6 h-6" />,
      descriptionKey: 'settings.sections.data.description',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="grid gap-3">
          {settingsCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-secondary text-muted-foreground group-hover:text-primary transition-colors">
                {card.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">{t(card.labelKey)}</div>
                <div className="text-sm text-muted-foreground">{t(card.descriptionKey)}</div>
              </div>
              {card.preview && <div className="hidden sm:block">{card.preview}</div>}
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Resources */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          {t('settings.resources', 'Resources')}
        </h3>
        <div className="grid gap-3">
          <a
            href="http://os.anchor-protocol.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-orange-500/10 text-primary">
              <Anchor className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">Anchor OS</div>
              <div className="text-sm text-muted-foreground">
                {t('settings.anchorOsDescription', 'Self-sovereign Bitcoin infrastructure')}
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </a>

          <a
            href="https://anchor-protocol.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-500">
              <Anchor className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">Anchor Protocol</div>
              <div className="text-sm text-muted-foreground">
                {t('settings.anchorProtocolDescription', 'Bitcoin-native messaging protocol')}
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </a>

          <a
            href="https://docs.anchor-protocol.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-secondary text-muted-foreground group-hover:text-primary transition-colors">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">Documentation</div>
              <div className="text-sm text-muted-foreground">
                {t('settings.docsDescription', 'Learn about Anchor Protocol and SDK')}
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </a>
        </div>
      </div>

      {/* Community */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          {t('settings.community', 'Community')}
        </h3>
        <div className="grid gap-3">
          <a
            href="https://github.com/anchor-btc"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-secondary text-muted-foreground group-hover:text-foreground transition-colors">
              <Github className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">GitHub</div>
              <div className="text-sm text-muted-foreground">
                {t('settings.githubDescription', 'Source code and contributions')}
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </a>

          <a
            href="https://discord.gg/mrzgrFt5"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/10 text-indigo-400">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">Discord</div>
              <div className="text-sm text-muted-foreground">
                {t('settings.discordDescription', 'Join our community chat')}
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </a>

          <a
            href="https://t.me/+s7sBoBaI3XNmOTgx"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-gradient-to-br from-sky-500/20 to-blue-500/10 text-sky-400">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">Telegram</div>
              <div className="text-sm text-muted-foreground">
                {t('settings.telegramDescription', 'News and announcements')}
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </a>

          <a
            href="https://x.com/AnchorProt26203"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-secondary text-muted-foreground group-hover:text-foreground transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">X / Twitter</div>
              <div className="text-sm text-muted-foreground">
                {t('settings.twitterDescription', 'Follow for updates')}
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </a>

          <a
            href="https://njump.me/npub1kyz74p2ngknz6euvdfh30z9ptvu5l3tg297zxj6up0xt8tuj4ccq43s7ey"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-violet-500/10 text-purple-400">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">Nostr</div>
              <div className="text-sm text-muted-foreground">
                {t('settings.nostrDescription', 'Decentralized social')}
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </a>
        </div>
      </div>

      {/* About */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-foreground mb-2">{t('settings.about')}</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>{t('app.version')}: 1.0.0</p>
          <p>{t('app.tagline')}</p>
        </div>
      </div>
    </div>
  );
}
