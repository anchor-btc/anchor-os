"use client";

import { useState, useEffect } from "react";
import { Eye, CheckCircle, Key, AlertCircle, Loader2, Zap, RefreshCw } from "lucide-react";

const categories = [
  { id: 1, name: "Block", description: "Block and chain data" },
  { id: 2, name: "Prices", description: "Cryptocurrency and asset prices" },
  { id: 4, name: "Sports", description: "Sports events and results" },
  { id: 8, name: "Weather", description: "Weather data and forecasts" },
  { id: 16, name: "Elections", description: "Election and political outcomes" },
  { id: 32, name: "Random", description: "Random number generation (VRF)" },
  { id: 64, name: "Custom", description: "Custom event types" },
];

interface Identity {
  id: string;
  identity_type: string;
  label: string;
  public_key: string;
  formatted_public_key: string;
  is_primary: boolean;
}

const WALLET_URL = process.env.NEXT_PUBLIC_WALLET_URL || "http://localhost:8001";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3701";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [stakeAmount, setStakeAmount] = useState("10000");
  
  // Identity state
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [selectedIdentity, setSelectedIdentity] = useState<Identity | null>(null);
  const [isLoadingIdentities, setIsLoadingIdentities] = useState(true);
  const [identityError, setIdentityError] = useState<string | null>(null);
  
  // Registration state
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadIdentities();
  }, []);

  const loadIdentities = async () => {
    setIsLoadingIdentities(true);
    setIdentityError(null);
    try {
      const res = await fetch(`${WALLET_URL}/wallet/identities`);
      if (!res.ok) throw new Error("Failed to fetch identities");
      const data = await res.json();
      const nostrIdentities = (data.identities || []).filter(
        (i: Identity) => i.identity_type === "nostr"
      );
      setIdentities(nostrIdentities);
      
      // Auto-select primary or first identity
      const primary = nostrIdentities.find((i: Identity) => i.is_primary);
      if (primary) {
        setSelectedIdentity(primary);
      } else if (nostrIdentities.length > 0) {
        setSelectedIdentity(nostrIdentities[0]);
      }
    } catch (e: any) {
      setIdentityError(e.message || "Failed to load identities");
    } finally {
      setIsLoadingIdentities(false);
    }
  };

  const toggleCategory = (id: number) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const categoryBitmap = selectedCategories.reduce((acc, id) => acc | id, 0);

  const handleRegister = async () => {
    if (!name || !selectedIdentity || selectedCategories.length === 0) {
      setRegisterError("Please fill in all required fields");
      return;
    }

    setIsRegistering(true);
    setRegisterError(null);
    setRegisterSuccess(null);

    try {
      // Create oracle registration message via wallet
      const response = await fetch(`${WALLET_URL}/wallet/create-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: 30, // Oracle Registration
          body: buildOracleRegistrationBody(),
          body_is_hex: true,
          carrier: 1, // Inscription
          fee_rate: 50,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to create oracle registration");
      }

      const result = await response.json();
      setRegisterSuccess(`Oracle registered successfully! TXID: ${result.txid}`);
    } catch (e: any) {
      setRegisterError(e.message || "Failed to register oracle");
    } finally {
      setIsRegistering(false);
    }
  };

  const buildOracleRegistrationBody = (): string => {
    // Build the oracle registration body as hex
    // Expected format by indexer (from indexer.rs OracleRegistration::parse):
    // - byte 0: action (0=register)
    // - bytes 1-32: oracle_pubkey (32 bytes)
    // - bytes 33-34: name_len (u16 big-endian)
    // - bytes 35..35+name_len: name
    // - bytes after name: categories (i16 = 2 bytes big-endian)
    // - bytes after categories: stake_amount (i64 = 8 bytes big-endian)
    // - remaining: metadata (optional raw string, no length prefix)
    
    const pubkeyHex = selectedIdentity?.public_key || "";
    const nameBytes = new TextEncoder().encode(name);
    const metadataBytes = new TextEncoder().encode(description || "");
    const stakeValue = BigInt(stakeAmount);
    
    let hex = "";
    
    // Action: 0 = register
    hex += "00";
    
    // Oracle pubkey (32 bytes)
    hex += pubkeyHex;
    
    // Name length (u16 big-endian)
    hex += nameBytes.length.toString(16).padStart(4, "0");
    
    // Name bytes
    hex += Array.from(nameBytes).map(b => b.toString(16).padStart(2, "0")).join("");
    
    // Categories (i16 big-endian, 2 bytes)
    hex += categoryBitmap.toString(16).padStart(4, "0");
    
    // Stake amount (i64 big-endian, 8 bytes)
    hex += stakeValue.toString(16).padStart(16, "0");
    
    // Metadata (optional raw string, no length prefix)
    if (metadataBytes.length > 0) {
      hex += Array.from(metadataBytes).map(b => b.toString(16).padStart(2, "0")).join("");
    }
    
    return hex;
  };

  const canRegister = name && selectedIdentity && selectedCategories.length > 0 && !isRegistering;

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
        {/* Identity Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-300">
              Oracle Identity (Nostr Key)
            </label>
            <button
              onClick={loadIdentities}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingIdentities ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          
          {isLoadingIdentities ? (
            <div className="flex items-center justify-center py-6 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading identities...
            </div>
          ) : identityError ? (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {identityError}
            </div>
          ) : identities.length === 0 ? (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
              <Key className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-yellow-300 font-medium">No Nostr identities found</p>
              <p className="text-yellow-400/70 text-sm mt-1">
                Create a Nostr identity in your{" "}
                <a href="http://localhost:8000/identities" className="underline hover:text-yellow-300">
                  Anchor Wallet
                </a>{" "}
                first.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {identities.map((identity) => (
                <button
                  key={identity.id}
                  onClick={() => setSelectedIdentity(identity)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    selectedIdentity?.id === identity.id
                      ? "border-purple-500 bg-purple-500/20"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Zap className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{identity.label}</p>
                      {identity.is_primary && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 font-mono truncate">
                      {identity.formatted_public_key.slice(0, 20)}...{identity.formatted_public_key.slice(-8)}
                    </p>
                  </div>
                  {selectedIdentity?.id === identity.id && (
                    <CheckCircle className="w-5 h-5 text-purple-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

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

        {/* Error/Success Messages */}
        {registerError && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {registerError}
          </div>
        )}
        
        {registerSuccess && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
            <CheckCircle className="w-4 h-4 inline mr-2" />
            {registerSuccess}
          </div>
        )}

        <div className="pt-4 border-t border-white/10">
          <button
            onClick={handleRegister}
            disabled={!canRegister}
            className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isRegistering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registering...
              </>
            ) : (
              "Register Oracle"
            )}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Category bitmap: {categoryBitmap} | Identity: {selectedIdentity?.label || "None"}
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
