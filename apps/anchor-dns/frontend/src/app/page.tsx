"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header, SearchBox, DomainCard, StatsCard } from "@/components";
import { resolveDomain, listDomains, type ResolveResponse } from "@/lib/api";
import { AlertCircle, CheckCircle } from "lucide-react";

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
      // Add .bit if not present
      const searchQuery = query.endsWith(".bit") ? query : `${query}.bit`;
      const result = await resolveDomain(searchQuery);
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
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Decentralized DNS on{" "}
            <span className="text-bitcoin-orange">Bitcoin</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Register your .bit domain on the Bitcoin blockchain using the Anchor
            protocol. Permanent, censorship-resistant, and truly yours.
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
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400">
          <p>
            Built on{" "}
            <a
              href="https://github.com/AnchorProtocol"
              className="text-bitcoin-orange hover:underline"
            >
              Anchor Protocol
            </a>{" "}
            • Powered by Bitcoin
          </p>
        </div>
      </footer>
    </div>
  );
}
