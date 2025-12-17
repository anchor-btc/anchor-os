"use client";

import { useState } from "react";
import { Eye, CheckCircle } from "lucide-react";

const categories = [
  { id: 1, name: "Block", description: "Block and chain data" },
  { id: 2, name: "Prices", description: "Cryptocurrency and asset prices" },
  { id: 4, name: "Sports", description: "Sports events and results" },
  { id: 8, name: "Weather", description: "Weather data and forecasts" },
  { id: 16, name: "Elections", description: "Election and political outcomes" },
  { id: 32, name: "Random", description: "Random number generation (VRF)" },
  { id: 64, name: "Custom", description: "Custom event types" },
];

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [stakeAmount, setStakeAmount] = useState("10000");

  const toggleCategory = (id: number) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const categoryBitmap = selectedCategories.reduce((acc, id) => acc | id, 0);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mx-auto mb-4">
          <Eye className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white">Become an Oracle</h1>
        <p className="text-gray-400 mt-2">
          Register as an oracle operator to provide trusted data to the network
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Oracle Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Oracle"
            className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your oracle service..."
            rows={3}
            className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Categories
          </label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                  selectedCategories.includes(cat.id)
                    ? "border-purple-500 bg-purple-500/20"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <CheckCircle
                  className={`w-5 h-5 ${
                    selectedCategories.includes(cat.id) ? "text-purple-400" : "text-gray-600"
                  }`}
                />
                <div>
                  <p className="font-medium text-white">{cat.name}</p>
                  <p className="text-xs text-gray-400">{cat.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Stake Amount (sats)
          </label>
          <input
            type="number"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            min="10000"
            step="1000"
            className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Minimum stake: 10,000 sats. Higher stakes increase trust.
          </p>
        </div>

        <div className="pt-4 border-t border-white/10">
          <button
            disabled={!name || selectedCategories.length === 0}
            className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium transition-colors"
          >
            Register Oracle
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Category bitmap: {categoryBitmap}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
        <h3 className="font-medium text-purple-300 mb-2">What happens next?</h3>
        <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
          <li>Sign the registration message with your oracle key</li>
          <li>Broadcast the registration transaction to Bitcoin</li>
          <li>Your oracle will appear in the registry after confirmation</li>
          <li>Start fulfilling event requests to build reputation</li>
        </ol>
      </div>
    </div>
  );
}

