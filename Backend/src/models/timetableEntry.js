// models/timetableEntry.js
const mongoose = require("mongoose");

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TYPES = ["class", "meeting", "doubt session", "coding session", "other"];

const timetableEntrySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    subject: {
      type: String,
      trim: true,
      default: "",
    },

    teacherName: {
      type: String,
      trim: true,
      default: "",
    },

    dayOfWeek: {
      type: String,
      required: true,
      enum: DAYS,
    },

    // "HH:MM" 24-hour format, e.g. "09:30"
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },

    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },

    meetingLink: {
      type: String,
      trim: true,
      default: "",
    },

    type: {
      type: String,
      enum: TYPES,
      default: "class",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Index for fast weekly/daily queries
timetableEntrySchema.index({ dayOfWeek: 1, startTime: 1 });

module.exports = mongoose.model("TimetableEntry", timetableEntrySchema);
