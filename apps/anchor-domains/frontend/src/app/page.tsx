"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchBox, DomainCard } from "@/components";
import { Container, HeroSection, HowItWorks, StatsGrid } from "@AnchorProtocol/ui";
import { resolveDomain, listDomains, getStats, type ResolveResponse } from "@/lib/api";
import { SUPPORTED_TLDS } from "@/lib/dns-encoder";
import { AlertCircle, CheckCircle, Globe, Database, Blocks, Clock, Search, PlusCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Animated TLD component with typewriter effect
function AnimatedTLD() {
  const tlds = SUPPORTED_TLDS as readonly string[];
  const [currentTldIndex, setCurrentTldIndex] = useState(0);
  const [displayText, setDisplayText] = useState(tlds[0]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(tlds[0].length);

  useEffect(() => {
    const currentTld = tlds[currentTldIndex];
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing complete, wait then start deleting
        if (charIndex === currentTld.length) {
          setTimeout(() => setIsDeleting(true), 2000);
          return;
        }
        // Still typing
        setDisplayText(currentTld.slice(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      } else {
        // Deleting
        if (charIndex === 0) {
          // Move to next TLD
          setIsDeleting(false);
          const nextIndex = (currentTldIndex + 1) % tlds.length;
          setCurrentTldIndex(nextIndex);
          return;
        }
        setDisplayText(currentTld.slice(0, charIndex - 1));
        setCharIndex(charIndex - 1);
      }
    }, isDeleting ? 80 : 120);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, currentTldIndex, tlds]);

  return (
    <span className="text-bitcoin-orange font-mono">
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  );
}

export default function HomePage() {
  const [searchResult, setSearchResult] = useState<ResolveResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    refetchInterval: 10000,
  });

  const { data: recentDomains } = useQuery({
    queryKey: ["recent-domains"],
    queryFn: () => listDomains(1, 6),
  });

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);
    setLastSearchQuery(query);

    try {
      // Search with full domain name (must include TLD like .btc, .sat, etc.)
      const result = await resolveDomain(query);
      setSearchResult(result);
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Failed to search"
      );
    } finally {
      setIsSearching(false);
    }
  };

  const statsItems = [
    {
      icon: Globe,
      value: stats?.total_domains || 0,
      label: "Domains",
      color: "text-bitcoin-orange",
      bgColor: "bg-bitcoin-orange/20",
    },
    {
      icon: Database,
      value: stats?.total_records || 0,
      label: "DNS Records",
      color: "text-blue-400",
      bgColor: "bg-blue-400/20",
    },
    {
      icon: Blocks,
      value: stats?.last_block_height || 0,
      label: "Block Height",
      color: "text-green-400",
      bgColor: "bg-green-400/20",
    },
    {
      icon: Clock,
      value: stats?.last_update
        ? formatDistanceToNow(new Date(stats.last_update), { addSuffix: true })
        : "N/A",
      label: "Last Update",
      color: "text-purple-400",
      bgColor: "bg-purple-400/20",
    },
  ];

  const howItWorksSteps = [
    {
      step: "1",
      title: "Search Domain",
      description: "Check if your desired .btc, .sat, .anchor, .anc, or .bit domain is available.",
    },
    {
      step: "2",
      title: "Register",
      description: "Pay with BTC and your domain is recorded permanently on the Bitcoin blockchain.",
    },
    {
      step: "3",
      title: "Manage Records",
      description: "Add DNS records like A, AAAA, CNAME, TXT, and more to your domain.",
    },
  ];

  return (
    <Container className="space-y-12">
      {/* Hero Section */}
      <HeroSection
        title="Decentralized DNS on Bitcoin"
        accentWord="Bitcoin"
        subtitle="Register your .btc, .sat, .anchor, .anc, or .bit domain on the Bitcoin blockchain using the Anchor protocol. Permanent, censorship-resistant, and truly yours."
        accentColor="orange"
        actions={[
          { href: "/register", label: "Register Domain", icon: PlusCircle, variant: "primary" },
          { href: "/domains", label: "Browse Domains", icon: Search, variant: "secondary" },
        ]}
      >
        {/* Animated Domain Display */}
        <div className="mt-8 py-6 px-8 bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-2xl inline-block">
          <div className="text-3xl md:text-4xl font-mono font-bold">
            <span className="text-white">yourdomain</span>
            <AnimatedTLD />
          </div>
        </div>
      </HeroSection>

      {/* Search Box */}
      <div>
        <SearchBox onSearch={handleSearch} isLoading={isSearching} />
      </div>

      {/* Search Result */}
      {searchResult && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <h2 className="text-xl font-bold text-white">Domain Found</h2>
          </div>
          <DomainCard domain={searchResult} showRecords />
        </div>
      )}

      {/* Domain Available - Positive UX! */}
      {searchError === "Domain not found" && lastSearchQuery && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-emerald-500/20 rounded-full">
                <CheckCircle className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  <span className="text-emerald-400 font-mono">{lastSearchQuery}</span> is available!
                </h3>
                <p className="text-slate-400 text-sm">Claim it now before someone else does.</p>
              </div>
            </div>
            <a
              href={`/register?domain=${encodeURIComponent(lastSearchQuery)}`}
              className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <PlusCircle className="h-5 w-5" />
              Register Now
            </a>
          </div>
        </div>
      )}

      {/* Other Search Errors */}
      {searchError && searchError !== "Domain not found" && (
        <div className="flex items-center gap-2 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="text-red-400">{searchError}</p>
        </div>
      )}

      {/* How It Works */}
      <HowItWorks
        title="How It Works"
        steps={howItWorksSteps}
        accentColor="orange"
        columns={{ default: 1, md: 3 }}
      />

      {/* Stats */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Protocol Statistics</h2>
        <StatsGrid
          items={statsItems}
          columns={{ default: 2, md: 4 }}
          isLoading={statsLoading}
        />
      </div>

      {/* Recent Domains */}
      {recentDomains && recentDomains.data.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Recent Domains</h2>
            <a
              href="/domains"
              className="text-bitcoin-orange hover:underline text-sm"
            >
              View all →
            </a>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentDomains.data.map((domain) => (
              <DomainCard key={domain.id} domain={domain} />
            ))}
          </div>
        </div>
      )}
    </Container>
  );
}
