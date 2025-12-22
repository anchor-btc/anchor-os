'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

// tailwind.config.ts
var anchorPreset = {
  theme: {
    extend: {
      colors: {
        // Base colors from CSS variables
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Primary color (can be overridden per app)
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        // Secondary color
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        // Muted backgrounds
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        // Accent color (app-specific)
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        // App-specific accent (overridden per app theme)
        "app-accent": {
          DEFAULT: "hsl(var(--app-accent))"
        },
        // Semantic colors
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))"
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))"
        },
        // Border color
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Card backgrounds
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        // Popover/dialog backgrounds
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        }
      },
      // Border radius tokens
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      // Font families
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"]
      },
      // Animation keyframes
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" }
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" }
        }
      },
      // Animations
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
      }
    }
  }
};
var config = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [anchorPreset],
  plugins: []
};
var tailwind_config_default = config;

exports.anchorPreset = anchorPreset;
exports.default = tailwind_config_default;
//# sourceMappingURL=tailwind.config.cjs.map
//# sourceMappingURL=tailwind.config.cjs.map