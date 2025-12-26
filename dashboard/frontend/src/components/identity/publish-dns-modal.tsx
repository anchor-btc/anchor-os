"use client";

import { useState, useEffect } from "react";
import {
  Globe,
  X,
  AlertCircle,
  RefreshCw,
  Check,
  Copy,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Identity, publishIdentityToDns, fetchAssetsDomains, DomainAsset } from "@/lib/api";

interface PublishDnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  identity: Identity | null;
  onSuccess: () => void;
}

// Anchor Domains API URL
const DOMAINS_API_URL = process.env.NEXT_PUBLIC_DOMAINS_API_URL || "http://localhost:3401";

export function PublishDnsModal({
  isOpen,
  onClose,
  identity,
  onSuccess,
}: PublishDnsModalProps) {
  const [domains, setDomains] = useState<DomainAsset[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [subdomain, setSubdomain] = useState<string>("");
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    recordName: string;
    recordValue: string;
  } | null>(null);
  const [copied, setCopied] = useState<"name" | "value" | null>(null);

  // Load domains when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDomain("");
      setSubdomain("");
      setIsPublishing(false);
      setError(null);
      setSuccess(null);
      setCopied(null);
      
      // Fetch user's domains from wallet
      loadDomains();
    }
  }, [isOpen]);

  const loadDomains = async () => {
    setIsLoadingDomains(true);
    setError(null);
    try {
      const domainAssets = await fetchAssetsDomains();
      setDomains(domainAssets);
      if (domainAssets.length > 0) {
        setSelectedDomain(domainAssets[0].name);
      }
    } catch (e: any) {
      console.error("Failed to load domains:", e);
      // Don't show error, just empty list
      setDomains([]);
    } finally {
      setIsLoadingDomains(false);
    }
  };

  if (!isOpen || !identity) return null;

  const identityPrefix = identity.identity_type === "nostr" ? "_nostr" : "_pubky";
  const previewRecordName = subdomain
    ? `${subdomain}.user.${identityPrefix}.${selectedDomain}`
    : `user.${identityPrefix}.${selectedDomain}`;

  const previewValue = identity.identity_type === "nostr"
    ? `npub1${identity.public_key.slice(0, 56)}...`
    : `pk:${identity.public_key.slice(0, 16)}...`;

  const handlePublish = async () => {
    if (!selectedDomain) {
      setError("Please select a domain");
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      // Step 1: Publish to anchor-domains API (creates the identity record)
      const domainsResponse = await fetch(
        `${DOMAINS_API_URL}/domains/${selectedDomain}/identities`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identity_type: identity.identity_type,
            public_key: identity.public_key,
            subdomain: subdomain || undefined,
          }),
        }
      );

      if (!domainsResponse.ok) {
        const errorText = await domainsResponse.text();
        throw new Error(errorText || "Failed to publish identity to domain");
      }

      const domainsResult = await domainsResponse.json();

      // Step 2: Update wallet's local record of DNS publishing
      await publishIdentityToDns(
        identity.id,
        selectedDomain,
        subdomain || undefined
      );
      
      setSuccess({
        recordName: domainsResult.record_name || previewRecordName,
        recordValue: domainsResult.record_value || (identity.identity_type === "nostr"
          ? `npub1${identity.public_key.slice(0, 56)}`
          : `pk:${identity.public_key}`),
      });
      onSuccess();
    } catch (e: any) {
      setError(e.message || "Failed to publish identity to DNS");
    } finally {
      setIsPublishing(false);
    }
  };

  const copyToClipboard = (text: string, type: "name" | "value") => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Globe className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Publish Identity to DNS</h2>
              <p className="text-sm text-gray-400">
                Using Selfie Records (BIP-353)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Success State */}
          {success && (
            <div className="space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <div className="flex items-center gap-2 text-green-400 mb-3">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Identity Published!</span>
                </div>
                <p className="text-sm text-gray-300 mb-4">
                  Your identity is now linked to your domain. Anyone can resolve it using:
                </p>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">DNS Record</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm text-green-400 bg-gray-800/50 px-3 py-2 rounded font-mono break-all">
                        {success.recordName}
                      </code>
                      <button
                        onClick={() => copyToClipboard(success.recordName, "name")}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                      >
                        {copied === "name" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="pt-2 text-sm text-gray-400">
                    <p>Verify with:</p>
                    <code className="text-xs text-gray-500 font-mono">
                      dig @1.1.1.1 txt {success.recordName}
                    </code>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* Form State */}
          {!success && (
            <>
              {/* Error */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Identity Info */}
              <div className="p-4 bg-gray-800/50 rounded-xl">
                <p className="text-xs text-gray-500 mb-2">Identity</p>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    identity.identity_type === "nostr"
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-cyan-500/20 text-cyan-400"
                  }`}>
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{identity.label}</p>
                    <p className="text-xs text-gray-500 uppercase">{identity.identity_type}</p>
                  </div>
                </div>
              </div>

              {/* Domain Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400">Select Domain</label>
                  <button
                    onClick={loadDomains}
                    disabled={isLoadingDomains}
                    className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingDomains ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>
                
                {isLoadingDomains ? (
                  <div className="flex items-center justify-center py-8 text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : domains.length === 0 ? (
                  <div className="text-center py-6 bg-gray-800/50 rounded-xl">
                    <Globe className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No domains found in your wallet</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Register a domain first using the Anchor DNS app
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {domains.map((domain) => (
                      <button
                        key={domain.name}
                        onClick={() => setSelectedDomain(domain.name)}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                          selectedDomain === domain.name
                            ? "border-green-500 bg-green-500/10"
                            : "border-gray-700 hover:border-gray-600"
                        }`}
                      >
                        <span className={selectedDomain === domain.name ? "text-white" : "text-gray-400"}>
                          {domain.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Subdomain Input */}
              {domains.length > 0 && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Subdomain <span className="text-gray-600">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="hello"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    For address format: {subdomain || "hello"}@{selectedDomain || "domain.btc"}
                  </p>
                </div>
              )}

              {/* Preview */}
              {selectedDomain && (
                <div className="p-4 bg-gray-800/50 rounded-xl space-y-3">
                  <p className="text-xs text-gray-500">Preview DNS Record</p>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Name</p>
                    <code className="text-sm text-green-400 font-mono break-all">
                      {previewRecordName}
                    </code>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">TXT Value</p>
                    <code className="text-sm text-blue-400 font-mono break-all">
                      {previewValue}
                    </code>
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <ExternalLink className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-300">
                    <p className="font-medium mb-1">Selfie Records</p>
                    <p className="text-blue-400/80">
                      This publishes your identity using the Selfie Records spec (BIP-353 extension).
                      Anyone can resolve your Nostr or Pubky key using your domain.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="p-5 border-t border-gray-800 flex justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePublish}
              disabled={isPublishing || !selectedDomain || domains.length === 0}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isPublishing && <RefreshCw className="w-4 h-4 animate-spin" />}
              Publish to DNS
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
