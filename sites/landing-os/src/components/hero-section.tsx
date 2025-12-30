'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Anchor, Check, Copy, ArrowRight, Github } from 'lucide-react';

const INSTALL_COMMAND = 'curl -fsSL http://os.anchor-protocol.com/install.sh | bash';

export function HeroSection() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(INSTALL_COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent" />

      {/* Particle network background */}
      <div className="particles-bg">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${8 + Math.random() * 6}s`,
            }}
          />
        ))}
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(249,115,22,0.3) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(249,115,22,0.3) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Anchor OS Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="mb-8"
        >
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-gradient-to-br from-primary/30 to-amber-500/20 border border-primary/30 glow-primary-strong animate-glow">
            <Anchor className="w-14 h-14 text-primary" strokeWidth={1.5} />
          </div>
        </motion.div>

        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
          className="mb-6"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-primary text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            ANCHOR OS
          </span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6"
        >
          <span className="text-foreground">Your Bitcoin Stack.</span>
          <br />
          <span className="text-gradient">Your Rules.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
        >
          Run a full Bitcoin node, Electrum server, and decentralized apps — all from one beautiful
          dashboard. Self-sovereign Bitcoin infrastructure.
        </motion.p>

        {/* Stats - More prominent */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: 'easeOut' }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-6 sm:gap-10 px-8 py-5 rounded-2xl glass-card border border-primary/20">
            {[
              { value: '8+', label: 'Apps Included' },
              { value: '100%', label: 'Self-Hosted' },
              { value: '24/7', label: 'Your Node' },
            ].map((stat, index) => (
              <div key={stat.label} className="text-center relative">
                {index > 0 && (
                  <div className="absolute left-[-12px] sm:left-[-20px] top-1/2 -translate-y-1/2 w-px h-10 bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
                )}
                <div className="text-3xl sm:text-4xl font-bold text-gradient mb-1">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Install Command */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
          className="mb-6"
        >
          <div className="text-sm text-muted-foreground mb-3 font-medium">Quick Install</div>
          <div
            onClick={copyToClipboard}
            className="group relative inline-flex items-center gap-4 px-4 sm:px-6 py-3 sm:py-4 rounded-xl glass-card border border-primary/30 hover:border-primary/60 cursor-pointer transition-all duration-300 hover:scale-[1.02] glow-primary-subtle max-w-full"
          >
            <span className="text-primary font-mono shrink-0">$</span>
            <code className="font-mono text-xs sm:text-sm md:text-base text-foreground text-left break-all sm:break-normal">
              curl -fsSL os.anchor-protocol.com/install.sh | bash
            </code>
            <button className="shrink-0 flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs sm:text-sm font-medium transition-colors">
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45, ease: 'easeOut' }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="#quickstart"
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all duration-200 hover:scale-105 glow-primary"
          >
            View Full Setup Guide
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="https://github.com/anchor-btc/anchor-os"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl glass-card hover:bg-white/10 text-foreground font-semibold transition-all duration-200"
          >
            <Github className="w-5 h-5" />
            GitHub
          </a>
        </motion.div>
      </div>

    </section>
  );
}
