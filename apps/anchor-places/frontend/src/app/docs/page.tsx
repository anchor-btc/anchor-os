'use client';

import { useEffect } from 'react';

export default function DocsPage() {
  useEffect(() => {
    // Redirect to the centralized Anchor Docs
    window.location.href = 'https://docs.anchor-protocol.com/kinds/geomarker.html';
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-400">Redirecting to Anchor Documentation...</p>
        <p className="text-gray-500 text-sm mt-2">
          <a
            href="https://docs.anchor-protocol.com/kinds/geomarker.html"
            className="text-primary hover:underline"
          >
            Click here if you are not redirected automatically
          </a>
        </p>
      </div>
    </div>
  );
}
