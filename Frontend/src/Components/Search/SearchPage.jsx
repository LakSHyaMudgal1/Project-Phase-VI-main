// Components/Search/SearchPage.jsx
// Dedicated /search route — full-page web search experience.
// URL is bookmarkable: /search?q=javascript+promises&filter=all
import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useSearch } from "../../context/SearchContext";
import SearchFilters from "./SearchFilters";
import SearchResultCard from "./SearchResultCard";
import AIAnswerCard from "./AIAnswerCard";

function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-4 animate-pulse space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-sm bg-white/10" />
        <div className="h-2.5 bg-white/10 rounded w-1/3" />
      </div>
      <div className="h-4 bg-white/10 rounded w-3/4" />
      <div className="space-y-1.5">
        <div className="h-2.5 bg-white/10 rounded w-full" />
        <div className="h-2.5 bg-white/10 rounded w-5/6" />
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    query, setQuery, search, setFilter,
    results, answer, loading, error, activeFilter,
  } = useSearch();

  // On mount / URL change — read params and execute search
  useEffect(() => {
    const q = searchParams.get("q") || "";
    const f = searchParams.get("filter") || "all";
    if (q) {
      setQuery(q);
      setFilter(f);
      search(q, f);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchParams({ q: query.trim(), filter: activeFilter });
    search(query.trim(), activeFilter);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Web Search</h1>
        <p className="text-sm text-mutedForeground mt-1">
          Real web results powered by Tavily — stay focused inside TabTrack.
        </p>
      </div>

      {/* Search input */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 flex items-center gap-3 h-12 px-4 glass rounded-2xl border border-white/10">
          <svg className="w-4 h-4 text-mutedForeground flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the web…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-mutedForeground focus:outline-none"
            autoComplete="off"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")}
              className="text-mutedForeground hover:text-foreground transition">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
        <button
          type="submit"
          className="h-12 px-5 rounded-2xl bg-primary text-primaryForeground text-sm font-medium hover:opacity-90 transition"
        >
          Search
        </button>
      </form>

      {/* Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {[
          { value: "all", label: "All" },
          { value: "docs", label: "Docs" },
          { value: "youtube", label: "YouTube" },
          { value: "stackoverflow", label: "Stack Overflow" },
          { value: "geeksforgeeks", label: "GeeksforGeeks" },
          { value: "mdn", label: "MDN" },
          { value: "research", label: "Research" },
        ].map(({ value, label }) => {
          const active = activeFilter === value;
          return (
            <button
              key={value}
              onClick={() => {
                setFilter(value);
                if (query.trim()) {
                  setSearchParams({ q: query.trim(), filter: value });
                  search(query.trim(), value);
                }
              }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                active
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "bg-white/5 border-white/10 text-mutedForeground hover:bg-white/10 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
            <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
          </svg>
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && query.trim() && results.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-base font-medium">No results for "{query}"</p>
          <p className="text-sm text-mutedForeground mt-1">Try different keywords or remove the filter.</p>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="space-y-4">
          {/* AI answer */}
          {answer && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                </svg>
                <span className="text-xs font-semibold text-primary">AI Answer</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{answer}</p>
            </div>
          )}

          <p className="text-xs text-mutedForeground">
            {results.length} web result{results.length !== 1 ? "s" : ""}
          </p>

          {/* 2-column grid on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.map((result, i) => (
              <div key={result.link + i} className="glass rounded-2xl overflow-hidden">
                <SearchResultCard
                  result={result}
                  isSelected={false}
                  resultRef={null}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
