const DEFAULT_STATE = {
  current: {
    domain: null,
    startTs: null
  },
  tabs: {},
  intervals: {}
};

async function isLoggedInToWebsite() {
  try {
    const candidates = [
      { url: "http://localhost:7777", name: "token" },
      { url: "https://devconnect-backend.vercel.app", name: "token" }
    ];

    for (const c of candidates) {
      // eslint-disable-next-line no-await-in-loop
      const cookie = await chrome.cookies.get({ url: c.url, name: c.name });
      if (cookie?.value) return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function getLoggedInBackendBaseUrl() {
  const candidates = ["http://localhost:7777", "https://devconnect-backend.vercel.app"];
  for (const baseUrl of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const cookie = await chrome.cookies.get({ url: baseUrl, name: "token" });
    if (cookie?.value) return baseUrl;
  }
  return null;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function toTimeString(ts) {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function safeDomain(urlString) {
  try {
    const u = new URL(urlString || "");
    if (!u.hostname) return null;
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.hostname;
  } catch {
    return null;
  }
}

async function getState() {
  const data = await chrome.storage.local.get(["trackerState"]);
  return data.trackerState || structuredClone(DEFAULT_STATE);
}

async function setState(state) {
  await chrome.storage.local.set({ trackerState: state });
}

function ensureDomainTab(state, domain) {
  if (!state.tabs[domain]) {
    state.tabs[domain] = {
      url: domain,
      summaryTime: 0,
      counter: 0,
      days: {}
    };
  }
  return state.tabs[domain];
}

function ensureIntervalRow(state, domain, day) {
  const key = `${domain}__${day}`;
  if (!state.intervals[key]) {
    state.intervals[key] = {
      domain,
      day,
      intervals: []
    };
  }
  return state.intervals[key];
}

function addElapsed(state, domain, startTs, endTs) {
  if (!domain || !startTs || !endTs || endTs <= startTs) return;
  const seconds = Math.floor((endTs - startTs) / 1000);
  if (seconds <= 0) return;

  const day = getToday();
  const tab = ensureDomainTab(state, domain);
  tab.summaryTime += seconds;
  tab.counter += 1;
  if (!tab.days[day]) {
    tab.days[day] = { date: day, summary: 0, counter: 0 };
  }
  tab.days[day].summary += seconds;
  tab.days[day].counter += 1;

  const interval = ensureIntervalRow(state, domain, day);
  interval.intervals.push(`${toTimeString(startTs)}-${toTimeString(endTs)}`);
}

async function closeCurrentSession(state) {
  if (state.current.domain && state.current.startTs) {
    addElapsed(state, state.current.domain, state.current.startTs, Date.now());
  }
  state.current.domain = null;
  state.current.startTs = null;
}

async function openCurrentSessionForActiveTab(state) {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const domain = safeDomain(activeTab?.url);
    if (!domain) {
      state.current.domain = null;
      state.current.startTs = null;
      return;
    }
    state.current.domain = domain;
    state.current.startTs = Date.now();
  } catch {
    state.current.domain = null;
    state.current.startTs = null;
  }
}

function buildPayload(state) {
  const tabs = Object.values(state.tabs).map((t) => ({
    url: t.url,
    summaryTime: t.summaryTime || 0,
    counter: t.counter || 0,
    days: Object.values(t.days || {})
  }));

  const timeIntervals = Object.values(state.intervals).map((i) => ({
    domain: i.domain,
    day: i.day,
    intervals: i.intervals || []
  }));

  return { tabs, timeIntervals };
}

function buildAnalysis(state, trackingEnabled) {
  const payload = buildPayload(state);
  const tabs = [...payload.tabs].sort((a, b) => (b.summaryTime || 0) - (a.summaryTime || 0));
  const totalTimeSeconds = tabs.reduce((sum, t) => sum + (t.summaryTime || 0), 0);
  const totalSessions = tabs.reduce((sum, t) => sum + (t.counter || 0), 0);
  const today = getToday();

  const sites = tabs.map((tab) => {
    const todayRow = (tab.days || []).find((d) => d.date === today) || {
      summary: 0,
      counter: 0
    };
    return {
      domain: tab.url,
      totalTimeSeconds: tab.summaryTime || 0,
      totalSessions: tab.counter || 0,
      todayTimeSeconds: todayRow.summary || 0,
      todaySessions: todayRow.counter || 0,
      days: tab.days || []
    };
  });

  const activeDomain = state.current?.domain || null;
  const activeSinceTs = state.current?.startTs || null;
  const activeForSeconds =
    activeSinceTs && activeDomain ? Math.max(0, Math.floor((Date.now() - activeSinceTs) / 1000)) : 0;

  return {
    trackingEnabled: Boolean(trackingEnabled),
    totals: {
      trackedSites: sites.length,
      totalTimeSeconds,
      totalSessions
    },
    active: {
      domain: activeDomain,
      activeForSeconds
    },
    sites,
    intervals: payload.timeIntervals
  };
}

async function getStateWithLiveSnapshot() {
  const state = await getState();
  const backendBaseUrl = await getLoggedInBackendBaseUrl();
  const loggedIn = Boolean(backendBaseUrl);

  // Include current active session in analytics snapshot only if logged in.
  await closeCurrentSession(state);
  if (loggedIn) {
    await openCurrentSessionForActiveTab(state);
  } else {
    state.current.domain = null;
    state.current.startTs = null;
  }
  await setState(state);
  return { state, loggedIn, backendBaseUrl };
}

let lastSyncAtMs = 0;
async function syncToWebsiteAnalytics(state, backendBaseUrl) {
  try {
    if (!backendBaseUrl) return;

    const now = Date.now();
    if (now - lastSyncAtMs < 15_000) return; // basic rate-limit
    lastSyncAtMs = now;

    const payload = buildPayload(state);
    await fetch(`${backendBaseUrl}/analytics/sync`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch {
    // ignore (offline / backend down). Local tracking still works.
  }
}

async function refreshActiveDomainSession() {
  const state = await getState();
  const backendBaseUrl = await getLoggedInBackendBaseUrl();
  const loggedIn = Boolean(backendBaseUrl);

  await closeCurrentSession(state);
  if (loggedIn) {
    await openCurrentSessionForActiveTab(state);
  } else {
    state.current.domain = null;
    state.current.startTs = null;
  }
  await setState(state);
  if (loggedIn) {
    await syncToWebsiteAnalytics(state, backendBaseUrl);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const state = await getState();
  await setState(state);
  await refreshActiveDomainSession();
  // Keep tracking even if user stays on same tab.
  chrome.alarms.create("tick", { periodInMinutes: 1 });
  chrome.alarms.create("sync", { periodInMinutes: 1 });
});

chrome.runtime.onStartup.addListener(async () => {
  await refreshActiveDomainSession();
  chrome.alarms.create("tick", { periodInMinutes: 1 });
  chrome.alarms.create("sync", { periodInMinutes: 1 });
});

chrome.tabs.onActivated.addListener(async () => {
  await refreshActiveDomainSession();
});

chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    await refreshActiveDomainSession();
  }
});

chrome.windows.onFocusChanged.addListener(async () => {
  await refreshActiveDomainSession();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "tick") {
    await refreshActiveDomainSession();
  }
  if (alarm.name === "sync") {
    const { state, backendBaseUrl } = await getStateWithLiveSnapshot();
    await syncToWebsiteAnalytics(state, backendBaseUrl);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message?.type === "save-settings") {
      sendResponse({ ok: false, message: "Settings are no longer needed." });
      return;
    }

    if (message?.type === "get-settings") {
      sendResponse({ ok: true, data: {} });
      return;
    }

    if (message?.type === "get-analysis") {
      const { state, loggedIn } = await getStateWithLiveSnapshot();
      sendResponse({
        ok: true,
        data: buildAnalysis(state, loggedIn)
      });
      return;
    }

    if (message?.type === "reset-analysis") {
      const state = await getState();
      state.tabs = {};
      state.intervals = {};
      state.current = { domain: null, startTs: null };
      await setState(state);
      await openCurrentSessionForActiveTab(state);
      await setState(state);
      sendResponse({ ok: true, message: "Tracker data reset." });
      return;
    }

    sendResponse({ ok: false, message: "Unknown message" });
  })();

  return true;
});
