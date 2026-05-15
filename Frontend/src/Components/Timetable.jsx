// Components/Timetable.jsx
// Student-facing weekly timetable view — read-only.
import React, { useEffect, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import Card from "./ui/Card";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TYPE_STYLES = {
  "class":           { bg: "bg-primary/15 text-primary border-primary/30",          icon: "📚" },
  "meeting":         { bg: "bg-purple-500/15 text-purple-300 border-purple-500/30",  icon: "📹" },
  "doubt session":   { bg: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",  icon: "❓" },
  "coding session":  { bg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: "💻" },
  "other":           { bg: "bg-white/10 text-mutedForeground border-white/10",       icon: "📌" },
};

function TypeBadge({ type }) {
  const s = TYPE_STYLES[type] || TYPE_STYLES.other;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.bg}`}>
      {s.icon} {type}
    </span>
  );
}

function EntryCard({ entry, isToday }) {
  return (
    <div className={`rounded-2xl border p-3 flex flex-col gap-2 transition-all ${
      isToday
        ? "border-primary/40 bg-primary/5"
        : "border-white/10 bg-white/3 hover:bg-white/5"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">{entry.title}</p>
          {entry.subject && (
            <p className="text-[11px] text-mutedForeground mt-0.5">{entry.subject}</p>
          )}
        </div>
        <TypeBadge type={entry.type} />
      </div>

      <div className="flex items-center gap-2 text-xs text-mutedForeground">
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14" strokeLinecap="round"/>
          </svg>
          {entry.startTime} – {entry.endTime}
        </span>
        {entry.teacherName && (
          <>
            <span className="text-white/20">·</span>
            <span>{entry.teacherName}</span>
          </>
        )}
      </div>

      {entry.description && (
        <p className="text-[11px] text-mutedForeground leading-relaxed line-clamp-2">
          {entry.description}
        </p>
      )}

      {entry.meetingLink && (
        <a
          href={entry.meetingLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 self-start text-xs font-medium px-3 py-1.5 rounded-xl bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3" strokeLinecap="round"/>
          </svg>
          Join Meeting
        </a>
      )}
    </div>
  );
}

export default function Timetable() {
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeDay, setActiveDay] = useState(() =>
    new Date().toLocaleDateString("en-US", { weekday: "long" })
  );

  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });

  useEffect(() => {
    axios
      .get(`${BASE_URL}/api/timetable/week`, { withCredentials: true })
      .then((res) => { setGrouped(res.data.grouped || {}); })
      .catch((err) => setError(err.response?.data?.message || "Failed to load timetable."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-white/5 rounded-2xl animate-pulse w-48" />
        <div className="grid grid-cols-7 gap-3">
          {DAYS.map((d) => (
            <div key={d} className="h-40 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
        {error}
      </div>
    );
  }

  const activeDayEntries = grouped[activeDay] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Weekly Timetable</h1>
          <p className="text-sm text-mutedForeground mt-1">
            Today is <span className="text-foreground font-medium">{today}</span>
          </p>
        </div>
      </div>

      {/* Today's highlight */}
      {(grouped[today] || []).length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
            <span className="text-sm font-semibold">Today's Schedule</span>
            <span className="text-xs text-mutedForeground">— {today}</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(grouped[today] || []).map((entry) => (
              <EntryCard key={entry._id} entry={entry} isToday />
            ))}
          </div>
        </Card>
      )}

      {/* Day tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {DAYS.map((day) => {
          const count = (grouped[day] || []).length;
          const isActive = activeDay === day;
          const isToday = day === today;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`flex-shrink-0 flex flex-col items-center px-4 py-2 rounded-2xl text-xs font-medium border transition-all ${
                isActive
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : isToday
                  ? "bg-green-500/10 border-green-500/30 text-green-300"
                  : "bg-white/5 border-white/10 text-mutedForeground hover:bg-white/10 hover:text-foreground"
              }`}
            >
              <span>{day.slice(0, 3)}</span>
              {count > 0 && (
                <span className={`mt-0.5 text-[9px] px-1.5 py-0.5 rounded-full ${
                  isActive ? "bg-primary/30" : "bg-white/10"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day entries */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-mutedForeground uppercase tracking-wider">
          {activeDay}
          {activeDay === today && (
            <span className="ml-2 text-[10px] text-green-400 normal-case font-normal">Today</span>
          )}
        </h2>

        {activeDayEntries.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-3xl mb-2">📅</div>
            <p className="text-sm text-mutedForeground">No sessions scheduled for {activeDay}.</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeDayEntries.map((entry) => (
              <EntryCard key={entry._id} entry={entry} isToday={activeDay === today} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
