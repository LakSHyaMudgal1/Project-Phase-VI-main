import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import Card from "./ui/Card";
import Button from "./ui/Button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie,
} from "recharts";

/* ── helpers ─────────────────────────────────────────── */
const fmt = (sec) => {
  const s = Number(sec) || 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
};

const getDomain = (url) => {
  try { return url.startsWith("http") ? new URL(url).hostname.replace(/^www\./, "") : url; }
  catch { return url; }
};

const getFavicon = (url) => `https://www.google.com/s2/favicons?domain=${getDomain(url)}&sz=64`;

const COLORS = ["#4f8ef7","#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#06b6d4"];

const TIP_STYLE = {
  backgroundColor: "#0d1117", border: "1px solid #2a3140", borderRadius: "12px",
  color: "#e6edf3", fontSize: "12px", padding: "10px 14px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};

/* ── favicon ─────────────────────────────────────────── */
const Favicon = ({ url, size = 18 }) => {
  const [err, setErr] = useState(false);
  if (err) return (
    <div style={{ width: size, height: size }}
      className="rounded-md bg-white/10 border border-white/10 grid place-items-center text-[9px] font-bold text-mutedForeground flex-shrink-0">
      {getDomain(url)?.[0]?.toUpperCase() || "?"}
    </div>
  );
  return <img src={getFavicon(url)} alt="" width={size} height={size} className="rounded-md flex-shrink-0" onError={() => setErr(true)} />;
};

/* ── chart tooltips ──────────────────────────────────── */
const BarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={TIP_STYLE} className="flex items-center gap-2">
      <Favicon url={d.url} size={16} />
      <div>
        <p className="font-semibold">{getDomain(d.url)}</p>
        <p style={{ color: payload[0].fill }}>{fmt(d.seconds)}</p>
        <p className="text-mutedForeground text-[11px]">{d.sessions} sessions</p>
      </div>
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={TIP_STYLE} className="flex items-center gap-2">
      {d.payload.url && <Favicon url={d.payload.url} size={16} />}
      <div>
        <p className="font-semibold">{d.name}</p>
        <p style={{ color: d.fill }}>{fmt(d.value)}</p>
        <p className="text-mutedForeground text-[11px]">{d.payload.pct}% of total</p>
      </div>
    </div>
  );
};

const FaviconTick = ({ x, y, payload }) => (
  <foreignObject x={x - 10} y={y + 4} width={20} height={20}>
    <Favicon url={payload?.value} size={18} />
  </foreignObject>
);

/* ── AI score ring ───────────────────────────────────── */
const ScoreRing = ({ score }) => {
  const r = 36, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={90} height={90} className="flex-shrink-0">
      <circle cx={45} cy={45} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={7} />
      <circle cx={45} cy={45} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 45 45)" style={{ transition: "stroke-dasharray 1s ease" }} />
      <text x={45} y={49} textAnchor="middle" fill={color} fontSize={18} fontWeight={700}>{score}</text>
    </svg>
  );
};

const insightStyle = {
  warning: { bg: "bg-amber-500/10",  border: "border-amber-500/30",  text: "text-amber-300",  icon: "⚠️" },
  tip:     { bg: "bg-blue-500/10",   border: "border-blue-500/30",   text: "text-blue-300",   icon: "💡" },
  positive:{ bg: "bg-emerald-500/10",border: "border-emerald-500/30",text: "text-emerald-300",icon: "✅" },
};

/* ── AI panel ────────────────────────────────────────── */
const AIInsightsPanel = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true); setError("");
    try {
      const res = await axios.post(`${BASE_URL}/analytics/ai-insights`, {}, { withCredentials: true });
      setInsights(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to generate insights.";
      setError(typeof msg === "string" ? msg : "Failed to generate insights.");
    } finally { setLoading(false); }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold flex items-center gap-2">✨ AI Insights</p>
          <p className="text-xs text-mutedForeground mt-0.5">Powered by Gemini</p>
        </div>
        <Button variant="secondary" size="sm" onClick={generate} disabled={loading}>
          {loading ? "Analyzing…" : insights ? "Regenerate" : "Analyze my usage"}
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-3 py-8 text-mutedForeground">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm">Gemini is analyzing your browsing patterns…</p>
        </div>
      )}

      {insights && !loading && (
        <div className="space-y-4">
          {/* Score + summary */}
          <div className="flex items-center gap-5 p-4 rounded-2xl bg-white/5 border border-white/10">
            <ScoreRing score={insights.productivityScore} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="text-sm font-semibold">Productivity Score</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-mutedForeground">{insights.topCategory}</span>
              </div>
              <p className="text-sm text-mutedForeground leading-relaxed">{insights.summary}</p>
            </div>
          </div>

          {/* Insight cards */}
          <div className="grid sm:grid-cols-2 gap-3">
            {insights.insights?.map((ins, i) => {
              const s = insightStyle[ins.type] || insightStyle.tip;
              return (
                <div key={i} className={`rounded-2xl border p-4 ${s.bg} ${s.border}`}>
                  <p className={`text-xs font-semibold mb-1 flex items-center gap-1.5 ${s.text}`}>
                    <span>{s.icon}</span>{ins.title}
                  </p>
                  <p className="text-xs text-mutedForeground leading-relaxed">{ins.detail}</p>
                </div>
              );
            })}
          </div>

          {/* Recommendation */}
          <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3">
            <p className="text-xs font-semibold text-primary mb-1">🎯 Recommendation</p>
            <p className="text-sm text-foreground leading-relaxed">{insights.focusRecommendation}</p>
          </div>
        </div>
      )}
    </Card>
  );
};

