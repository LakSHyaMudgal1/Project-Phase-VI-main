const COLORS = ["#4f8ef7","#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#06b6d4"];

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

function render(analysis) {
  const totals = analysis?.totals || {};
  const active = analysis?.active || {};
  const sites  = analysis?.sites  || [];
  const on     = analysis?.trackingEnabled;

  // status pill
  const pill = document.getElementById("statusPill");
  if (on === false) { pill.textContent = "OFF"; pill.className = "status-pill off"; }
  else if (on === true) { pill.textContent = "ON"; pill.className = "status-pill on"; }
  else { pill.textContent = "IDLE"; pill.className = "status-pill idle"; }

  // metrics
  document.getElementById("trackedSites").textContent = totals.trackedSites || 0;
  document.getElementById("totalTime").textContent    = fmt(totals.totalTimeSeconds || 0);
  document.getElementById("totalSessions").textContent = totals.totalSessions || 0;

  // active bar
  const favicon = document.getElementById("activeFavicon");
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
  const list = document.getElementById("sitesList");
  const sorted = [...sites].sort((a, b) => (b.totalTimeSeconds || 0) - (a.totalTimeSeconds || 0));
  const maxTime = sorted[0]?.totalTimeSeconds || 1;

  if (sorted.length === 0) {
    list.innerHTML = `<div class="empty">No tracked data yet.</div>`;
    return;
  }

  list.innerHTML = sorted.slice(0, 10).map((s, i) => {
    const pct   = Math.round((s.totalTimeSeconds / maxTime) * 100);
    const color = COLORS[i % COLORS.length];
    return `
      <div class="site-row">
        <span class="site-rank">${i + 1}</span>
        <img class="site-favicon" src="${faviconUrl(s.domain)}" alt=""
          onerror="this.style.display='none';this.nextElementSibling.style.display='grid'" />
        <div class="site-favicon-fallback" style="display:none">${s.domain[0]?.toUpperCase()}</div>
        <div class="site-info">
          <div class="site-domain">${s.domain}</div>
          <div class="site-bar-wrap"><div class="site-bar" style="width:${pct}%;background:${color}"></div></div>
          <div class="site-sessions">${s.totalSessions} sessions</div>
        </div>
        <span class="site-time" style="color:${color}">${fmt(s.totalTimeSeconds)}</span>
      </div>`;
  }).join("");
}

async function refresh() {
  const res = await sendMessage({ type: "get-analysis" });
  if (res.ok) render(res.data);
}

document.getElementById("openDashboardBtn").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});

document.getElementById("refreshBtn").addEventListener("click", refresh);

document.getElementById("resetBtn").addEventListener("click", async () => {
  if (!confirm("Reset all tracked extension data?")) return;
  const res = await sendMessage({ type: "reset-analysis" });
  if (res.ok) await refresh();
});

refresh();
setInterval(refresh, 5000);
