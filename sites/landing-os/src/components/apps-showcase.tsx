"use client";

import { motion } from "framer-motion";
import { apps } from "@/lib/apps-data";

export function AppsShowcase() {
  return (
    <section className="py-24 px-6 bg-gradient-to-b from-transparent via-card/30 to-transparent">
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
            APPLICATIONS
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">Decentralized Apps</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            A growing ecosystem of applications built on Bitcoin. 
            All self-hosted, all sovereign, all yours.
          </p>
        </motion.div>

        {/* Apps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {apps.map((app, index) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative"
            >
              <div className="glass-card p-6 h-full transition-all duration-300 group-hover:bg-white/10 group-hover:scale-[1.02] group-hover:shadow-xl">
                {/* Gradient border on hover */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl"
                  style={{
                    background: `linear-gradient(135deg, ${app.color.replace('from-', '').replace(' to-', ', ')})`,
                  }}
                />
                
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {app.icon}
                </div>
                
                {/* Name */}
                <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                  {app.name}
                </h3>
                
                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {app.description}
                </p>

                {/* Learn more link */}
                <div className="mt-4 flex items-center gap-1 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Learn more</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* More coming soon */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-muted-foreground text-sm">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            More apps coming soon
          </div>
        </motion.div>
      </div>
    </section>
  );
}

