// Components/Search/GlobalSearchOverlay.jsx
// Zen Browser-style floating search overlay — rendered via React Portal, z-[200].
// Completely outside the Room component tree — never interrupts video/chat/editor.
import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { useSearch } from "../../context/SearchContext";
import SearchInput from "./SearchInput";
import SearchFilters from "./SearchFilters";
import RecentSearches from "./RecentSearches";
import FocusModeWarning from "./FocusModeWarning";
import SearchResultsList from "./SearchResultsList";

export default function GlobalSearchOverlay() {
  const { isOpen, closeSearch, query } = useSearch();
  const panelRef = useRef(null);

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) closeSearch();
  };

  // Trap focus inside the panel while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.activeElement;
    return () => prev?.focus?.();
  }, [isOpen]);

  if (!isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center px-4"
      style={{ paddingTop: "12vh", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={handleBackdropClick}
    >
      {/* Panel */}
      <div
        ref={panelRef}
        className="w-full max-w-[680px] rounded-3xl border border-white/10 shadow-glass overflow-hidden"
        style={{
          background: "hsl(222,47%,7%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          animation: "searchSlideIn 0.15s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <SearchInput />

        {/* Filter pills */}
        <SearchFilters />

        {/* Content area — recent searches OR results */}
        <div>
          <RecentSearches />
          <FocusModeWarning />
          <SearchResultsList />
        </div>

        {/* Keyboard hint footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/10">
          <div className="flex items-center gap-4 text-[10px] text-mutedForeground">
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> open</span>
            <span><kbd className="font-mono">Esc</kbd> close</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-mutedForeground">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            <span>Powered by Tavily</span>
          </div>
        </div>
      </div>

      {/* Inline animation keyframe */}
      <style>{`
        @keyframes searchSlideIn {
          from { opacity: 0; transform: scale(0.96) translateY(-8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}
