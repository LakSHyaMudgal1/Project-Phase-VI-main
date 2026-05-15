// Components/Search/SearchInput.jsx
import React, { useEffect, useRef } from "react";
import { useSearch } from "../../context/SearchContext";

export default function SearchInput() {
  const { query, setQuery, search, activeFilter } = useSearch();
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Auto-focus when mounted (overlay just opened)
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    // Debounce search by 400ms
    clearTimeout(debounceRef.current);
    if (val.trim()) {
      debounceRef.current = setTimeout(() => {
        search(val.trim(), activeFilter);
      }, 400);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && query.trim()) {
      clearTimeout(debounceRef.current);
      search(query.trim(), activeFilter);
    }
    // Let Esc / Arrow keys bubble up to the global handler in SearchContext
  };

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="flex items-center gap-3 px-4 border-b border-white/10">
      {/* Search icon */}
      <svg
        className="w-5 h-5 text-mutedForeground flex-shrink-0"
        fill="none" stroke="currentColor" strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" strokeLinecap="round" />
      </svg>

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Search the web…"
        className="flex-1 h-14 bg-transparent text-base text-foreground placeholder:text-mutedForeground focus:outline-none"
        autoComplete="off"
        spellCheck={false}
      />

      {/* Clear button */}
      {query && (
        <button
          onClick={handleClear}
          className="flex-shrink-0 h-6 w-6 rounded-lg bg-white/10 hover:bg-white/20 transition flex items-center justify-center text-mutedForeground hover:text-foreground"
          title="Clear"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
