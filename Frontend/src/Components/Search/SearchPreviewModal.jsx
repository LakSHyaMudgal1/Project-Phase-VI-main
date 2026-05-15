// Components/Search/SearchPreviewModal.jsx
// Full-screen iframe preview modal — z-[300], rendered via React Portal.
// If the site blocks iframe embedding, shows a friendly fallback.
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useSearch } from "../../context/SearchContext";

export default function SearchPreviewModal() {
  const { previewUrl, closePreview } = useSearch();
  const iframeRef = useRef(null);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Reset state whenever the URL changes
  useEffect(() => {
    setBlocked(false);
    setLoading(true);
  }, [previewUrl]);

  if (!previewUrl) return null;

  const handleLoad = () => {
    setLoading(false);
    // Try to detect X-Frame-Options block by checking contentDocument access
    try {
      // If cross-origin block, this throws
      const doc = iframeRef.current?.contentDocument;
      if (!doc || doc.body?.innerHTML === "") {
        setBlocked(true);
      }
    } catch {
      setBlocked(true);
    }
  };

  const handleError = () => {
    setLoading(false);
    setBlocked(true);
  };

  const openExternal = () => window.open(previewUrl, "_blank", "noopener,noreferrer");

  const content = (
    <div className="fixed inset-0 z-[300] flex flex-col bg-[hsl(222,47%,5%)]">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/3 flex-shrink-0">
        {/* Back / close */}
        <button
          onClick={closePreview}
          className="flex items-center gap-1.5 text-xs text-mutedForeground hover:text-foreground transition px-2 py-1.5 rounded-xl hover:bg-white/5"
          title="Back to search"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>

        {/* URL bar */}
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 min-w-0">
          <svg className="w-3.5 h-3.5 text-mutedForeground flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeLinecap="round" />
          </svg>
          <span className="text-xs text-mutedForeground truncate flex-1">{previewUrl}</span>
        </div>

        {/* Open in new tab */}
        <button
          onClick={openExternal}
          className="flex items-center gap-1.5 text-xs text-mutedForeground hover:text-foreground transition px-2 py-1.5 rounded-xl hover:bg-white/5 flex-shrink-0"
          title="Open in new tab"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round" />
          </svg>
          New tab
        </button>

        {/* Close */}
        <button
          onClick={closePreview}
          className="flex-shrink-0 h-8 w-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition"
          title="Close preview"
        >
          <svg className="w-4 h-4 text-mutedForeground" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 relative overflow-hidden">
        {/* Loading spinner */}
        {loading && !blocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-[hsl(222,47%,5%)] z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-xs text-mutedForeground">Loading preview…</p>
            </div>
          </div>
        )}

        {/* Blocked fallback */}
        {blocked ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-center px-6">
            <div className="h-16 w-16 rounded-3xl bg-white/5 border border-white/10 grid place-items-center text-3xl">
              🔒
            </div>
            <div>
              <p className="text-base font-semibold">This site can't be previewed here.</p>
              <p className="text-sm text-mutedForeground mt-1">
                The website blocks embedding for security reasons.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={openExternal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary text-primaryForeground text-sm font-medium hover:opacity-90 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round" />
                </svg>
                Open in new tab
              </button>
              <button
                onClick={closePreview}
                className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-sm text-mutedForeground hover:bg-white/10 transition"
              >
                Back to search
              </button>
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={previewUrl}
            title="Search result preview"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            onLoad={handleLoad}
            onError={handleError}
          />
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}
