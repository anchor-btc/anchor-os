import { HeroSection } from "@/components/hero-section";
import { DashboardPreview } from "@/components/dashboard-preview";
import { AppsShowcase } from "@/components/apps-showcase";
import { FeaturesGrid } from "@/components/features-grid";
import { ArchitectureDiagram } from "@/components/architecture-diagram";
import { QuickStart } from "@/components/quick-start";
import { CTASection } from "@/components/cta-section";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden">
      <HeroSection />
      <DashboardPreview />
      <AppsShowcase />
      <FeaturesGrid />
      <ArchitectureDiagram />
      <QuickStart />
      <CTASection />
    </main>
  );
}

