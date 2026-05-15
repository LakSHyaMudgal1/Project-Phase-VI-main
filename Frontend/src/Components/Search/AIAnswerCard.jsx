// Components/Search/AIAnswerCard.jsx
// Shows the AI-generated summary from Tavily at the top of results.
import React, { useState } from "react";

export default function AIAnswerCard({ answer }) {
  const [expanded, setExpanded] = useState(false);

  if (!answer) return null;

  const isLong = answer.length > 220;
  const displayText = isLong && !expanded ? answer.slice(0, 220) + "…" : answer;

  return (
    <div className="mx-2 mt-2 mb-1 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        {/* Sparkle icon */}
        <svg className="w-4 h-4 text-primary flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
        </svg>
        <span className="text-xs font-semibold text-primary">AI Answer</span>
      </div>
      <p className="text-sm text-foreground leading-relaxed">
        {displayText}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-[11px] text-primary hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
