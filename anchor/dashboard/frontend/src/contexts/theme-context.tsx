"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type ThemeName =
  | "bitcoin-orange"
  | "dark"
  | "midnight-blue"
  | "light-clean"
  | "hacker-green"
  | "dracula";

export interface ThemeInfo {
  id: ThemeName;
  name: string;
  description: string;
  isDark: boolean;
  preview: {
    background: string;
    primary: string;
    card: string;
  };
}

export const THEMES: ThemeInfo[] = [
  {
    id: "bitcoin-orange",
    name: "Bitcoin Orange",
    description: "Light theme with Bitcoin orange accent",
    isDark: false,
    preview: {
      background: "#fafafa",
      primary: "#f7931a",
      card: "#ffffff",
    },
  },
  {
    id: "dark",
    name: "Dark Mode",
    description: "Dark theme with Bitcoin orange accent",
    isDark: true,
    preview: {
      background: "#0a0a0a",
      primary: "#f7931a",
      card: "#141414",
    },
  },
  {
    id: "midnight-blue",
    name: "Midnight Blue",
    description: "Dark blue theme for night owls",
    isDark: true,
    preview: {
      background: "#0f172a",
      primary: "#3b82f6",
      card: "#1e293b",
    },
  },
  {
    id: "light-clean",
    name: "Light Clean",
    description: "Minimalist light theme",
    isDark: false,
    preview: {
      background: "#ffffff",
      primary: "#18181b",
      card: "#ffffff",
    },
  },
  {
    id: "hacker-green",
    name: "Hacker Green",
    description: "Matrix-inspired terminal theme",
    isDark: true,
    preview: {
      background: "#0d1117",
      primary: "#00ff41",
      card: "#161b22",
    },
  },
  {
    id: "dracula",
    name: "Dracula",
    description: "Popular dark theme with purple accents",
    isDark: true,
    preview: {
      background: "#282a36",
      primary: "#bd93f9",
      card: "#21222c",
    },
  },
];

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  autoMode: boolean;
  setAutoMode: (auto: boolean) => void;
  themes: ThemeInfo[];
  currentTheme: ThemeInfo;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "anchor-os-theme";
const AUTO_MODE_KEY = "anchor-os-theme-auto";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>("bitcoin-orange");
  const [autoMode, setAutoModeState] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    const savedAutoMode = localStorage.getItem(AUTO_MODE_KEY) === "true";

    if (savedAutoMode) {
      setAutoModeState(true);
      // Detect system preference
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setThemeState(prefersDark ? "dark" : "bitcoin-orange");
    } else if (savedTheme && THEMES.find((t) => t.id === savedTheme)) {
      setThemeState(savedTheme);
    }

    setIsLoaded(true);
  }, []);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (!autoMode) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setThemeState(e.matches ? "dark" : "bitcoin-orange");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [autoMode]);

  // Apply theme to document
  useEffect(() => {
    if (!isLoaded) return;
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme, isLoaded]);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    if (autoMode) {
      setAutoModeState(false);
      localStorage.setItem(AUTO_MODE_KEY, "false");
    }
  };

  const setAutoMode = (auto: boolean) => {
    setAutoModeState(auto);
    localStorage.setItem(AUTO_MODE_KEY, auto.toString());
    if (auto) {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setThemeState(prefersDark ? "dark" : "bitcoin-orange");
    }
  };

  const currentTheme =
    THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        autoMode,
        setAutoMode,
        themes: THEMES,
        currentTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}




