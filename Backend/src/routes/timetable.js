// routes/timetable.js
const express = require("express");
const router = express.Router();
const TimetableEntry = require("../models/timetableEntry");
const userAuth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// ── Helper: today's day name ──────────────────────────────────────────────
function getTodayName() {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

// ── Helper: validate entry fields ────────────────────────────────────────
function validateEntry(body) {
  const { title, dayOfWeek, startTime, endTime, meetingLink } = body;
  if (!title?.trim())    return "Title is required.";
  if (!dayOfWeek)        return "Day of week is required.";
  if (!DAYS.includes(dayOfWeek)) return `Invalid day. Must be one of: ${DAYS.join(", ")}.`;
  if (!startTime)        return "Start time is required.";
  if (!endTime)          return "End time is required.";
  if (startTime >= endTime) return "End time must be after start time.";
  if (meetingLink && meetingLink.trim()) {
    try { new URL(meetingLink.trim()); }
    catch { return "Meeting link must be a valid URL."; }
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════
   PUBLIC / AUTHENTICATED ROUTES  (any logged-in user)
══════════════════════════════════════════════════════════════ */

// GET /api/timetable — full weekly timetable, sorted by day + time
router.get("/", userAuth, async (req, res) => {
  try {
    const entries = await TimetableEntry.find({ isActive: true })
      .sort({ dayOfWeek: 1, startTime: 1 })
      .populate("createdBy", "firstName")
      .lean();

    // Group by day for convenient frontend consumption
    const grouped = {};
    DAYS.forEach((d) => { grouped[d] = []; });
    entries.forEach((e) => { grouped[e.dayOfWeek]?.push(e); });

    res.json({ data: entries, grouped });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/timetable/today — only today's entries
router.get("/today", userAuth, async (req, res) => {
  try {
    const today = getTodayName();
    const entries = await TimetableEntry.find({ isActive: true, dayOfWeek: today })
      .sort({ startTime: 1 })
      .lean();
    res.json({ data: entries, day: today });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/timetable/week — alias for full weekly view (same as /)
router.get("/week", userAuth, async (req, res) => {
  try {
    const entries = await TimetableEntry.find({ isActive: true })
      .sort({ startTime: 1 })
      .lean();
    const grouped = {};
    DAYS.forEach((d) => { grouped[d] = []; });
    entries.forEach((e) => { grouped[e.dayOfWeek]?.push(e); });
    res.json({ data: entries, grouped });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   ADMIN-ONLY ROUTES  (userAuth + adminAuth)
══════════════════════════════════════════════════════════════ */

// POST /api/admin/timetable — create entry
router.post("/admin", userAuth, adminAuth, async (req, res) => {
  try {
    const err = validateEntry(req.body);
    if (err) return res.status(400).json({ message: err });

    const entry = new TimetableEntry({
      ...req.body,
      meetingLink: req.body.meetingLink?.trim() || "",
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    await entry.save();
    res.status(201).json({ message: "Entry created", data: entry });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/admin/timetable/:id — update entry
router.put("/admin/:id", userAuth, adminAuth, async (req, res) => {
  try {
    const err = validateEntry(req.body);
    if (err) return res.status(400).json({ message: err });

    const entry = await TimetableEntry.findByIdAndUpdate(
      req.params.id,
      { ...req.body, meetingLink: req.body.meetingLink?.trim() || "", updatedBy: req.user._id },
      { new: true, runValidators: true }
    );

    if (!entry) return res.status(404).json({ message: "Entry not found" });
    res.json({ message: "Entry updated", data: entry });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/admin/timetable/:id — delete entry
router.delete("/admin/:id", userAuth, adminAuth, async (req, res) => {
  try {
    const entry = await TimetableEntry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    res.json({ message: "Entry deleted" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
