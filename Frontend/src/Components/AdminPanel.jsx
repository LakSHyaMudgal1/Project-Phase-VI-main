// Components/AdminPanel.jsx
// Admin-only timetable management panel.
// Backend enforces admin role — this is a second layer of UX protection.
import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Input from "./ui/Input";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TYPES = ["class", "meeting", "doubt session", "coding session", "other"];

const TYPE_COLORS = {
  "class":           "bg-primary/15 text-primary border-primary/30",
  "meeting":         "bg-purple-500/15 text-purple-300 border-purple-500/30",
  "doubt session":   "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  "coding session":  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "other":           "bg-white/10 text-mutedForeground border-white/10",
};

const EMPTY_FORM = {
  title: "", subject: "", teacherName: "", dayOfWeek: "Monday",
  startTime: "", endTime: "", meetingLink: "", type: "class", description: "", isActive: true,
};

function validate(form) {
  if (!form.title.trim())   return "Title is required.";
  if (!form.dayOfWeek)      return "Day is required.";
  if (!form.startTime)      return "Start time is required.";
  if (!form.endTime)        return "End time is required.";
  if (form.startTime >= form.endTime) return "End time must be after start time.";
  if (form.meetingLink.trim()) {
    try { new URL(form.meetingLink.trim()); }
    catch { return "Meeting link must be a valid URL (include https://)."; }
  }
  return null;
}

