"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, usePathname } from "next/navigation";
import { fetchInstallationStatus } from "@/lib/api";
import { Sidebar } from "@/components/sidebar";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [setupCompleted, setSetupCompleted] = useState(true);

  const isSetupPage = pathname?.startsWith("/setup");

  useEffect(() => {
    // Skip check if already on setup page
    if (isSetupPage) {
      setIsChecking(false);
      return;
    }

    async function checkSetup() {
      try {
        const status = await fetchInstallationStatus();
        setSetupCompleted(status.setup_completed);
        
        if (!status.setup_completed) {
          router.push("/setup");
        }
      } catch (error) {
        // If API fails, assume setup is complete (for development/offline mode)
        console.warn("Failed to check setup status:", error);
        setSetupCompleted(true);
      } finally {
        setIsChecking(false);
      }
    }

    checkSetup();
  }, [pathname, router, isSetupPage]);

  // Show loading while checking
  if (isChecking && !isSetupPage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If setup not completed and not on setup page, don't render anything (will redirect)
  if (!setupCompleted && !isSetupPage) {
    return null;
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
      <main className="flex-1 ml-64 p-8 bg-grid">
        {children}
      </main>
    </div>
  );
}
