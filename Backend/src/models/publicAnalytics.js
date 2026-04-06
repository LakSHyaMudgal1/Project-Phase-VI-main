const mongoose = require("mongoose");

const publicAnalyticsSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    extensionName: {
      type: String,
      default: "Web Activity Sync Extension",
    },
    tabs: {
      type: Array,
      default: [],
    },
    timeIntervals: {
      type: Array,
      default: [],
    },
    syncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PublicAnalytics", publicAnalyticsSchema);
