"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DomainCard } from "@/components";
import { listDomains } from "@/lib/api";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export default function DomainsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const perPage = 12;

  const { data, isLoading } = useQuery({
    queryKey: ["domains", page, perPage, search],
    queryFn: () => listDomains(page, perPage, search || undefined),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Browse Domains</h1>
            <p className="text-slate-400">
              {data ? `${data.total.toLocaleString()} domains registered` : ""}
            </p>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search domains..."
                className="w-64 px-4 py-2 pl-10 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-bitcoin-orange"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-bitcoin-orange text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Domain Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-bitcoin-orange" />
          </div>
        ) : data && data.data.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {data.data.map((domain) => (
                <DomainCard key={domain.id} domain={domain} />
              ))}
            </div>

            {/* Pagination */}
            {data.total_pages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-slate-400">
                  Page {page} of {data.total_pages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === data.total_pages}
                  className="flex items-center gap-1 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-400">
              {search ? "No domains found matching your search" : "No domains registered yet"}
            </p>
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setSearchInput("");
                }}
                className="mt-4 text-bitcoin-orange hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        )}
    </div>
  );
}
