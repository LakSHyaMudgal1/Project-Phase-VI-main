// Components/Search/RecentSearches.jsx
import React from "react";
import { useSearch } from "../../context/SearchContext";

export default function RecentSearches() {
  const { query, recentSearches, setQuery, search, activeFilter, removeRecent, clearRecent } = useSearch();

  // Only show when input is empty and there are recent searches
  if (query.trim() || recentSearches.length === 0) return null;

  const handleClick = (entry) => {
    setQuery(entry);
    search(entry, activeFilter);
  };

  return (
    <div className="py-2">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-1.5">
        <span className="text-[11px] font-semibold text-mutedForeground uppercase tracking-wider">
          Recent
        </span>
        <button
          onClick={clearRecent}
          className="text-[11px] text-mutedForeground hover:text-foreground transition"
        >
          Clear all
        </button>
      </div>

      {/* Entries */}
      {recentSearches.map((entry) => (
        <div
          key={entry}
          className="flex items-center gap-3 px-4 py-2 mx-2 rounded-xl hover:bg-white/5 transition group cursor-pointer"
          onClick={() => handleClick(entry)}
        >
          {/* Clock icon */}
          <svg className="w-3.5 h-3.5 text-mutedForeground flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <span className="flex-1 text-sm text-foreground truncate">{entry}</span>

          {/* Remove button */}
          <button
            onClick={(e) => { e.stopPropagation(); removeRecent(entry); }}
            className="opacity-0 group-hover:opacity-100 transition h-5 w-5 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center flex-shrink-0"
            title="Remove"
          >
            <svg className="w-3 h-3 text-mutedForeground" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