/* ── main component ──────────────────────────────────── */
const Analytics = () => {
  const [data, setData] = useState({ tabs: [], timeIntervals: [], syncedAt: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const fetchAnalytics = async (bg = false) => {
    try {
      if (!bg) setRefreshing(true);
      const res = await axios.get(`${BASE_URL}/analytics`, { withCredentials: true });
      setData(res.data);
      if (!bg) setCooldown(10);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => {
    fetchAnalytics(true);
    const iv = setInterval(() => fetchAnalytics(true), 10000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const summary = useMemo(() => {
    const tabs = data.tabs || [];
    const totalSec = tabs.reduce((a, t) => a + (Number(t.summaryTime) || 0), 0);
    return {
      totalSites: tabs.length,
      totalSec,
      totalSessions: tabs.reduce((a, t) => a + (Number(t.counter) || 0), 0),
      intervalRows: (data.timeIntervals || []).length,
    };
  }, [data]);

  const sorted = useMemo(() =>
    [...(data.tabs || [])].sort((a, b) => (b.summaryTime || 0) - (a.summaryTime || 0)),
    [data]);

  const barData = useMemo(() =>
    sorted.slice(0, 8).map((t) => ({ url: t.url, seconds: Number(t.summaryTime) || 0, sessions: Number(t.counter) || 0 })),
    [sorted]);

  const pieData = useMemo(() => {
    const top = sorted.slice(0, 6);
    const topTotal = top.reduce((a, t) => a + (Number(t.summaryTime) || 0), 0);
    const rest = summary.totalSec - topTotal;
    const result = top.map((t) => ({
      name: getDomain(t.url), url: t.url,
      value: Number(t.summaryTime) || 0,
      pct: summary.totalSec ? Math.round((Number(t.summaryTime) / summary.totalSec) * 100) : 0,
    }));
    if (rest > 0) result.push({ name: "Others", value: rest, pct: Math.round((rest / summary.totalSec) * 100) });
    return result;
  }, [sorted, summary]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-mutedForeground text-sm">Loading analytics...</div>
  );

  const hasData = sorted.length > 0;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-mutedForeground mt-1">
            Last sync: {data.syncedAt ? new Date(data.syncedAt).toLocaleString() : "Never"}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => fetchAnalytics(false)} disabled={refreshing || cooldown > 0}>
          {refreshing ? "Refreshing…" : cooldown > 0 ? `Refresh (${cooldown}s)` : "Refresh"}
        </Button>
      </div>

      {data.isFallback && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Showing latest synced extension data (fallback mode).
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Websites",     value: summary.totalSites,              color: "#4f8ef7" },
          { label: "Tracked Time", value: fmt(summary.totalSec),           color: "#10b981" },
          { label: "Sessions",     value: summary.totalSessions,           color: "#6366f1" },
          { label: "Intervals",    value: summary.intervalRows,            color: "#f59e0b" },
        ].map((s) => (
          <Card key={s.label} className="p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-10 -mr-4 -mt-4" style={{ background: s.color }} />
            <p className="text-xs text-mutedForeground uppercase tracking-wider">{s.label}</p>
            <p className="mt-2 text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* AI Insights */}
      <AIInsightsPanel />

      {hasData && (
        <>
          {/* Charts */}
          <div className="grid md:grid-cols-5 gap-4">
            <Card className="md:col-span-3 p-5">
              <p className="text-sm font-semibold mb-1">Top Sites by Time</p>
              <p className="text-xs text-mutedForeground mb-4">Hover for details</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData} margin={{ top: 4, right: 8, left: -16, bottom: 28 }}>
                  <XAxis dataKey="url" tick={<FaviconTick />} interval={0} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmt} tick={{ fill: "#7d8590", fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)", radius: 8 }} />
                  <Bar dataKey="seconds" radius={[8, 8, 0, 0]} maxBarSize={40}>
                    {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.9} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="md:col-span-2 p-5 flex flex-col">
              <p className="text-sm font-semibold mb-1">Time Share</p>
              <p className="text-xs text-mutedForeground mb-2">Top 6 sites</p>
              <div className="flex-1 relative">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-lg font-bold">{fmt(summary.totalSec)}</p>
                  <p className="text-[10px] text-mutedForeground">total</p>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {pieData.slice(0, 5).map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    {d.url && <Favicon url={d.url} size={13} />}
                    <span className="text-[11px] text-mutedForeground truncate flex-1">{d.name}</span>
                    <span className="text-[11px] font-medium" style={{ color: COLORS[i % COLORS.length] }}>{d.pct}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Ranked list */}
          <Card className="p-5">
            <p className="text-sm font-semibold mb-4">All Websites</p>
            <div className="space-y-3">
              {sorted.map((tab, idx) => {
                const pct = summary.totalSec ? Math.round((Number(tab.summaryTime) / summary.totalSec) * 100) : 0;
                const color = COLORS[idx % COLORS.length];
                return (
                  <div key={tab.url + idx}>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs text-mutedForeground w-5 text-right flex-shrink-0">{idx + 1}</span>
                      <Favicon url={tab.url} size={18} />
                      <span className="text-sm text-foreground flex-1 truncate">{getDomain(tab.url)}</span>
                      <span className="text-xs text-mutedForeground">{tab.counter || 0} sessions</span>
                      <span className="text-sm font-semibold w-16 text-right" style={{ color }}>{fmt(tab.summaryTime || 0)}</span>
                    </div>
                    <div className="ml-8 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: color, opacity: 0.8 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {!hasData && (
        <Card className="p-12 flex flex-col items-center gap-3 text-center">
          <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 grid place-items-center text-2xl">📊</div>
          <p className="text-sm text-mutedForeground">No extension data synced yet.</p>
        </Card>
      )}
    </div>
  );
};

export default Analytics;
