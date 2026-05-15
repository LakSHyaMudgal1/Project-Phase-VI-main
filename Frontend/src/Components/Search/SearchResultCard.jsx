// Components/Search/SearchResultCard.jsx
import React, { useRef } from "react";
import { useSearch } from "../../context/SearchContext";

// Fallback globe icon when favicon fails to load
function GlobeIcon() {
  return (
    <svg className="w-4 h-4 text-mutedForeground" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeLinecap="round" />
    </svg>
  );
}

export default function SearchResultCard({ result, isSelected, resultRef }) {
  const { openPreview } = useSearch();
  const faviconErrorRef = useRef(false);
  const [faviconFailed, setFaviconFailed] = React.useState(false);

  return (
    <div
      ref={resultRef}
      onClick={() => openPreview(result.link)}
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-all rounded-xl mx-2 my-0.5 ${
        isSelected
          ? "bg-white/10 ring-1 ring-primary/40"
          : "hover:bg-white/5"
      }`}
    >
      {/* Favicon */}
      <div className="flex-shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center">
        {faviconFailed ? (
          <GlobeIcon />
        ) : (
          <img
            src={result.favicon}
            alt=""
            width={16}
            height={16}
            className="w-4 h-4 rounded-sm"
            onError={() => setFaviconFailed(true)}
          />
        )}
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-mutedForeground truncate mb-0.5">
          {result.displayLink}
        </p>
        <p className="text-sm font-medium text-foreground leading-snug line-clamp-1">
          {result.title}
        </p>
        <p className="text-xs text-mutedForeground mt-1 line-clamp-2 leading-relaxed">
          {result.snippet}
        </p>
      </div>

      {/* Thumbnail */}
      {result.thumbnail && (
        <div className="flex-shrink-0 ml-2">
          <img
            src={result.thumbnail}
            alt=""
            className="w-16 h-12 rounded-lg object-cover border border-white/10"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </div>
      )}

      {/* External link indicator */}
      <div className="flex-shrink-0 mt-0.5">
        <svg className="w-3.5 h-3.5 text-mutedForeground/50" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
