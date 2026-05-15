// context/SearchContext.jsx
// GlobalSearchProvider — owns all search state and the single global keyboard listener.
// Renders nothing itself; overlay and preview modal are mounted separately via portals.

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../utils/constants";

const SearchContext = createContext(null);

const LS_KEY = "tabtrack_recent_searches";
const MAX_RECENT = 10;

function loadRecent() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecent(arr) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch {}
}

export function GlobalSearchProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQueryState] = useState("");
  const [results, setResults] = useState([]);
  const [answer, setAnswer] = useState(null);       // AI summary from Tavily
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [recentSearches, setRecentSearches] = useState(loadRecent);
  const [focusWarningDismissed, setFocusWarningDismissed] = useState(false);

  // Keep a ref to the latest results/selectedIndex for use inside the keyboard handler
  const stateRef = useRef({});
  stateRef.current = { isOpen, results, selectedIndex };

  // ── Actions ──────────────────────────────────────────────────────────────

  const openSearch = () => {
    setIsOpen(true);
    setSelectedIndex(-1);
    setFocusWarningDismissed(false);
  };

  const closeSearch = () => {
    setIsOpen(false);
    setResults([]);
    setAnswer(null);
    setLoading(false);
    setError(null);
    setSelectedIndex(-1);
    setPreviewUrl(null);
    // recentSearches and activeFilter are preserved
  };

  const setQuery = (q) => setQueryState(q);

  const setFilter = (f) => {
    setActiveFilter(f);
  };

  const openPreview = (url) => setPreviewUrl(url);
  const closePreview = () => setPreviewUrl(null);

  const dismissFocusWarning = () => setFocusWarningDismissed(true);

  // ── Recent searches ───────────────────────────────────────────────────────

  const addRecent = (q) => {
    if (!q.trim()) return;
    setRecentSearches((prev) => {
      const lower = q.toLowerCase();
      // Remove existing duplicate (case-insensitive), then prepend
      const filtered = prev.filter((s) => s.toLowerCase() !== lower);
      const next = [q, ...filtered].slice(0, MAX_RECENT);
      saveRecent(next);
      return next;
    });
  };

  const removeRecent = (q) => {
    setRecentSearches((prev) => {
      const next = prev.filter((s) => s !== q);
      saveRecent(next);
      return next;
    });
  };

  const clearRecent = () => {
    setRecentSearches([]);
    saveRecent([]);
  };

  // ── Search ────────────────────────────────────────────────────────────────

  const search = async (q, filter) => {
    const trimmed = (q || "").trim();
    if (!trimmed) return;

    const f = filter || activeFilter || "all";

    console.log(`[Search] Calling /api/search?q=${encodeURIComponent(trimmed)}&filter=${f}`);

    setLoading(true);
    setError(null);
    setResults([]);
    setAnswer(null);
    setSelectedIndex(-1);

    try {
      const res = await axios.get(`${BASE_URL}/api/search`, {
        params: { q: trimmed, filter: f },
        withCredentials: true,
      });

      console.log("[Search] Response received:", res.data);

      if (res.data.error) {
        setError(res.data.error);
      } else {
        setResults(res.data.results || []);
        setAnswer(res.data.answer || null);
        addRecent(trimmed);
      }
    } catch (err) {
      const msg = err.response?.data?.error
        || err.response?.data
        || err.message
        || "Search failed. Please try again.";
      console.error("[Search] Error:", msg);
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  // ── Global keyboard listener ──────────────────────────────────────────────
  // Registered once; uses stateRef to avoid stale closures.

  useEffect(() => {
    const handler = (e) => {
      const { isOpen, results, selectedIndex } = stateRef.current;
      const tag = document.activeElement?.tagName;
      const isTyping =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        document.activeElement?.hasAttribute("data-keybinding-context") ||
        document.activeElement?.closest("[data-keybinding-context]");

      // Ctrl+G / Ctrl+K — open search (guard: not while typing)
      if (e.ctrlKey && (e.key === "g" || e.key === "k")) {
        if (!isTyping) {
          e.preventDefault();
          setIsOpen(true);
          setSelectedIndex(-1);
          setFocusWarningDismissed(false);
        }
        return;
      }

      // Only handle remaining shortcuts when overlay is open
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        closeSearch();
        return;
      }

      if (e.key === "ArrowDown" && results.length > 0) {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % results.length);
        return;
      }

      if (e.key === "ArrowUp" && results.length > 0) {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + results.length) % results.length);
        return;
      }

      if (e.key === "Enter" && selectedIndex >= 0 && results[selectedIndex]) {
        e.preventDefault();
        setPreviewUrl(results[selectedIndex].link);
        return;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []); // empty deps — stateRef always has latest values

  const value = {
    isOpen, query, results, answer, loading, error,
    activeFilter, selectedIndex, previewUrl,
    recentSearches, focusWarningDismissed,
    openSearch, closeSearch,
    setQuery, setFilter,
    search,
    openPreview, closePreview,
    clearRecent, removeRecent,
    dismissFocusWarning,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used inside GlobalSearchProvider");
  return ctx;
}
