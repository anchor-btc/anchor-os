import { HeroSection } from '@/components/hero-section';
import { MessageDecoder } from '@/components/message-decoder';
import { TransactionVisualizer } from '@/components/transaction-visualizer';
import { Kind1Showcase } from '@/components/kind1-showcase';
import { ProtocolComparison } from '@/components/protocol-comparison';
import { CTASection } from '@/components/cta-section';

export default function Home() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <MessageDecoder />
      <TransactionVisualizer />
      <Kind1Showcase />
      <ProtocolComparison />
      <CTASection />
    </main>
  );
}
