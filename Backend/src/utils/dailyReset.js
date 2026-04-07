const cron = require("node-cron");
const Analytics = require("../models/analytics");
const AnalyticsHistory = require("../models/analyticsHistory");

function getYesterdayDate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

async function archiveAndReset() {
  try {
    const date = getYesterdayDate();
    const allRecords = await Analytics.find({});

    for (const record of allRecords) {
      // archive snapshot for yesterday
      await AnalyticsHistory.findOneAndUpdate(
        { userId: record.userId, date },
        {
          $set: {
            tabs: record.tabs,
            timeIntervals: record.timeIntervals,
            syncedAt: record.syncedAt,
          },
        },
        { upsert: true }
      );

      // reset current analytics
      await Analytics.findByIdAndUpdate(record._id, {
        $set: { tabs: [], timeIntervals: [], syncedAt: new Date() },
      });
    }

    console.log(`[dailyReset] Archived ${allRecords.length} records for ${date} and reset analytics.`);
  } catch (err) {
    console.error("[dailyReset] Error:", err.message);
  }
}

function scheduleDailyReset() {
  // runs every day at midnight (00:00)
  cron.schedule("0 0 * * *", archiveAndReset, { timezone: "Asia/Kolkata" });
  console.log("[dailyReset] Scheduled daily reset at midnight IST.");
}

module.exports = { scheduleDailyReset, archiveAndReset };
