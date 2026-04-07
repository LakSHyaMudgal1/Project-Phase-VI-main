const COLORS = ["#4f8ef7","#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#06b6d4"];

let lastAnalysis = null;
let selectedDomain = null;

function sendMessage(msg) {
  return new Promise((resolve) => chrome.runtime.sendMessage(msg, (r) => resolve(r || { ok: false })));
}

function fmt(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${ss}s`;
  return `${ss}s`;
}

function faviconUrl(domain) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[c]));
}

function renderDetail(domain) {
  if (!lastAnalysis) return;
  const site = (lastAnalysis.sites || []).find((s) => s.domain === domain);
  if (!site) return;

  selectedDomain = domain;
  document.getElementById("emptyState").classList.add("hidden");
  document.getElementById("detailPanel").classList.remove("hidden");

  const favicon = document.getElementById("detailFavicon");
  const fallback = document.getElementById("detailFaviconFallback");
  favicon.src = faviconUrl(domain);
  favicon.style.display = "block";
  fallback.textContent = domain[0]?.toUpperCase() || "?";

  document.getElementById("detailDomain").textContent = domain;
  document.getElementById("detailTotals").textContent =
    `Total: ${fmt(site.totalTimeSeconds)} · Today: ${fmt(site.todayTimeSeconds)} · ${site.totalSessions} sessions`;

  const days = [...(site.days || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  const dayRows = document.getElementById("dayRows");
  if (days.length === 0) {
    dayRows.innerHTML = `<tr><td colspan="3" style="color:var(--muted);text-align:center;padding:16px">No day-wise data yet.</td></tr>`;
    return;
  }
  dayRows.innerHTML = days.map((d) => `
    <tr>
      <td>${esc(d.date)}</td>
      <td>${fmt(d.summary || 0)}</td>
      <td>${d.counter || 0}</td>
    </tr>`).join("");

  // highlight selected row
  document.querySelectorAll(".site-row").forEach((r) => {
    r.classList.toggle("active", r.dataset.domain === domain);
  });
}

function render(analysis) {
  lastAnalysis = analysis;
  const totals = analysis?.totals || {};
  const active  = analysis?.active  || {};
  const sites   = analysis?.sites   || [];
  const on      = analysis?.trackingEnabled;

  // status pill
  const pill = document.getElementById("statusPill");
  if (on === false) { pill.textContent = "OFF"; pill.className = "status-pill off"; }
  else if (on === true) { pill.textContent = "ON"; pill.className = "status-pill on"; }
  else { pill.textContent = "IDLE"; pill.className = "status-pill idle"; }

  // cards
  document.getElementById("trackedSites").textContent  = totals.trackedSites || 0;
  document.getElementById("totalTime").textContent     = fmt(totals.totalTimeSeconds || 0);
  document.getElementById("totalSessions").textContent = totals.totalSessions || 0;

  // today total
  const todaySec = sites.reduce((a, s) => a + (s.todayTimeSeconds || 0), 0);
  document.getElementById("todayTime").textContent = fmt(todaySec);

  // active bar
  const favicon  = document.getElementById("activeFavicon");
  const domainEl = document.getElementById("activeDomain");
  const timerEl  = document.getElementById("activeTimer");
  if (active.domain) {
    favicon.src = faviconUrl(active.domain);
    favicon.style.display = "block";
    favicon.onerror = () => { favicon.style.display = "none"; };
    domainEl.textContent = active.domain;
    timerEl.textContent  = fmt(active.activeForSeconds || 0);
  } else {
    favicon.style.display = "none";
    domainEl.textContent  = on === false ? "Tracking off — log in first" : "No site in focus";
    timerEl.textContent   = "";
  }

  // site list
  const list   = document.getElementById("sitesList");
  const sorted = [...sites].sort((a, b) => (b.totalTimeSeconds || 0) - (a.totalTimeSeconds || 0));
  const maxTime = sorted[0]?.totalTimeSeconds || 1;

  if (sorted.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:32px;color:var(--muted);font-size:12px">No tracked data yet.</div>`;
  } else {
    list.innerHTML = sorted.map((s, i) => {
      const pct   = Math.round((s.totalTimeSeconds / maxTime) * 100);
      const color = COLORS[i % COLORS.length];
      const isActive = s.domain === selectedDomain;
      return `
        <div class="site-row${isActive ? ' active' : ''}" data-domain="${esc(s.domain)}">
          <span class="site-rank">${i + 1}</span>
          <img class="site-favicon" src="${faviconUrl(s.domain)}" alt=""
            onerror="this.style.display='none';this.nextElementSibling.style.display='grid'" />
          <div class="site-favicon-fallback">${s.domain[0]?.toUpperCase() || '?'}</div>
          <div class="site-info">
            <div class="site-domain">${esc(s.domain)}</div>
            <div class="site-bar-wrap"><div class="site-bar" style="width:${pct}%;background:${color}"></div></div>
            <div class="site-sessions">${s.totalSessions} sessions · today ${fmt(s.todayTimeSeconds)}</div>
          </div>
          <span class="site-time" style="color:${color}">${fmt(s.totalTimeSeconds)}</span>
        </div>`;
    }).join("");
  }

  // re-render detail if one was selected
  if (selectedDomain) renderDetail(selectedDomain);
}

async function refresh() {
  const res = await sendMessage({ type: "get-analysis" });
  if (res.ok) render(res.data);
}

function exportCsv() {
  if (!lastAnalysis) return;
  const rows = [["website","total_time_seconds","today_time_seconds","total_sessions"]];
  for (const s of lastAnalysis.sites || []) {
    rows.push([s.domain, s.totalTimeSeconds || 0, s.todayTimeSeconds || 0, s.totalSessions || 0]);
  }
  const csv = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `tabtrack-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

document.getElementById("refreshBtn").addEventListener("click", refresh);
document.getElementById("exportBtn").addEventListener("click", exportCsv);
document.getElementById("resetBtn").addEventListener("click", async () => {
  if (!confirm("Reset all tracked extension data?")) return;
  await sendMessage({ type: "reset-analysis" });
  selectedDomain = null;
  document.getElementById("emptyState").classList.remove("hidden");
  document.getElementById("detailPanel").classList.add("hidden");
  await refresh();
});

document.getElementById("sitesList").addEventListener("click", (e) => {
  const row = e.target?.closest(".site-row[data-domain]");
  if (!row) return;
  renderDetail(row.dataset.domain);
});

refresh();
setInterval(refresh, 5000);
