'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { fetchInstallationStatus } from '@/lib/api';
import { Sidebar } from '@/components/sidebar';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [setupCompleted, setSetupCompleted] = useState<boolean | null>(null);

  const isSetupPage = pathname?.startsWith('/setup');

  const checkSetup = useCallback(async () => {
    try {
      const status = await fetchInstallationStatus();
      setSetupCompleted(status.setup_completed);

      // If setup not completed and not on setup page, redirect
      if (!status.setup_completed && !pathname?.startsWith('/setup')) {
        router.replace('/setup');
        return;
      }
    } catch (error) {
      // If API fails, show a retry message or assume incomplete for safety
      console.warn('Failed to check setup status:', error);
      // On error, redirect to setup to be safe (user can skip if already set up)
      if (!pathname?.startsWith('/setup')) {
        router.replace('/setup');
        return;
      }
      setSetupCompleted(false);
    } finally {
      setIsChecking(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    // Always check on mount and route change
    setIsChecking(true);
    checkSetup();
  }, [pathname, checkSetup]);

  // Also check on window focus (in case user navigates away and back)
  useEffect(() => {
    const handleFocus = () => {
      if (!isSetupPage) {
        checkSetup();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkSetup, isSetupPage]);

  // Show loading while checking (always show loading until we know the status)
  if (isChecking || setupCompleted === null) {
    // On setup page, show children immediately (setup page handles its own loading)
    if (isSetupPage) {
      return <>{children}</>;
    }
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If setup not completed and not on setup page, show nothing (redirecting)
  if (!setupCompleted && !isSetupPage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Redirecting to setup...</p>
        </div>
      </div>
    );
  }

  // Setup page - no sidebar, centered layout
  if (isSetupPage) {
    return <>{children}</>;
  }

  // Normal layout with sidebar
  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<div className="w-64 bg-card border-r border-border" />}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 ml-64 p-8 bg-grid">{children}</main>
    </div>
  );
}
