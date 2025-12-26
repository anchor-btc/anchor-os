'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ProofCard } from '@/components';
import { Container, HeroSection, HowItWorks, StatsGrid } from '@AnchorProtocol/ui';
import { listProofs, getStats } from '@/lib/api';
import { formatFileSize } from '@/lib/hash';
import { FileCheck, Shield, ArrowRight, Hash, Database, XCircle } from 'lucide-react';

export default function HomePage() {
  const { data: recentProofs } = useQuery({
    queryKey: ['proofs', 1, '', false],
    queryFn: () => listProofs(1, 6),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    refetchInterval: 30000,
  });

  const statsItems = [
    {
      icon: FileCheck,
      value: stats?.total_proofs || 0,
      label: 'Total Proofs',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/20',
    },
    {
      icon: Shield,
      value: stats?.active_proofs || 0,
      label: 'Active Proofs',
      color: 'text-green-500',
      bgColor: 'bg-green-500/20',
    },
    {
      icon: XCircle,
      value: stats?.revoked_proofs || 0,
      label: 'Revoked',
      color: 'text-red-500',
      bgColor: 'bg-red-500/20',
    },
    {
      icon: Hash,
      value: stats?.sha256_proofs || 0,
      label: 'SHA-256',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/20',
    },
    {
      icon: Hash,
      value: stats?.sha512_proofs || 0,
      label: 'SHA-512',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/20',
    },
    {
      icon: Database,
      value: stats ? formatFileSize(stats.total_file_size) : '0 B',
      label: 'Total Size',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/20',
    },
  ];

  const howItWorksSteps = [
    {
      step: '1',
      title: 'Upload File',
      description: 'Select any file from your device. It never leaves your browser.',
    },
    {
      step: '2',
      title: 'Generate Hash',
      description: 'A unique SHA-256 or SHA-512 fingerprint is computed locally.',
    },
    {
      step: '3',
      title: 'Record on Bitcoin',
      description: 'The hash is permanently recorded in a Bitcoin transaction.',
    },
  ];

  return (
    <Container className="space-y-12">
      {/* Hero Section */}
      <HeroSection
        title="Proof of Existence on Bitcoin"
        accentWord="Bitcoin"
        subtitle="Timestamp any file on the Bitcoin blockchain. Create immutable proof that your document, image, or data existed at a specific point in time."
        accentColor="emerald"
        actions={[
          { href: '/stamp', label: 'Stamp a File', icon: FileCheck, variant: 'primary' },
          { href: '/validate', label: 'Validate a File', icon: Shield, variant: 'secondary' },
        ]}
      />

      {/* How it Works */}
      <HowItWorks
        title="How It Works"
        steps={howItWorksSteps}
        accentColor="emerald"
        columns={{ default: 1, md: 3 }}
      />

      {/* Stats */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Protocol Statistics</h2>
        <StatsGrid
          items={statsItems}
          columns={{ default: 2, md: 3, lg: 6 }}
          isLoading={statsLoading}
        />
      </div>

      {/* Recent Proofs */}
      {recentProofs && recentProofs.data.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Recent Proofs</h2>
            <Link
              href="/proofs"
              className="text-emerald-500 hover:text-emerald-400 flex items-center gap-1 text-sm"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentProofs.data.map((proof) => (
              <ProofCard key={proof.id} proof={proof} />
            ))}
          </div>
        </div>
      )}
    </Container>
  );
}
