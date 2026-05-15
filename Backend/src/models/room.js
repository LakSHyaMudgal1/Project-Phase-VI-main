// models/room.js
const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Currently online members (cleared on leave, restored on rejoin)
    members: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],

    // Users currently invited but haven't joined yet
    invitedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Everyone who was ever invited — persists through leave/rejoin
    // Room stays alive until owner explicitly deletes it
    permanentMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Soft-delete flag — only set when owner deletes the room
    isDeleted: {
      type: Boolean,
      default: false,
    },

    activityLog: [
      {
        message: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Room", roomSchema);
