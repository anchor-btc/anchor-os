'use client';

import { motion } from 'framer-motion';

const annotations = [
  { label: 'Sidebar Navigation', description: 'Quick access to all apps', x: '5%', y: '30%' },
  { label: 'Bitcoin Node Status', description: 'Real-time sync progress', x: '70%', y: '20%' },
  { label: 'System Stats', description: 'CPU, RAM, Disk usage', x: '75%', y: '50%' },
  { label: 'App Launcher', description: 'One-click app access', x: '20%', y: '60%' },
];

export function DashboardPreview() {
  return (
    <section id="dashboard" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card text-primary text-xs font-medium mb-4">
            DASHBOARD
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">Command Center</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            A beautiful, intuitive dashboard to manage your entire Bitcoin stack. Monitor, control,
            and explore — all in one place.
          </p>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          {/* Glow effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-amber-500/20 to-primary/20 rounded-3xl blur-3xl opacity-50" />

          {/* Dashboard mockup */}
          <div className="relative glass-card gradient-border p-2 rounded-2xl overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-card/50 border-b border-white/5 rounded-t-xl">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="px-4 py-1 bg-white/5 rounded-lg text-xs text-muted-foreground font-mono">
                  localhost:8000
                </div>
              </div>
            </div>

            {/* Dashboard content simulation */}
            <div className="relative bg-background/80 rounded-b-xl overflow-hidden">
              <div className="flex min-h-[500px]">
                {/* Sidebar */}
                <div className="w-64 bg-card/50 border-r border-white/5 p-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-primary"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="5" r="3" />
                        <line x1="12" y1="22" x2="12" y2="8" />
                        <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-bold text-sm">ANCHOR OS</div>
                      <div className="text-[10px] text-muted-foreground">beta</div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="space-y-1">
                    {['Dashboard', 'Services', 'Settings'].map((item, i) => (
                      <div
                        key={item}
                        className={`px-3 py-2 rounded-lg text-sm ${i === 0 ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 mb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3">
                    Apps
                  </div>
                  <div className="space-y-1">
                    {['Threads', 'Map', 'Pixel', 'Proof'].map((app) => (
                      <div
                        key={app}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        {app}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Main content */}
                <div className="flex-1 p-6">
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
                    <p className="text-sm text-muted-foreground">Welcome to Anchor OS</p>
                  </div>

                  {/* Stats cards */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                      { label: 'Block Height', value: '847,293', icon: '₿' },
                      { label: 'Connections', value: '8 peers', icon: '🔗' },
                      { label: 'Sync Status', value: '100%', icon: '✓' },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="p-4 rounded-xl bg-card/50 border border-white/5"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">{stat.label}</span>
                          <span>{stat.icon}</span>
                        </div>
                        <div className="text-xl font-bold">{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Activity chart placeholder */}
                  <div className="p-4 rounded-xl bg-card/50 border border-white/5">
                    <div className="text-sm font-medium mb-4">Network Activity</div>
                    <div className="h-32 flex items-end justify-around gap-2">
                      {[40, 65, 45, 80, 55, 70, 60, 85, 50, 75, 65, 90].map((height, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t bg-gradient-to-t from-primary/50 to-primary/20"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating annotations */}
              {annotations.map((annotation, index) => (
                <motion.div
                  key={annotation.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                  className="absolute hidden md:block"
                  style={{ left: annotation.x, top: annotation.y }}
                >
                  <div className="relative group">
                    <div className="w-4 h-4 rounded-full bg-primary animate-ping absolute" />
                    <div className="w-4 h-4 rounded-full bg-primary relative z-10" />
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                      <div className="px-3 py-2 bg-card rounded-lg border border-white/10 shadow-xl whitespace-nowrap">
                        <div className="font-medium text-sm">{annotation.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {annotation.description}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Install CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-8"
        >
          <a
            href="#quickstart"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Install and run your own dashboard
          </a>
        </motion.div>
      </div>
    </section>
  );
}
