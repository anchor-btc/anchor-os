"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { fetchOracles, fetchCategories } from "@/lib/api";
import { OracleCard } from "@/components";

export default function OraclesPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const { data: oracles, isLoading } = useQuery({
    queryKey: ["oracles", 100],
    queryFn: () => fetchOracles(100),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const filteredOracles = oracles?.filter((oracle) => {
    const matchesSearch = !search || 
      oracle.name.toLowerCase().includes(search.toLowerCase()) ||
      oracle.pubkey.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || 
      (oracle.categories & selectedCategory) !== 0;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Oracle Registry</h1>
        <p className="text-gray-400 mt-2">Browse and discover trusted oracles on the network</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search oracles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              !selectedCategory
                ? "bg-purple-600 text-white"
                : "bg-white/5 text-gray-400 hover:text-white"
            }`}
          >
            All
          </button>
          {categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedCategory === cat.id
                  ? "bg-purple-600 text-white"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Oracle Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading oracles...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOracles?.map((oracle) => (
            <OracleCard key={oracle.id} oracle={oracle} />
          ))}
          {(!filteredOracles || filteredOracles.length === 0) && (
            <div className="col-span-full text-center py-12 text-gray-400">
              No oracles found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

