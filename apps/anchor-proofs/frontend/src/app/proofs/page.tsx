"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProofCard } from "@/components";
import { listProofs } from "@/lib/api";
import {
  Search,
  List,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
} from "lucide-react";

export default function ProofsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [includeRevoked, setIncludeRevoked] = useState(false);
  const perPage = 12;

  const { data, isLoading, error } = useQuery({
    queryKey: ["proofs", page, search, includeRevoked],
    queryFn: () => listProofs(page, perPage, search || undefined, includeRevoked),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
            <List className="w-5 h-5 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold text-white">All Proofs</h1>
        </div>
        <p className="text-slate-400 mb-8">
          Browse all file proofs registered on the Bitcoin blockchain.
        </p>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by filename or description..."
                className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
            >
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Clear
              </button>
            )}
          </form>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeRevoked}
                onChange={(e) => {
                  setIncludeRevoked(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              Include revoked
            </label>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400">Failed to load proofs</p>
          </div>
        ) : data && data.data.length > 0 ? (
          <>
            {/* Stats */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-400">
                Showing {(page - 1) * perPage + 1}-
                {Math.min(page * perPage, data.total)} of {data.total} proofs
              </p>
            </div>

            {/* Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {data.data.map((proof) => (
                <ProofCard key={proof.id} proof={proof} />
              ))}
            </div>

            {/* Pagination */}
            {data.total_pages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1">
                  {[...Array(Math.min(5, data.total_pages))].map((_, i) => {
                    let pageNum: number;
                    if (data.total_pages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= data.total_pages - 2) {
                      pageNum = data.total_pages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                          page === pageNum
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                  disabled={page === data.total_pages}
                  className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <List className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">
              {search ? "No proofs found matching your search" : "No proofs registered yet"}
            </p>
            {search && (
              <button
                onClick={handleClearSearch}
                className="mt-4 text-emerald-500 hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        )}
    </main>
  );
}
