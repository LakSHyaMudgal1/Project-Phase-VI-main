const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Analytics = require("../models/analytics");
const PublicAnalytics = require("../models/publicAnalytics");
const userAuth = require("../middleware/auth");
const Groq = require("groq-sdk");

const analyticsRouter = express.Router();

async function resolveUserFromRequest(req) {
  const authHeader = req.headers.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;
  const cookieToken = req.cookies?.token;
  const token = bearerToken || cookieToken;

  if (!token) {
    throw new Error("Authentication token missing");
  }

  const decoded = jwt.verify(token, "TabTrack@123");
  const user = await User.findById(decoded._id);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}

analyticsRouter.post("/analytics/sync", async (req, res) => {
  try {
    const user = await resolveUserFromRequest(req);
    const tabs = Array.isArray(req.body?.tabs) ? req.body.tabs : [];
    const timeIntervals = Array.isArray(req.body?.timeIntervals)
      ? req.body.timeIntervals
      : [];

    const analytics = await Analytics.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          tabs,
          timeIntervals,
          syncedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    console.log(
      `[analytics/sync] user=${user._id} tabs=${tabs.length} intervals=${timeIntervals.length}`
    );

    res.json({
      message: "Analytics synced successfully",
      data: {
        tabsCount: analytics.tabs.length,
        intervalsCount: analytics.timeIntervals.length,
        syncedAt: analytics.syncedAt,
      },
    });
  } catch (err) {
    res.status(401).send("Analytics sync failed: " + err.message);
  }
});

analyticsRouter.get("/analytics", userAuth, async (req, res) => {
  try {
    let analytics = await Analytics.findOne({ userId: req.user._id });
    let isFallback = false;

    // Demo-friendly fallback:
    // if current user has no synced analytics yet, return latest synced record.
    if (!analytics) {
      analytics = await Analytics.findOne({}).sort({ syncedAt: -1 });
      if (analytics) {
        isFallback = true;
      }
    }

    if (!analytics) {
      return res.json({
        tabs: [],
        timeIntervals: [],
        syncedAt: null,
        isFallback: false,
      });
    }

    return res.json({
      tabs: analytics.tabs || [],
      timeIntervals: analytics.timeIntervals || [],
      syncedAt: analytics.syncedAt || null,
      isFallback,
    });
  } catch (err) {
    res.status(500).send("Failed to fetch analytics: " + err.message);
  }
});

analyticsRouter.post("/analytics/public-sync", async (req, res) => {
  try {
    const clientId = String(req.body?.clientId || "").trim();
    if (!clientId) {
      return res.status(400).send("clientId is required");
    }

    const tabs = Array.isArray(req.body?.tabs) ? req.body.tabs : [];
    const timeIntervals = Array.isArray(req.body?.timeIntervals)
      ? req.body.timeIntervals
      : [];
    const extensionName = String(req.body?.extensionName || "Web Activity Sync Extension");

    const analytics = await PublicAnalytics.findOneAndUpdate(
      { clientId },
      {
        $set: {
          extensionName,
          tabs,
          timeIntervals,
          syncedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      message: "Public analytics synced successfully",
      data: {
        clientId: analytics.clientId,
        tabsCount: analytics.tabs.length,
        intervalsCount: analytics.timeIntervals.length,
        syncedAt: analytics.syncedAt,
      },
    });
  } catch (err) {
    res.status(500).send("Public analytics sync failed: " + err.message);
  }
});

analyticsRouter.post("/analytics/ai-insights", userAuth, async (req, res) => {
  try {
    const analytics = await Analytics.findOne({ userId: req.user._id });
    if (!analytics || !analytics.tabs?.length) {
      return res.status(400).json({ error: "No analytics data found to analyze." });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "AI service not configured." });

    const groq = new Groq({ apiKey });

    const topSites = [...analytics.tabs]
      .sort((a, b) => (b.summaryTime || 0) - (a.summaryTime || 0))
      .slice(0, 15)
      .map((t) => ({
        site: t.url,
        timeMinutes: Math.round((Number(t.summaryTime) || 0) / 60),
        sessions: Number(t.counter) || 0,
        activeDays: t.days?.length || 0,
      }));

    const totalMinutes = analytics.tabs.reduce((a, t) => a + Math.round((Number(t.summaryTime) || 0) / 60), 0);

    const prompt = `You are a productivity analyst. Analyze this web browsing data and give concise, actionable insights.

User's top websites by time spent:
${JSON.stringify(topSites, null, 2)}

Total tracked time: ${totalMinutes} minutes across ${analytics.tabs.length} websites.

Respond in this exact JSON format (no markdown, no code blocks, just raw JSON):
{
  "productivityScore": <number 0-100>,
  "summary": "<2-3 sentence overall summary>",
  "insights": [
    { "type": "warning|tip|positive", "title": "<short title>", "detail": "<1-2 sentences>" }
  ],
  "topCategory": "<most dominant category e.g. Social Media, Work, Entertainment>",
  "focusRecommendation": "<one specific actionable recommendation>"
}

Limit insights to 4 items max. Be direct and specific, mention actual site names.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 600,
    });

    const text = completion.choices[0].message.content.trim();
    const clean = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(clean);

    res.json(parsed);
  } catch (err) {
    console.error("[ai-insights]", err.message);
    if (err.status === 429) {
      return res.status(429).json({ error: "Rate limit hit. Please wait a moment and try again." });
    }
    res.status(500).json({ error: "Failed to generate insights: " + err.message });
  }
});

module.exports = analyticsRouter;
