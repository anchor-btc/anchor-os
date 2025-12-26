'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  MapPin,
  Send,
  Loader2,
  Camera,
  ShoppingBag,
  Calendar,
  AlertTriangle,
  Landmark,
  Check,
  Clock,
  ExternalLink,
  Bitcoin,
  Zap,
  Gem,
  Stamp,
} from 'lucide-react';
import {
  CATEGORIES,
  CARRIERS,
  createMarker,
  mineBlocks,
  truncateTxid,
  getExplorerTxUrl,
  type CreateMarkerResponse,
} from '@/lib/api';
import { fitsInOpReturn, maxOpReturnMessageLength } from '@/lib/marker-encoder';
import { clsx } from 'clsx';

interface CreateMarkerPanelProps {
  latitude: number;
  longitude: number;
  onClose: () => void;
  onSuccess: () => void;
  onPending?: (txid: string, lat: number, lng: number, categoryId: number) => void;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'map-pin': MapPin,
  camera: Camera,
  'shopping-bag': ShoppingBag,
  calendar: Calendar,
  'alert-triangle': AlertTriangle,
  landmark: Landmark,
};

const CARRIER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  zap: Zap,
  gem: Gem,
  stamp: Stamp,
};

export function CreateMarkerPanel({
  latitude,
  longitude,
  onClose,
  onSuccess,
  onPending,
}: CreateMarkerPanelProps) {
  const [category, setCategory] = useState(0);
  const [carrier, setCarrier] = useState(0);
  const [message, setMessage] = useState('');
  const [pendingTx, setPendingTx] = useState<CreateMarkerResponse | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      createMarker({
        category,
        latitude,
        longitude,
        message,
        carrier,
      }),
    onSuccess: async (data) => {
      // Show pending state immediately
      setPendingTx(data);

      // Notify parent about pending marker
      if (onPending) {
        onPending(data.txid, latitude, longitude, category);
      }

      setIsConfirming(true);

      // Mine a block to confirm the transaction (regtest only)
      try {
        await mineBlocks(1);
      } catch {
        // Ignore mining errors in non-regtest environments
      }

      // Wait for indexer to process
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['markers'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });

      setIsConfirming(false);
      onSuccess();
    },
  });

  const handleSubmit = () => {
    if (message.trim()) {
      mutation.mutate();
    }
  };

  const isValidLength = fitsInOpReturn(message.length);
  const maxLength = maxOpReturnMessageLength();

  // Show pending state after transaction is broadcast
  if (pendingTx) {
    const selectedCategory = CATEGORIES.find((c) => c.id === category);
    const CategoryIcon = CATEGORY_ICONS[selectedCategory?.icon || 'map-pin'] || MapPin;

    return (
      <div className="fixed bottom-10 left-0 right-0 z-[1001] p-4 md:left-auto md:right-4 md:bottom-12 md:w-96">
        <div className="bg-secondary border border-map-border rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-map-border">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center animate-pulse"
                style={{ backgroundColor: selectedCategory?.color || '#f97316' }}
              >
                <CategoryIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">
                  {isConfirming ? 'Confirming...' : 'Pending Marker'}
                </h3>
                <p className="text-xs text-secondary-foreground">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </p>
              </div>
            </div>
            {!isConfirming && (
              <button
                onClick={onClose}
                className="p-1 text-secondary-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Pending content */}
          <div className="p-4 space-y-4">
            {/* Message preview */}
            <div className="p-3 bg-map-bg rounded-lg border border-map-border">
              <p className="text-foreground text-sm">{message}</p>
            </div>

            {/* Transaction info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Bitcoin className="w-4 h-4 text-bitcoin" />
                <span className="text-secondary-foreground">Transaction:</span>
                <a
                  href={getExplorerTxUrl(pendingTx.txid)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-primary hover:underline flex items-center gap-1"
                >
                  {truncateTxid(pendingTx.txid)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span className="text-secondary-foreground">Carrier:</span>
                <span className="text-foreground capitalize">{pendingTx.carrier_name}</span>
              </div>
            </div>

            {/* Status */}
            <div
              className={clsx(
                'flex items-center gap-2 p-3 rounded-lg text-sm',
                isConfirming
                  ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
                  : 'bg-green-500/10 border border-green-500/20 text-green-400'
              )}
            >
              {isConfirming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Waiting for blockchain confirmation...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Marker confirmed on blockchain!
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-10 left-0 right-0 z-[1001] p-4 md:left-auto md:right-4 md:bottom-12 md:w-96">
      <div className="bg-secondary border border-map-border rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-map-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">New Marker</h3>
              <p className="text-xs text-secondary-foreground">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-secondary-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Category selection */}
          <div>
            <label className="text-sm text-secondary-foreground mb-2 block">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.icon] || MapPin;
                const isSelected = category === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={clsx(
                      'flex flex-col items-center gap-1 p-2 rounded-lg border transition-all',
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-map-border bg-map-bg hover:border-primary/50'
                    )}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: cat.color }}
                    >
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-xs text-foreground">{cat.name}</span>
                    {isSelected && (
                      <Check className="w-3 h-3 text-primary absolute top-1 right-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message input */}
          <div>
            <label className="text-sm text-secondary-foreground mb-2 block">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message..."
              maxLength={255}
              rows={3}
              className="w-full px-3 py-2 bg-map-bg border border-map-border rounded-lg text-foreground placeholder:text-secondary-foreground resize-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
            <div className="flex items-center justify-between mt-1">
              <span
                className={clsx(
                  'text-xs',
                  isValidLength || carrier !== 0 ? 'text-secondary-foreground' : 'text-yellow-500'
                )}
              >
                {message.length}/{carrier === 0 ? maxLength : '∞'}{' '}
                {!isValidLength && carrier === 0 && '(exceeds OP_RETURN limit)'}
              </span>
            </div>
          </div>

          {/* Carrier selection */}
          <div>
            <label className="text-sm text-secondary-foreground mb-2 block">Carrier</label>
            <div className="grid grid-cols-3 gap-2">
              {CARRIERS.map((car) => {
                const Icon = CARRIER_ICONS[car.icon] || Zap;
                const isSelected = carrier === car.id;
                const isDisabled = car.id === 0 && !isValidLength;

                return (
                  <button
                    key={car.id}
                    onClick={() => !isDisabled && setCarrier(car.id)}
                    disabled={isDisabled}
                    className={clsx(
                      'flex flex-col items-center gap-1 p-2 rounded-lg border transition-all',
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : isDisabled
                          ? 'border-map-border bg-map-bg opacity-50 cursor-not-allowed'
                          : 'border-map-border bg-map-bg hover:border-primary/50'
                    )}
                  >
                    <Icon
                      className={clsx(
                        'w-5 h-5',
                        isSelected ? 'text-primary' : 'text-secondary-foreground'
                      )}
                    />
                    <span className="text-xs text-foreground">{car.name}</span>
                    <span className="text-[10px] text-secondary-foreground">{car.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!message.trim() || mutation.isPending}
            className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all btn-glow"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Broadcasting...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Pin on Bitcoin
              </>
            )}
          </button>

          {mutation.isError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to create marker'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
