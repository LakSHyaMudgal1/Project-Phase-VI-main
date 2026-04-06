const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
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

module.exports = mongoose.model("Analytics", analyticsSchema);
