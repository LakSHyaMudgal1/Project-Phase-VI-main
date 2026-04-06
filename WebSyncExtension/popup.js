const openDashboardBtn = document.getElementById("openDashboardBtn");
const refreshBtn = document.getElementById("refreshBtn");
const resetBtn = document.getElementById("resetBtn");
const statusEl = document.getElementById("status");
const trackedSitesEl = document.getElementById("trackedSites");
const totalTimeEl = document.getElementById("totalTime");
const totalSessionsEl = document.getElementById("totalSessions");
const activeDomainEl = document.getElementById("activeDomain");
const siteRowsEl = document.getElementById("siteRows");

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.className = isError ? "err" : "ok";
}

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

function renderAnalysis(analysis) {
  const totals = analysis?.totals || {};
  const active = analysis?.active || {};
  const sites = analysis?.sites || [];
  const trackingEnabled = analysis?.trackingEnabled;

  if (trackingEnabled === false) {
    setStatus("Tracking OFF (login required). Log in to your website to start tracking.", true);
  } else if (trackingEnabled === true) {
    setStatus("Tracking ON (logged in).");
  }

  trackedSitesEl.textContent = String(totals.trackedSites || 0);
  totalTimeEl.textContent = formatSeconds(totals.totalTimeSeconds || 0);
  totalSessionsEl.textContent = String(totals.totalSessions || 0);

  if (active.domain) {
    activeDomainEl.innerHTML = `Active: <span>${active.domain}</span> (${formatSeconds(active.activeForSeconds || 0)})`;
  } else {
    activeDomainEl.innerHTML = `Active: <span>No website in focus</span>`;
  }

  if (sites.length === 0) {
    siteRowsEl.innerHTML = `<tr><td colspan="4">No tracked data yet.</td></tr>`;
    return;
  }

  siteRowsEl.innerHTML = sites
    .map(
      (s) => `
      <tr>
        <td>${s.domain}</td>
        <td>${formatSeconds(s.totalTimeSeconds)}</td>
        <td>${formatSeconds(s.todayTimeSeconds)}</td>
        <td>${s.totalSessions}</td>
      </tr>
    `
    )
    .join("");
}

async function refreshAnalysis() {
  const res = await sendMessage({ type: "get-analysis" });
  if (res.ok) {
    renderAnalysis(res.data);
    return;
  }
  setStatus(res.message || "Failed to load analysis.", true);
}

openDashboardBtn.addEventListener("click", async () => {
  const url = chrome.runtime.getURL("dashboard.html");
  await chrome.tabs.create({ url });
});

refreshBtn.addEventListener("click", async () => {
  await refreshAnalysis();
  setStatus("Analysis refreshed.");
});

resetBtn.addEventListener("click", async () => {
  const ok = confirm("Reset all tracked extension data?");
  if (!ok) return;
  const res = await sendMessage({ type: "reset-analysis" });
  if (res.ok) {
    setStatus("Tracker data reset.");
    await refreshAnalysis();
  } else {
    setStatus(res.message || "Reset failed.", true);
  }
});

async function init() {
  await refreshAnalysis();
  setInterval(refreshAnalysis, 5000);
}

init();
