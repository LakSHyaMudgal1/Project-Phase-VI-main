// controllers/searchController.js
// Real web search via Tavily API — NOT internal database search.
// API key stays server-side only; never exposed to the frontend.

const https = require("https");

// ── Module-load diagnostic ────────────────────────────────────────────────
// Runs once when the module is first required by app.js.
// If TAVILY_API_KEY shows undefined here, dotenv ran AFTER this module
// was loaded — check the require() order in server.js.
console.log(
  "[searchController] Module loaded. TAVILY_API_KEY =",
  process.env.TAVILY_API_KEY
    ? `${process.env.TAVILY_API_KEY.slice(0, 8)}... ✅`
    : "undefined ❌  — dotenv may not have run before this module was required"
);
// ─────────────────────────────────────────────────────────────────────────

// Filter value → Tavily include_domains list
const FILTER_DOMAINS = {
  all:           null,
  docs:          ["developer.mozilla.org", "docs.python.org", "docs.oracle.com", "devdocs.io"],
  youtube:       ["youtube.com"],
  stackoverflow: ["stackoverflow.com"],
  geeksforgeeks: ["geeksforgeeks.org"],
  mdn:           ["developer.mozilla.org"],
  research:      ["arxiv.org", "scholar.google.com", "researchgate.net", "pubmed.ncbi.nlm.nih.gov"],
};

/**
 * POST to Tavily Search API using Node's built-in https module.
 * apiKey is passed explicitly so it is read at call-time, not module-load-time.
 */
function callTavily(payload, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);

    const options = {
      hostname: "api.tavily.com",
      path: "/search",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject({ status: res.statusCode, body: parsed });
          }
        } catch {
          reject({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", (err) => reject({ status: 0, body: err.message }));
    req.setTimeout(15000, () => {
      req.destroy();
      reject({ status: 0, body: "Request timed out after 15s" });
    });

    req.write(body);
    req.end();
  });
}

/**
 * Normalize a single Tavily result item into our standard response shape.
 */
function normalizeResult(item) {
  const displayLink = (() => {
    try { return new URL(item.url).hostname.replace(/^www\./, ""); }
    catch { return item.url || ""; }
  })();

  const favicon =
    item.favicon ||
    `https://www.google.com/s2/favicons?domain=${displayLink}&sz=32`;

  // Thumbnail: first image from the result's images array if present
  const thumbnail =
    item.images && item.images.length > 0
      ? typeof item.images[0] === "string"
        ? item.images[0]
        : item.images[0]?.url || null
      : null;

  return {
    title:       item.title   || "Untitled",
    snippet:     item.content || "",
    link:        item.url     || "",
    displayLink,
    favicon,
    thumbnail:   thumbnail || null,
    score:       item.score   || 0,
  };
}

/**
 * GET /api/search?q=<query>&filter=<filter>
 */
exports.search = async (req, res) => {
  const q      = (req.query.q      || "").trim();
  const filter = (req.query.filter || "all").toLowerCase();

  // ── Input validation ─────────────────────────────────────────────────────
  if (!q) {
    return res.status(400).json({
      results: [],
      answer:  null,
      error:   "Query parameter 'q' is required and must be non-empty.",
    });
  }

  if (!(filter in FILTER_DOMAINS)) {
    return res.status(400).json({
      results: [],
      answer:  null,
      error:   `Invalid filter '${filter}'. Valid: ${Object.keys(FILTER_DOMAINS).join(", ")}.`,
    });
  }

  // ── API key — read at request time so hot-reload picks up changes ────────
  const tavilyKey = process.env.TAVILY_API_KEY;

  console.log(
    "[Search] TAVILY_API_KEY at request time =",
    tavilyKey ? `${tavilyKey.slice(0, 8)}... ✅` : "undefined ❌"
  );

  if (!tavilyKey) {
    console.error("[Search] ❌ TAVILY_API_KEY is not in process.env");
    console.error("[Search]    Expected location: Backend/.env");
    console.error("[Search]    Restart the server after adding the key.");
    return res.status(503).json({
      results: [],
      answer:  null,
      error:   "Tavily API key missing. Add TAVILY_API_KEY=<key> to Backend/.env and restart the server.",
    });
  }

  console.log(`[Search] Query: "${q}" | Filter: "${filter}"`);

  // ── Build Tavily request payload ─────────────────────────────────────────
  const payload = {
    query:           q,
    search_depth:    "basic",
    max_results:     10,
    include_answer:  true,   // AI summary shown at top of results
    include_favicon: true,   // per-result favicon URLs
    include_images:  true,   // thumbnails
    topic:           "general",
  };

  const domains = FILTER_DOMAINS[filter];
  if (domains && domains.length > 0) {
    payload.include_domains = domains;
  }

  // ── Call Tavily ──────────────────────────────────────────────────────────
  try {
    const tavilyData = await callTavily(payload, tavilyKey);

    console.log(`[Search] ✅ Tavily success. Results returned: ${tavilyData.results?.length ?? 0}`);

    const results = (tavilyData.results || []).map(normalizeResult);
    const answer  = tavilyData.answer || null;

    return res.status(200).json({ results, answer, error: null });

  } catch (err) {
    const status = err.status || 0;
    const detail =
      typeof err.body === "object"
        ? err.body?.detail || err.body?.message || JSON.stringify(err.body)
        : String(err.body || "Unknown error");

    console.error(`[Search] ❌ Tavily error — HTTP ${status}: ${detail}`);

    if (status === 401) {
      return res.status(502).json({
        results: [],
        answer:  null,
        error:   "Tavily API key is invalid or unauthorized. Check TAVILY_API_KEY in Backend/.env.",
      });
    }
    if (status === 429) {
      return res.status(502).json({
        results: [],
        answer:  null,
        error:   "Tavily rate limit exceeded. Please wait a moment and try again.",
      });
    }
    if (status === 0) {
      return res.status(502).json({
        results: [],
        answer:  null,
        error:   "Search service unreachable. Check your internet connection.",
      });
    }

    return res.status(502).json({
      results: [],
      answer:  null,
      error:   `Search service error (${status}): ${detail}`,
    });
  }
};
