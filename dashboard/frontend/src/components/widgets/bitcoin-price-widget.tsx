'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Loader2, Bitcoin } from 'lucide-react';

interface PriceData {
  USD: number;
  EUR: number;
  GBP: number;
}

async function fetchBitcoinPrice(): Promise<PriceData> {
  const res = await fetch('http://localhost:4000/api/v1/prices');
  if (!res.ok) throw new Error('Failed to fetch price');
  return res.json();
}

export function BitcoinPriceWidget() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery({
    queryKey: ['bitcoin-price'],
    queryFn: fetchBitcoinPrice,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-center h-14">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Bitcoin className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('widgets.btcPrice')}</p>
            <p className="text-sm text-muted-foreground">{t('widgets.unavailable')}</p>
          </div>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Bitcoin className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('widgets.bitcoinPrice')}</p>
            <p className="text-lg font-bold text-foreground">{formatPrice(data.USD)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border">
        <div>
          <p className="text-[10px] text-muted-foreground">EUR</p>
          <p className="text-xs font-medium">€{data.EUR?.toLocaleString() || '-'}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">GBP</p>
          <p className="text-xs font-medium">£{data.GBP?.toLocaleString() || '-'}</p>
        </div>
      </div>
    </div>
  );
}
