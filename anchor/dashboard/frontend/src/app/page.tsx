"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardWidgets } from "@/components/widgets/dashboard-widgets";
import { IframeView } from "@/components/iframe-view";
import { Loader2 } from "lucide-react";

function DashboardContent() {
  const searchParams = useSearchParams();
  const appId = searchParams.get("app");
  const initialUrl = searchParams.get("url") || undefined;

  // If an app is selected via query param, show iframe view
  if (appId) {
    return <IframeView appId={appId} initialUrl={initialUrl} />;
  }

  // Otherwise show the widget dashboard
  return <DashboardWidgets />;
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
