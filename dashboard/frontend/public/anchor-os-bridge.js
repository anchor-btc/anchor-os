/**
 * Anchor OS Bridge Script
 *
 * Include this script in your app to enable URL synchronization
 * with the Anchor OS dashboard when running inside the iframe.
 *
 * Usage: Add to your app's HTML or Next.js _document.tsx:
 * <script src="http://localhost:8000/anchor-os-bridge.js"></script>
 *
 * Or dynamically:
 * const script = document.createElement('script');
 * script.src = 'http://localhost:8000/anchor-os-bridge.js';
 * document.head.appendChild(script);
 */

(function () {
  'use strict';

  // Only run if we're in an iframe
  if (window.self === window.top) {
    return;
  }

  // Dashboard origin (adjust if needed)
  const DASHBOARD_ORIGIN = 'http://localhost:8000';

  // Send current URL to parent
  function sendUrlToParent() {
    try {
      window.parent.postMessage(
        {
          type: 'anchor-url-change',
          url: window.location.href,
        },
        DASHBOARD_ORIGIN
      );
    } catch (e) {
      // Ignore errors
    }
  }

  // Send initial URL
  sendUrlToParent();

  // Listen for popstate (back/forward navigation)
  window.addEventListener('popstate', sendUrlToParent);

  // Override pushState and replaceState to catch SPA navigation
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function () {
    originalPushState.apply(this, arguments);
    sendUrlToParent();
  };

  history.replaceState = function () {
    originalReplaceState.apply(this, arguments);
    sendUrlToParent();
  };

  // Also listen for hashchange
  window.addEventListener('hashchange', sendUrlToParent);

  // For Next.js and other SPAs, also watch for URL changes periodically
  let lastUrl = window.location.href;
  setInterval(function () {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      sendUrlToParent();
    }
  }, 500);

  console.log('[Anchor OS Bridge] Initialized - URL sync enabled');
})();
