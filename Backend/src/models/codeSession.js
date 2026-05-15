// models/codeSession.js
const mongoose = require("mongoose");

const codeSessionSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      unique: true,
      index: true,
    },
    currentCode: {
      type: String,
      default: "// Start coding together...\n",
    },
    language: {
      type: String,
      default: "javascript",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CodeSession", codeSessionSchema);
