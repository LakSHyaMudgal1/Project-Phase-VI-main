// Components/Search/SearchFilters.jsx
import React from "react";
import { useSearch } from "../../context/SearchContext";

const FILTERS = [
  { value: "all",           label: "All" },
  { value: "docs",          label: "Docs" },
  { value: "youtube",       label: "YouTube" },
  { value: "stackoverflow", label: "Stack Overflow" },
  { value: "geeksforgeeks", label: "GeeksforGeeks" },
  { value: "mdn",           label: "MDN" },
  { value: "research",      label: "Research" },
];

export default function SearchFilters() {
  const { activeFilter, setFilter, query, search } = useSearch();

  const handleClick = (value) => {
    setFilter(value);
    if (query.trim()) {
      search(query.trim(), value);
    }
  };

  return (
    <div className="flex items-center gap-1.5 px-4 py-2.5 overflow-x-auto scrollbar-none border-b border-white/10">
      {FILTERS.map(({ value, label }) => {
        const active = activeFilter === value;
        return (
          <button
            key={value}
            onClick={() => handleClick(value)}
            className={`flex-shrink-0 px-3 py-1 rounded-xl text-xs font-medium border transition-all ${
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
  );
}
