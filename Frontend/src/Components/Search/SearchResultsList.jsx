// Components/Search/SearchResultsList.jsx
import React, { useEffect, useRef } from "react";
import { useSearch } from "../../context/SearchContext";
import SearchResultCard from "./SearchResultCard";
import AIAnswerCard from "./AIAnswerCard";

// Skeleton placeholder while loading
function SkeletonCard() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 mx-2 animate-pulse">
      <div className="w-4 h-4 rounded-sm bg-white/10 flex-shrink-0 mt-1" />
      <div className="flex-1 space-y-2">
        <div className="h-2.5 bg-white/10 rounded w-1/4" />
        <div className="h-3.5 bg-white/10 rounded w-3/4" />
        <div className="h-2.5 bg-white/10 rounded w-full" />
        <div className="h-2.5 bg-white/10 rounded w-2/3" />
      </div>
      <div className="w-16 h-12 rounded-lg bg-white/10 flex-shrink-0" />
    </div>
  );
}

export default function SearchResultsList() {
  const { results, answer, loading, error, query, selectedIndex } = useSearch();
  const cardRefs = useRef([]);

  // Auto-scroll selected card into view
  useEffect(() => {
    if (selectedIndex >= 0 && cardRefs.current[selectedIndex]) {
      cardRefs.current[selectedIndex].scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  // Loading state
  if (loading) {
    return (
      <div className="overflow-y-auto max-h-[55vh] py-2">
        {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="px-4 py-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-300 max-w-md">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
            <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // Empty state — only show after a query was made
  if (query.trim() && results.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <div className="text-3xl mb-3">🔍</div>
        <p className="text-sm font-medium text-foreground">No results for "{query}"</p>
        <p className="text-xs text-mutedForeground mt-1">
          Try different keywords or remove the filter.
        </p>
      </div>
    );
  }

  // Results
  if (results.length > 0) {
    return (
      <div className="overflow-y-auto max-h-[55vh] py-2">
        {/* AI answer card at top */}
        <AIAnswerCard answer={answer} />

        {/* Result count */}
        <p className="px-4 pt-2 pb-1 text-[10px] text-mutedForeground">
          {results.length} web result{results.length !== 1 ? "s" : ""}
        </p>

        {results.map((result, i) => (
          <SearchResultCard
            key={result.link + i}
            result={result}
            isSelected={i === selectedIndex}
            resultRef={(el) => { cardRefs.current[i] = el; }}
          />
        ))}
      </div>
    );
  }

  return null;
}
