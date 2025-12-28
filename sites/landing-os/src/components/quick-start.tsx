'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

const steps = [
  {
    number: '01',
    title: 'Clone the Repository',
    description: 'Get the Anchor OS source code from GitHub',
    code: 'git clone https://github.com/anchor-btc/anchor-os.git\ncd anchor-os',
  },
  {
    number: '02',
    title: 'Start the Stack',
    description: 'Launch all services with Docker Compose',
    code: 'docker compose up -d',
  },
  {
    number: '03',
    title: 'Open Dashboard',
    description: 'Access your Anchor OS dashboard',
    code: 'open http://localhost:8000',
  },
];

export function QuickStart() {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const copyToClipboard = (text: string, stepIndex: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepIndex);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <section id="quickstart" className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card text-primary text-xs font-medium mb-4">
            GETTING STARTED
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">Quick Start</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Get your Bitcoin stack running in three simple steps. No complex configuration required.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              {/* Connection line */}
              {index < steps.length - 1 && (
                <div className="absolute left-[47px] top-[80px] w-px h-[calc(100%-40px)] bg-gradient-to-b from-primary/50 to-transparent" />
              )}

              <div className="flex gap-6">
                {/* Step number */}
                <div className="relative z-10 flex-shrink-0">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-amber-500/10 border border-primary/30 flex items-center justify-center">
                    <span className="text-3xl font-bold text-gradient">{step.number}</span>
                  </div>
                </div>

                {/* Step content */}
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground mb-4">{step.description}</p>

                  {/* Code block */}
                  <div className="relative glass-card overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-card/50 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/50" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                        <div className="w-3 h-3 rounded-full bg-green-500/50" />
                      </div>
                      <button
                        onClick={() => copyToClipboard(step.code, index)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copiedStep === index ? (
                          <>
                            <svg
                              className="w-4 h-4 text-green-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 overflow-x-auto">
                      <code className="text-sm font-mono text-primary">{step.code}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Success message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 p-6 glass-card gradient-border text-center"
        >
          <div className="text-4xl mb-4">🎉</div>
          <h3 className="text-xl font-bold mb-2">That&apos;s it!</h3>
          <p className="text-muted-foreground">
            Your Bitcoin stack is now running. Visit the dashboard to explore all features.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
