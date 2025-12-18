"use client";

import { useRouter } from "next/navigation";
import { apps } from "@/lib/apps";
import {
  ExternalLink,
  X,
  RefreshCw,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Lock,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface IframeViewProps {
  appId: string;
}

export function IframeView({ appId }: IframeViewProps) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Find the app by ID
  const app = apps.find((a) => a.id === appId);
  const baseUrl = app?.url || "";

  // URL and navigation state
  const [currentUrl, setCurrentUrl] = useState(baseUrl);
  const [inputUrl, setInputUrl] = useState(baseUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // History for back/forward
  const [history, setHistory] = useState<string[]>([baseUrl]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  // Reset state when appId changes
  useEffect(() => {
    const newApp = apps.find((a) => a.id === appId);
    const newBaseUrl = newApp?.url || "";
    
    setCurrentUrl(newBaseUrl);
    setInputUrl(newBaseUrl);
    setHistory([newBaseUrl]);
    setHistoryIndex(0);
    setIsLoading(true);
    
    if (iframeRef.current) {
      iframeRef.current.src = newBaseUrl;
    }
  }, [appId]);

  // Listen for postMessage from iframe to get URL updates
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin is from our apps (localhost with any port)
      if (!event.origin.startsWith("http://localhost")) return;

      // Handle URL update messages
      if (event.data?.type === "anchor-url-change" && event.data?.url) {
        const newUrl = event.data.url;
        if (newUrl !== currentUrl) {
          setCurrentUrl(newUrl);
          setInputUrl(newUrl);
          // Add to history if different from current position
          if (history[historyIndex] !== newUrl) {
            setHistory((prev) => [...prev.slice(0, historyIndex + 1), newUrl]);
            setHistoryIndex((prev) => prev + 1);
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [currentUrl, history, historyIndex]);

  if (!app || !app.url) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
        <p className="text-muted-foreground mb-4">App not found or has no external URL</p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const navigateTo = useCallback((url: string, addToHistory = true) => {
    // Ensure URL has protocol
    let finalUrl = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      // If it's a relative path, append to base
      if (url.startsWith("/")) {
        const base = new URL(baseUrl);
        finalUrl = `${base.origin}${url}`;
      } else {
        finalUrl = `http://${url}`;
      }
    }

    setCurrentUrl(finalUrl);
    setInputUrl(finalUrl);
    setIsLoading(true);

    if (iframeRef.current) {
      iframeRef.current.src = finalUrl;
    }

    if (addToHistory) {
      // Add to history, removing any forward history
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), finalUrl]);
      setHistoryIndex((prev) => prev + 1);
    }
  }, [baseUrl, historyIndex]);

  const handleClose = () => {
    router.push("/");
  };

  const handleOpenExternal = () => {
    window.open(currentUrl, "_blank");
  };

  const handleRefresh = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl;
    }
  };

  const handleBack = () => {
    if (canGoBack) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const url = history[newIndex];
      setCurrentUrl(url);
      setInputUrl(url);
      setIsLoading(true);
      if (iframeRef.current) {
        iframeRef.current.src = url;
      }
    }
  };

  const handleForward = () => {
    if (canGoForward) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const url = history[newIndex];
      setCurrentUrl(url);
      setInputUrl(url);
      setIsLoading(true);
      if (iframeRef.current) {
        iframeRef.current.src = url;
      }
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    // Try to get current URL from iframe (only works for same-origin)
    try {
      if (iframeRef.current?.contentWindow?.location?.href) {
        const newUrl = iframeRef.current.contentWindow.location.href;
        if (newUrl !== "about:blank" && newUrl !== currentUrl) {
          setCurrentUrl(newUrl);
          setInputUrl(newUrl);
          // Add to history if different
          if (history[historyIndex] !== newUrl) {
            setHistory((prev) => [...prev.slice(0, historyIndex + 1), newUrl]);
            setHistoryIndex((prev) => prev + 1);
          }
        }
      }
    } catch {
      // Cross-origin, can't access - that's fine
    }
  };

  const handleUrlSubmit = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      navigateTo(inputUrl);
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleUrlFocus = () => {
    setIsInputFocused(true);
  };

  const handleUrlBlur = () => {
    setIsInputFocused(false);
    setInputUrl(currentUrl); // Reset to current if not submitted
  };

  // Parse URL for display
  const getUrlDisplay = () => {
    try {
      const url = new URL(currentUrl);
      return {
        protocol: url.protocol,
        host: url.host,
        path: url.pathname + url.search + url.hash,
        isSecure: url.protocol === "https:",
      };
    } catch {
      return { protocol: "http:", host: currentUrl, path: "", isSecure: false };
    }
  };

  const urlParts = getUrlDisplay();

  return (
    <div
      className={cn(
        "flex flex-col",
        isFullscreen
          ? "fixed inset-0 z-50 bg-background"
          : "h-[calc(100vh-8rem)]"
      )}
    >
      {/* Browser-like header bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-t-xl shrink-0">
        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleBack}
            disabled={!canGoBack}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              canGoBack
                ? "hover:bg-muted text-foreground"
                : "text-muted-foreground/40 cursor-not-allowed"
            )}
            title="Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleForward}
            disabled={!canGoForward}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              canGoForward
                ? "hover:bg-muted text-foreground"
                : "text-muted-foreground/40 cursor-not-allowed"
            )}
            title="Forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleRefresh}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw
              className={cn(
                "w-4 h-4 text-muted-foreground",
                isLoading && "animate-spin"
              )}
            />
          </button>
        </div>

        {/* URL Bar */}
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-muted/50 border border-border rounded-lg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
          {/* Security/status indicator */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isLoading ? (
              <div className="w-3 h-3 rounded-full bg-warning animate-pulse" />
            ) : urlParts.isSecure ? (
              <Lock className="w-3.5 h-3.5 text-success" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>

          {/* URL Input */}
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleUrlSubmit}
            onFocus={handleUrlFocus}
            onBlur={handleUrlBlur}
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Enter URL..."
          />

          {/* App name badge */}
          {!isInputFocused && (
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
              {app.name}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            <Maximize2 className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={handleOpenExternal}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Iframe container */}
      <div className="flex-1 relative bg-white rounded-b-xl overflow-hidden border-x border-b border-border">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Loading {app.name}...</p>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={currentUrl}
          className="w-full h-full border-0"
          onLoad={handleIframeLoad}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation"
          title={app.name}
        />
      </div>
    </div>
  );
}
