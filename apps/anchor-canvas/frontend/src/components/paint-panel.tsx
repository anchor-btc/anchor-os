"use client";

import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  createPixelTransaction, 
  type Pixel, 
  type CarrierType,
  CARRIER_INFO,
  calculatePayloadSize,
  getRecommendedCarrier,
  canCarrierHandle,
  estimateTxSize,
} from "@/lib/api";
import { ColorPicker } from "./color-picker";
import { AlertCircle, Bitcoin, CheckCircle, Loader2, Paintbrush, ChevronDown, ChevronUp, Zap, Settings } from "lucide-react";

interface PaintPanelProps {
  selectedPixels: Map<string, Pixel>;
  selectedColor: { r: number; g: number; b: number };
  onColorChange: (color: { r: number; g: number; b: number }) => void;
  onClearSelection: () => void;
  onMoveToPending?: () => void; // Move pixels to pending state after TX success
  onTransactionSuccess?: () => void;
  feeRate: number;
  onFeeRateChange: (rate: number) => void;
}

export function PaintPanel({
  selectedPixels,
  selectedColor,
  onColorChange,
  onClearSelection,
  onMoveToPending,
  onTransactionSuccess,
  feeRate,
  onFeeRateChange,
}: PaintPanelProps) {
  const queryClient = useQueryClient();
  const [txResult, setTxResult] = useState<{ txid: string; carrier?: string } | null>(null);
  const [selectedCarrier, setSelectedCarrier] = useState<CarrierType>("inscription");
  const [showCarrierOptions, setShowCarrierOptions] = useState(false);
  const [showFeeSettings, setShowFeeSettings] = useState(false);

  const pixelCount = selectedPixels.size;
  const payloadSize = useMemo(() => calculatePayloadSize(pixelCount), [pixelCount]);
  const recommendedCarrier = useMemo(() => getRecommendedCarrier(pixelCount), [pixelCount]);
  
  // Estimate fees for each carrier using current fee rate
  const carrierFees = useMemo(() => {
    const carriers: CarrierType[] = ["op_return", "witness_data", "inscription"];
    return carriers.map(c => ({
      carrier: c,
      info: CARRIER_INFO[c],
      txSize: estimateTxSize(pixelCount, c),
      fee: estimateTxSize(pixelCount, c) * feeRate,
      available: canCarrierHandle(c, pixelCount),
    }));
  }, [pixelCount, feeRate]);

  const currentCarrierFee = useMemo(() => {
    return carrierFees.find(c => c.carrier === selectedCarrier);
  }, [carrierFees, selectedCarrier]);

  const paintMutation = useMutation({
    mutationFn: async () => {
      const pixels = Array.from(selectedPixels.values());
      if (pixels.length === 0) {
        throw new Error("No pixels selected");
      }
      return createPixelTransaction(pixels, selectedCarrier, feeRate);
    },
    onSuccess: (data) => {
      setTxResult({ txid: data.txid, carrier: data.carrier_name });
      // Move pixels to pending state instead of clearing them
      // This keeps them visible until indexed
      if (onMoveToPending) {
        onMoveToPending();
      } else {
        onClearSelection();
      }
      // Refresh data after a delay
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["stats"] });
        queryClient.invalidateQueries({ queryKey: ["recent-pixels"] });
        queryClient.invalidateQueries({ queryKey: ["balance"] });
        onTransactionSuccess?.();
      }, 2000);
    },
  });

  // Calculate max pixels based on selected carrier (each pixel = 7 bytes + 4 bytes header)
  const maxPixelsForCarrier = useMemo(() => {
    const carrierInfo = CARRIER_INFO[selectedCarrier];
    return Math.floor((carrierInfo.maxBytes - 4) / 7);
  }, [selectedCarrier]);
  
  const canPaint = pixelCount > 0 && currentCarrierFee?.available;

  return (
    <div className="space-y-6">
      {/* Color Picker */}
      <div className="stats-card">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Paintbrush size={18} className="text-primary" />
          Color
        </h3>
        <ColorPicker color={selectedColor} onChange={onColorChange} />
      </div>

      {/* Selection Summary */}
      <div className="stats-card">
        <h3 className="font-medium mb-4">Selection</h3>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Pixels selected</span>
            <span
              className={`font-mono ${
                !currentCarrierFee?.available ? "text-red-400" : "text-primary"
              }`}
            >
              {pixelCount.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Payload size</span>
            <span className="font-mono text-gray-300">
              {payloadSize.toLocaleString()} bytes
            </span>
          </div>

          {!currentCarrierFee?.available && pixelCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-900/20 p-2 rounded-lg">
              <AlertCircle size={16} />
              <span>Max ~{maxPixelsForCarrier.toLocaleString()} pixels for {CARRIER_INFO[selectedCarrier].name}</span>
            </div>
          )}

          {/* Carrier Selection */}
          <div className="border-t border-gray-700 pt-3 mt-3">
            <button
              onClick={() => setShowCarrierOptions(!showCarrierOptions)}
              className="w-full flex items-center justify-between text-sm text-gray-400 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2">
                <Zap size={14} />
                Carrier Type
              </span>
              <span className="flex items-center gap-2">
                <span className="text-primary font-medium">
                  {CARRIER_INFO[selectedCarrier].name}
                </span>
                {showCarrierOptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </button>

            {showCarrierOptions && (
              <div className="mt-3 space-y-2">
                {carrierFees.map(({ carrier, info, txSize, fee, available }) => (
                  <button
                    key={carrier}
                    onClick={() => {
                      if (available) {
                        setSelectedCarrier(carrier);
                        setShowCarrierOptions(false);
                      }
                    }}
                    disabled={!available}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      selectedCarrier === carrier
                        ? "border-primary bg-primary/10"
                        : available
                        ? "border-gray-700 hover:border-gray-600 bg-gray-800/50"
                        : "border-gray-800 bg-gray-900/50 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${selectedCarrier === carrier ? "text-primary" : ""}`}>
                        {info.name}
                        {carrier === recommendedCarrier && available && (
                          <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                      </span>
                      <span className="text-sm font-mono text-bitcoin">
                        ~{fee} sats
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">{info.description}</span>
                      <span className="text-xs text-gray-500">~{txSize} vB</span>
                    </div>
                    {!available && (
                      <span className="text-xs text-red-400 mt-1 block">
                        Payload too large ({payloadSize} &gt; {info.maxBytes} bytes)
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fee Rate Settings */}
          <div className="border-t border-gray-700 pt-3 mt-3">
            <button
              onClick={() => setShowFeeSettings(!showFeeSettings)}
              className="w-full flex items-center justify-between text-sm text-gray-400 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2">
                <Settings size={14} />
                Fee Rate
              </span>
              <span className="flex items-center gap-2">
                <span className="text-primary font-medium font-mono">
                  {feeRate} sat/vB
                </span>
                {showFeeSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </button>

            {showFeeSettings && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={feeRate}
                    onChange={(e) => onFeeRateChange(parseInt(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={feeRate}
                    onChange={(e) => onFeeRateChange(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm font-mono text-center"
                  />
                </div>
                <div className="flex gap-2">
                  {[1, 2, 5, 10, 25, 50].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => onFeeRateChange(rate)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        feeRate === rate
                          ? "bg-primary text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {rate}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Higher fee = faster confirmation. Default: 1 sat/vB
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-between text-sm border-t border-gray-700 pt-3">
            <span className="text-gray-400">Estimated fee</span>
            <span className="font-mono text-bitcoin text-lg">
              ~{currentCarrierFee?.fee || 0} sats
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">TX size</span>
            <span className="font-mono text-gray-300">
              ~{currentCarrierFee?.txSize || 0} vBytes
            </span>
          </div>

          {/* Selected pixels preview - only show first 20 */}
          {pixelCount > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Array.from(selectedPixels.values())
                .slice(0, 20)
                .map((p) => (
                  <div
                    key={`${p.x},${p.y}`}
                    className="w-5 h-5 rounded border border-gray-700"
                    style={{ backgroundColor: `rgb(${p.r}, ${p.g}, ${p.b})` }}
                    title={`(${p.x}, ${p.y})`}
                  />
                ))}
              {pixelCount > 20 && (
                <div className="w-5 h-5 rounded border border-gray-700 bg-gray-800 flex items-center justify-center text-xs text-gray-400">
                  +{pixelCount - 20}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Paint Button */}
      <button
        onClick={() => paintMutation.mutate()}
        disabled={!canPaint || paintMutation.isPending}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {paintMutation.isPending ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Creating Transaction...
          </>
        ) : (
          <>
            <Bitcoin size={20} />
            Paint {pixelCount} Pixel{pixelCount !== 1 ? "s" : ""}
          </>
        )}
      </button>

      {/* Transaction Result */}
      {txResult && (
        <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-800 rounded-lg text-sm">
          <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-green-400 flex items-center gap-2">
              Transaction sent!
              {txResult.carrier && (
                <span className="text-xs bg-green-500/20 px-1.5 py-0.5 rounded">
                  via {txResult.carrier}
                </span>
              )}
            </p>
            <p className="font-mono text-xs text-gray-400 truncate">{txResult.txid}</p>
          </div>
        </div>
      )}

      {paintMutation.isError && (
        <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-800 rounded-lg text-sm">
          <AlertCircle size={18} className="text-red-400" />
          <p className="text-red-400">
            {paintMutation.error instanceof Error
              ? paintMutation.error.message
              : "Failed to paint"}
          </p>
        </div>
      )}
    </div>
  );
}
