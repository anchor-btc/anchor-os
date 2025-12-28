'use client';

import { motion } from 'framer-motion';

export function NetworkStatusBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="w-full bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-b border-amber-500/20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
          {/* Network Badge */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
              Regtest Only
            </span>
          </div>

          {/* Message */}
          <p className="text-sm text-muted-foreground">
            <span className="hidden sm:inline">🧪 </span>
            Currently in <span className="text-amber-400 font-medium">playground mode</span> for
            protocol refinement.
            <span className="hidden md:inline"> Devs can already build and test everything!</span>
          </p>

          {/* Roadmap Pills */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-medium">
              Regtest
            </span>
            <svg
              className="w-3 h-3 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-muted font-medium">
              Testnet
            </span>
            <svg
              className="w-3 h-3 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-muted font-medium">
              Mainnet
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
