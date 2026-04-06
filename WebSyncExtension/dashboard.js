const refreshBtn = document.getElementById("refreshBtn");
const exportBtn = document.getElementById("exportBtn");
const resetBtn = document.getElementById("resetBtn");

const activeSiteEl = document.getElementById("activeSite");
const activeForEl = document.getElementById("activeFor");
const trackedSitesEl = document.getElementById("trackedSites");
const totalTimeEl = document.getElementById("totalTime");
const totalSessionsEl = document.getElementById("totalSessions");

const siteRowsEl = document.getElementById("siteRows");
const selectedEmptyEl = document.getElementById("selectedEmpty");
const selectedPanelEl = document.getElementById("selectedPanel");
const selectedDomainEl = document.getElementById("selectedDomain");
const selectedTotalsEl = document.getElementById("selectedTotals");
const dayRowsEl = document.getElementById("dayRows");

let lastAnalysis = null;
let selectedDomain = null;

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response || { ok: false, message: "No response" });
    });
  });
}

function formatSeconds(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderSelected(domain) {
  if (!lastAnalysis) return;
  const site = (lastAnalysis.sites || []).find((s) => s.domain === domain);
  if (!site) return;

  selectedDomain = domain;
  selectedEmptyEl.classList.add("hidden");
  selectedPanelEl.classList.remove("hidden");

  selectedDomainEl.textContent = domain;
  selectedTotalsEl.textContent = `Total: ${formatSeconds(site.totalTimeSeconds)} • Today: ${formatSeconds(
    site.todayTimeSeconds
  )} • Sessions: ${site.totalSessions}`;

  const days = [...(site.days || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (days.length === 0) {
    dayRowsEl.innerHTML = `<tr><td colspan="3">No day-wise data yet.</td></tr>`;
    return;
  }
  dayRowsEl.innerHTML = days
    .map(
      (d) => `
      <tr>
        <td>${escapeHtml(d.date)}</td>
        <td>${formatSeconds(d.summary || 0)}</td>
        <td>${d.counter || 0}</td>
      </tr>
    `
    )
    .join("");
}

function render(analysis) {
  lastAnalysis = analysis;
  const totals = analysis?.totals || {};
  const active = analysis?.active || {};
  const sites = analysis?.sites || [];
  const trackingEnabled = analysis?.trackingEnabled;

  trackedSitesEl.textContent = String(totals.trackedSites || 0);
  totalTimeEl.textContent = formatSeconds(totals.totalTimeSeconds || 0);
  totalSessionsEl.textContent = String(totals.totalSessions || 0);

  if (trackingEnabled === false) {
    activeSiteEl.textContent = "Tracking OFF";
    activeForEl.textContent = "Log in to your website to start tracking.";
  } else if (active.domain) {
    activeSiteEl.textContent = active.domain;
    activeForEl.textContent = `Active for: ${formatSeconds(active.activeForSeconds || 0)}`;
  } else {
    activeSiteEl.textContent = "-";
    activeForEl.textContent = "No website tab in focus";
  }

  if (sites.length === 0) {
    siteRowsEl.innerHTML = `<tr><td colspan="4">No tracked data yet.</td></tr>`;
  } else {
    siteRowsEl.innerHTML = sites
      .map(
        (s) => `
        <tr class="row" data-domain="${escapeHtml(s.domain)}">
          <td>${escapeHtml(s.domain)}</td>
          <td>${formatSeconds(s.totalTimeSeconds)}</td>
          <td>${formatSeconds(s.todayTimeSeconds)}</td>
          <td>${s.totalSessions}</td>
        </tr>
      `
      )
      .join("");
  }

  if (selectedDomain) {
    renderSelected(selectedDomain);
  } else {
    selectedEmptyEl.classList.remove("hidden");
    selectedPanelEl.classList.add("hidden");
  }
}

async function refresh() {
  const res = await sendMessage({ type: "get-analysis" });
  if (!res.ok) return;
  render(res.data);
}

function exportCsv() {
  if (!lastAnalysis) return;
  const rows = [["website", "total_time_seconds", "today_time_seconds", "total_sessions"]];
  for (const s of lastAnalysis.sites || []) {
    rows.push([s.domain, String(s.totalTimeSeconds || 0), String(s.todayTimeSeconds || 0), String(s.totalSessions || 0)]);
  }
  const csv = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `web-activity-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

refreshBtn.addEventListener("click", refresh);
exportBtn.addEventListener("click", exportCsv);
resetBtn.addEventListener("click", async () => {
  const ok = confirm("Reset all tracked extension data?");
  if (!ok) return;
  await sendMessage({ type: "reset-analysis" });
  selectedDomain = null;
  await refresh();
});

siteRowsEl.addEventListener("click", (e) => {
  const tr = e.target?.closest("tr[data-domain]");
  if (!tr) return;
  const domain = tr.getAttribute("data-domain");
  if (!domain) return;
  renderSelected(domain);
});

refresh();
setInterval(refresh, 5000);

