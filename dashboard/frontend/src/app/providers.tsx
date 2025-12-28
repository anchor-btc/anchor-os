'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeProvider } from '@/contexts/theme-context';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { LockScreen } from '@/components/lock-screen';
import { I18nProvider } from '@/components/i18n-provider';
import { cn } from '@/lib/utils';
import { fetchInstallationStatus } from '@/lib/api';

// Transition duration in ms
const UNLOCK_TRANSITION_DURATION = 350;

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAuthEnabled, isLoading } = useAuth();
  const pathname = usePathname();
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState<boolean | null>(null);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const prevAuthRef = useRef<boolean | null>(null);

  const isSetupPage = pathname?.startsWith('/setup');

  // Check if setup is completed
  useEffect(() => {
    async function checkSetup() {
      try {
        const status = await fetchInstallationStatus();
        setSetupCompleted(status.setup_completed);
      } catch {
        // On error, assume not completed to force setup check
        setSetupCompleted(false);
      } finally {
        setIsCheckingSetup(false);
      }
    }

    checkSetup();
  }, [pathname]);

  useEffect(() => {
    // Detect transition from not authenticated to authenticated
    if (prevAuthRef.current === false && isAuthenticated && isAuthEnabled) {
      setIsUnlocking(true);
      const timer = setTimeout(() => {
        setIsUnlocking(false);
      }, UNLOCK_TRANSITION_DURATION);
      return () => clearTimeout(timer);
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, isAuthEnabled]);

  // Show loading state while checking auth or setup
  if (isLoading || isCheckingSetup) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If setup is not completed, bypass auth and let LayoutWrapper handle redirect
  // This ensures users must complete setup before being asked for password
  if (!setupCompleted && !isSetupPage) {
    // Let children render - LayoutWrapper will redirect to /setup
    return <>{children}</>;
  }

  // On setup page, don't require auth
  if (isSetupPage) {
    return <>{children}</>;
  }

  // Show lock screen if auth is enabled and user is not authenticated
  if (isAuthEnabled && !isAuthenticated) {
    return <LockScreen />;
  }

  // User is authenticated - show content with optional unlock animation
  return (
    <div
      className={cn(
        'min-h-screen transition-all ease-out',
        isUnlocking ? 'animate-content-emerge' : 'opacity-100'
      )}
      style={{
        animationDuration: `${UNLOCK_TRANSITION_DURATION}ms`,
      }}
    >
      {children}

      {/* Unlock animation styles */}
      <style jsx global>{`
        @keyframes content-emerge {
          0% {
            opacity: 0;
            transform: scale(0.98);
            filter: blur(8px);
          }
          100% {
            opacity: 1;
            transform: scale(1);
            filter: blur(0px);
          }
        }

        .animate-content-emerge {
          animation: content-emerge ${UNLOCK_TRANSITION_DURATION}ms ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <AuthGate>{children}</AuthGate>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}
