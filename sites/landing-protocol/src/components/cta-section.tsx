'use client';

import { motion } from 'framer-motion';
import { BookOpen, Server, ArrowRight, Github, Send, Twitter, MessageCircle } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#f59e0b" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            <span className="text-foreground">Ready to </span>
            <span className="text-gradient">Build?</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Explore the full documentation or try Anchor OS to start building decentralized
            applications on Bitcoin.
          </p>
        </motion.div>

        {/* CTA Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Docs Card */}
          <motion.a
            href="https://docs.anchor-protocol.com"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="group relative bg-muted/30 border border-muted hover:border-accent/50 rounded-2xl p-8 transition-all duration-300 hover:bg-accent/5"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl group-hover:bg-accent/10 transition-colors" />

            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BookOpen className="w-7 h-7 text-accent" strokeWidth={1.5} />
              </div>

              <h3 className="text-xl font-bold text-foreground mb-2">Read the Docs</h3>
              <p className="text-muted-foreground mb-6">
                Complete protocol specification, SDK reference, and examples to help you get
                started.
              </p>

              <div className="flex items-center gap-2 text-accent font-medium">
                <span>Explore Documentation</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.a>

          {/* Anchor OS Card */}
          <motion.a
            href="http://os.anchor-protocol.com"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="group relative bg-gradient-to-br from-accent/10 to-orange-500/5 border border-accent/20 hover:border-accent/50 rounded-2xl p-8 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl group-hover:bg-accent/20 transition-colors" />

            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Server className="w-7 h-7 text-accent" strokeWidth={1.5} />
              </div>

              <h3 className="text-xl font-bold text-foreground mb-2">Try Anchor OS</h3>
              <p className="text-muted-foreground mb-6">
                Full Bitcoin node, Electrum server, and decentralized apps - all from one dashboard.
              </p>

              <div className="flex items-center gap-2 text-accent font-medium">
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.a>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-muted/30 border border-muted text-muted-foreground text-sm">
            <span>Built on Bitcoin</span>
            <span className="text-accent">•</span>
            <span>Open Source</span>
            <span className="text-accent">•</span>
            <span>MIT License</span>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6">
            <a
              href="https://github.com/anchor-btc"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-6 h-6" />
            </a>
            <a
              href="https://x.com/AnchorProt26203"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Twitter className="w-6 h-6" />
            </a>
            <a
              href="https://discord.gg/mrzgrFt5"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="w-6 h-6" />
            </a>
            <a
              href="https://t.me/+s7sBoBaI3XNmOTgx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Send className="w-6 h-6" />
            </a>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            © {new Date().getFullYear()} Anchor Protocol. Messages etched in stone.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
