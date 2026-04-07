const mongoose = require("mongoose");

const analyticsHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: String, // "YYYY-MM-DD"
      required: true,
    },
    tabs: { type: Array, default: [] },
    timeIntervals: { type: Array, default: [] },
    syncedAt: { type: Date },
  },
  { timestamps: true }
);

// one record per user per day
analyticsHistorySchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("AnalyticsHistory", analyticsHistorySchema);