export default function AdminPanel() {
  const user = useSelector((s) => s.user);
  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterDay, setFilterDay] = useState("All");
  const [deleteConfirm, setDeleteConfirm] = useState(null); // id to confirm delete

  // ── Guard: redirect non-admins ────────────────────────────────────────
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  // ── Fetch all entries ─────────────────────────────────────────────────
  const fetchEntries = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/timetable`, { withCredentials: true });
      setEntries(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEntries(); }, []);

  // ── Form helpers ──────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (entry) => {
    setForm({
      title:       entry.title       || "",
      subject:     entry.subject     || "",
      teacherName: entry.teacherName || "",
      dayOfWeek:   entry.dayOfWeek   || "Monday",
      startTime:   entry.startTime   || "",
      endTime:     entry.endTime     || "",
      meetingLink: entry.meetingLink || "",
      type:        entry.type        || "class",
      description: entry.description || "",
      isActive:    entry.isActive    ?? true,
    });
    setEditingId(entry._id);
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setFormError("");
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate(form);
    if (err) { setFormError(err); return; }
    setFormError("");
    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`${BASE_URL}/api/timetable/admin/${editingId}`, form, { withCredentials: true });
      } else {
        await axios.post(`${BASE_URL}/api/timetable/admin`, form, { withCredentials: true });
      }
      await fetchEntries();
      closeForm();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save entry.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${BASE_URL}/api/timetable/admin/${id}`, { withCredentials: true });
      setDeleteConfirm(null);
      await fetchEntries();
    } catch (err) {
      console.error(err);
    }
  };

  // ── Access denied screen ──────────────────────────────────────────────
  if (user && user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
        <div className="text-4xl">🔒</div>
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-sm text-mutedForeground">This page is for admins only.</p>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  const filtered = filterDay === "All" ? entries : entries.filter((e) => e.dayOfWeek === filterDay);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Admin Panel</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30 font-semibold">
              ADMIN
            </span>
          </div>
          <p className="text-sm text-mutedForeground mt-1">Manage the weekly timetable.</p>
        </div>
        <Button onClick={openCreate}>+ Add Entry</Button>
      </div>

      {/* Day filter */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {["All", ...DAYS].map((day) => (
          <button
            key={day}
            onClick={() => setFilterDay(day)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              filterDay === day
                ? "bg-primary/20 border-primary/50 text-primary"
                : "bg-white/5 border-white/10 text-mutedForeground hover:bg-white/10 hover:text-foreground"
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Entry table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="text-3xl mb-2">📅</div>
          <p className="text-sm text-mutedForeground">No entries yet. Click "+ Add Entry" to create one.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <div
              key={entry._id}
              className="flex items-center gap-4 px-4 py-3 rounded-2xl border border-white/10 bg-white/3 hover:bg-white/5 transition"
            >
              {/* Day + time */}
              <div className="flex-shrink-0 w-28 text-center">
                <p className="text-xs font-semibold text-foreground">{entry.dayOfWeek}</p>
                <p className="text-[10px] text-mutedForeground mt-0.5">
                  {entry.startTime} – {entry.endTime}
                </p>
              </div>

              {/* Title + subject */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.title}</p>
                <p className="text-[11px] text-mutedForeground truncate">
                  {[entry.subject, entry.teacherName].filter(Boolean).join(" · ")}
                </p>
              </div>

              {/* Type badge */}
              <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[entry.type] || TYPE_COLORS.other}`}>
                {entry.type}
              </span>

              {/* Active indicator */}
              <span className={`flex-shrink-0 w-2 h-2 rounded-full ${entry.isActive ? "bg-green-400" : "bg-white/20"}`} title={entry.isActive ? "Active" : "Inactive"} />

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(entry)}
                  className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-mutedForeground hover:text-foreground hover:bg-white/10 transition"
                >
                  Edit
                </button>
                {deleteConfirm === entry._id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDelete(entry._id)}
                      className="text-xs px-3 py-1.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 transition"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="text-xs px-2 py-1.5 rounded-xl bg-white/5 border border-white/10 text-mutedForeground hover:bg-white/10 transition"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(entry._id)}
                    className="text-xs px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FORM MODAL ─────────────────────────────────────────────────── */}
      {formOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-white/10 shadow-glass overflow-hidden"
            style={{ background: "hsl(222,47%,7%)" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-base font-semibold">
                {editingId ? "Edit Entry" : "Add Timetable Entry"}
              </h2>
              <button onClick={closeForm} className="text-mutedForeground hover:text-foreground transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                  {formError}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs text-mutedForeground mb-1.5">Title *</label>
                <Input name="title" value={form.title} onChange={handleChange} placeholder="e.g. React Lecture" required />
              </div>

              {/* Subject + Teacher */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-mutedForeground mb-1.5">Subject</label>
                  <Input name="subject" value={form.subject} onChange={handleChange} placeholder="e.g. Web Dev" />
                </div>
                <div>
                  <label className="block text-xs text-mutedForeground mb-1.5">Teacher / Host</label>
                  <Input name="teacherName" value={form.teacherName} onChange={handleChange} placeholder="e.g. Dr. Smith" />
                </div>
              </div>

              {/* Day + Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-mutedForeground mb-1.5">Day *</label>
                  <select
                    name="dayOfWeek" value={form.dayOfWeek} onChange={handleChange}
                    className="h-10 w-full rounded-2xl px-3 text-sm bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {DAYS.map((d) => <option key={d} value={d} className="bg-[#0d1117]">{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-mutedForeground mb-1.5">Type</label>
                  <select
                    name="type" value={form.type} onChange={handleChange}
                    className="h-10 w-full rounded-2xl px-3 text-sm bg-white/5 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {TYPES.map((t) => <option key={t} value={t} className="bg-[#0d1117]">{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Start + End time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-mutedForeground mb-1.5">Start Time *</label>
                  <Input type="time" name="startTime" value={form.startTime} onChange={handleChange} required />
                </div>
                <div>
                  <label className="block text-xs text-mutedForeground mb-1.5">End Time *</label>
                  <Input type="time" name="endTime" value={form.endTime} onChange={handleChange} required />
                </div>
              </div>

              {/* Meeting link */}
              <div>
                <label className="block text-xs text-mutedForeground mb-1.5">Meeting Link</label>
                <Input
                  name="meetingLink" value={form.meetingLink} onChange={handleChange}
                  placeholder="https://meet.google.com/..."
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-mutedForeground mb-1.5">Description</label>
                <textarea
                  name="description" value={form.description} onChange={handleChange}
                  rows={2}
                  placeholder="Optional notes…"
                  className="w-full rounded-2xl px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-foreground placeholder:text-mutedForeground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.isActive ? "bg-primary" : "bg-white/20"}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
                <span className="text-sm text-mutedForeground">Active</span>
              </label>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? "Saving…" : editingId ? "Save Changes" : "Add Entry"}
                </Button>
                <Button type="button" variant="secondary" onClick={closeForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
