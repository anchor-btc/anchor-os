"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchBox, DomainCard, StatsCard } from "@/components";
import { Container } from "@AnchorProtocol/ui";
import { resolveDomain, listDomains, type ResolveResponse } from "@/lib/api";
import { SUPPORTED_TLDS } from "@/lib/dns-encoder";
import { AlertCircle, CheckCircle } from "lucide-react";

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

  const { data: recentDomains } = useQuery({
    queryKey: ["recent-domains"],
    queryFn: () => listDomains(1, 6),
  });

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);

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

  return (
    <Container className="space-y-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Decentralized DNS on{" "}
            <span className="text-bitcoin-orange">Bitcoin</span>
          </h1>
          
          {/* Animated Domain Display */}
          <div className="my-8 py-6 px-8 bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-2xl inline-block">
            <div className="text-3xl md:text-4xl font-mono font-bold">
              <span className="text-white">yourdomain</span>
              <AnimatedTLD />
            </div>
          </div>
          
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Register your .btc, .sat, .anchor, .anc, or .bit domain on the Bitcoin blockchain
            using the Anchor protocol. Permanent, censorship-resistant, and truly yours.
          </p>
        </div>

        {/* Search Box */}
        <div className="mb-12">
          <SearchBox onSearch={handleSearch} isLoading={isSearching} />
        </div>

        {/* Search Result */}
        {searchResult && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <h2 className="text-xl font-bold text-white">Domain Found</h2>
            </div>
            <DomainCard domain={searchResult} showRecords />
          </div>
        )}

        {/* Search Error */}
        {searchError && (
          <div className="mb-12">
            <div className="flex items-center gap-2 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-red-400">{searchError}</p>
              {searchError === "Domain not found" && (
                <a
                  href="/register"
                  className="ml-auto text-bitcoin-orange hover:underline"
                >
                  Register this domain →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Protocol Stats</h2>
          <StatsCard />
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
