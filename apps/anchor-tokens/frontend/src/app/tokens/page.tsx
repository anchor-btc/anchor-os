'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Coins } from 'lucide-react';
import { TokenCard } from '@/components/token-card';
import { getTokens } from '@/lib/api';

export default function TokensPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const perPage = 12;

  const { data: tokens, isLoading } = useQuery({
    queryKey: ['tokens', page, perPage, search],
    queryFn: () => getTokens(page, perPage, search || undefined),
  });

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">All Tokens</h1>
          <p className="text-gray-400">
            {tokens?.total ?? 0} tokens deployed on the Anchor Protocol
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ticker..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : tokens?.data?.length ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tokens.data.map((token) => (
              <TokenCard key={token.id} token={token} />
            ))}
          </div>

          {/* Pagination */}
          {tokens.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-400">
                Page {page} of {tokens.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(tokens.totalPages, p + 1))}
                disabled={page === tokens.totalPages}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 bg-gray-800/30 rounded-xl border border-gray-700">
          <Coins className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-xl text-gray-400 mb-2">No tokens found</p>
          <p className="text-gray-500">
            {search ? 'Try a different search term' : 'Be the first to deploy a token!'}
          </p>
        </div>
      )}
    </main>
  );
}
