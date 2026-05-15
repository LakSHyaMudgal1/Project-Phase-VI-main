// Components/Search/FocusModeWarning.jsx
// Soft, non-blocking yellow banner shown when user searches off-topic content
// while inside a study room. Never blocks the user.
import React from "react";
import { useSearch } from "../../context/SearchContext";

const STUDY_KEYWORDS = [
  "study","learn","tutorial","docs","documentation","course","lecture",
  "homework","assignment","exam","research","paper","algorithm","code",
  "programming","math","science","history","language","javascript","python",
  "java","react","node","css","html","sql","data structure","machine learning",
  "physics","chemistry","biology","economics","engineering","calculus","linear",
  "function","class","array","loop","recursion","database","network","operating",
  "compiler","syntax","debug","error","stack","queue","tree","graph","sort",
];

function isStudyQuery(q) {
  const lower = q.toLowerCase();
  return STUDY_KEYWORDS.some((kw) => lower.includes(kw));
}

export default function FocusModeWarning() {
  const { query, results, focusWarningDismissed, dismissFocusWarning } = useSearch();

  const inRoom = window.location.pathname.includes("/room/");
  const shouldShow =
    inRoom &&
    query.trim().length > 0 &&
    results.length > 0 &&
    !isStudyQuery(query) &&
    !focusWarningDismissed;

  if (!shouldShow) return null;

  return (
    <div className="mx-2 mt-2 flex items-start gap-3 px-4 py-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10">
      {/* Warning icon */}
      <svg className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinejoin="round" />
        <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
        <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
      </svg>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-yellow-300">Focus session active</p>
        <p className="text-xs text-yellow-200/80 mt-0.5">
          This search may be unrelated to your study session. Continue anyway?
        </p>
      </div>

      <button
        onClick={dismissFocusWarning}
        className="flex-shrink-0 h-5 w-5 rounded-md bg-yellow-500/20 hover:bg-yellow-500/30 flex items-center justify-center transition"
        title="Dismiss"
      >
        <svg className="w-3 h-3 text-yellow-300" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
