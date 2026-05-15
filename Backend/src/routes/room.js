// routes/room.js
const express = require("express");
const roomRouter = express.Router();

const Room = require("../models/room");
const Message = require("../models/message");
const CodeSession = require("../models/codeSession");
const userAuth = require("../middleware/auth");
const { getIO } = require("../utils/socket");
const User = require("../models/user");

/* ─────────────────────────────────────────────────────────
   CREATE ROOM
───────────────────────────────────────────────────────── */
roomRouter.post("/create", userAuth, async (req, res) => {
  try {
    const { name } = req.body;

    const room = new Room({
      name,
      owner: req.user._id,
      members: [{ userId: req.user._id }],
      permanentMembers: [req.user._id],
      activityLog: [{ message: `${req.user.firstName} created room` }],
    });

    await room.save();

    // Create a blank code session for this room
    await CodeSession.create({ roomId: room._id });

    res.json({ message: "Room created", data: room });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

/* ─────────────────────────────────────────────────────────
   INVITE USER
───────────────────────────────────────────────────────── */
roomRouter.post("/invite", userAuth, async (req, res) => {
  try {
    const { roomId, emailId } = req.body;

    const room = await Room.findById(roomId);
    if (!room || room.isDeleted) throw new Error("Room not found");

    if (room.owner.toString() !== req.user._id.toString()) {
      throw new Error("Only owner can invite");
    }

    const userToInvite = await User.findOne({ emailId });
    if (!userToInvite) throw new Error("User not found");

    const userId = userToInvite._id.toString();

    const alreadyPermanent = room.permanentMembers.some((id) => id.toString() === userId);
    const alreadyPending = room.invitedUsers.some((id) => id.toString() === userId);

    if (alreadyPermanent || alreadyPending) {
      throw new Error("User already invited");
    }

    room.invitedUsers.push(userToInvite._id);
    room.permanentMembers.push(userToInvite._id);
    room.activityLog.push({
      message: `${req.user.firstName} invited ${userToInvite.firstName}`,
    });

    await room.save();

    const io = getIO();
    io.to(roomId).emit("roomUpdate", {
      message: `${req.user.firstName} invited ${userToInvite.firstName}`,
    });

    res.json({ message: "User invited successfully" });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

/* ─────────────────────────────────────────────────────────
   GET INVITES / REJOINABLE ROOMS
───────────────────────────────────────────────────────── */
roomRouter.get("/invites", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;

    const rooms = await Room.find({
      isDeleted: false,
      $or: [{ invitedUsers: userId }, { permanentMembers: userId }],
    }).populate("owner", "firstName");

    res.json({ data: rooms });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

/* ─────────────────────────────────────────────────────────
   JOIN / REJOIN ROOM
───────────────────────────────────────────────────────── */
roomRouter.post("/join", userAuth, async (req, res) => {
  try {
    const { roomId } = req.body;
    const userId = req.user._id.toString();

    const room = await Room.findById(roomId);
    if (!room || room.isDeleted) throw new Error("Room not found or deleted");

    const hasPendingInvite = room.invitedUsers.some((id) => id.toString() === userId);
    const isPermanentMember = room.permanentMembers.some((id) => id.toString() === userId);
    const isOwner = room.owner.toString() === userId;

    if (!hasPendingInvite && !isPermanentMember && !isOwner) {
      throw new Error("Not invited");
    }

    // Remove from active members first to avoid duplicates, then re-add
    room.members = room.members.filter((m) => m.userId.toString() !== userId);
    room.members.push({ userId: req.user._id });

    // Remove from pending invites (permanent membership stays)
    room.invitedUsers = room.invitedUsers.filter((id) => id.toString() !== userId);

    room.activityLog.push({ message: `${req.user.firstName} joined` });

    await room.save();

    const io = getIO();
    io.to(roomId).emit("roomUpdate", {
      message: `${req.user.firstName} joined the room`,
    });

    res.json({ message: "Joined room" });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

/* ─────────────────────────────────────────────────────────
   LEAVE ROOM  (does NOT delete room or revoke access)
───────────────────────────────────────────────────────── */
roomRouter.post("/leave", userAuth, async (req, res) => {
  try {
    const { roomId } = req.body;
    const userId = req.user._id.toString();

    const room = await Room.findById(roomId);
    if (!room) throw new Error("Room not found");

    // Remove from active members only — permanent membership stays
    room.members = room.members.filter((m) => m.userId.toString() !== userId);
    room.activityLog.push({ message: `${req.user.firstName} left` });

    await room.save();

    const io = getIO();
    io.to(roomId).emit("roomUpdate", {
      message: `${req.user.firstName} left the room`,
    });

    res.json({ message: "Left room" });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

/* ─────────────────────────────────────────────────────────
   DELETE ROOM  (owner only — hard delete all data)
───────────────────────────────────────────────────────── */
roomRouter.delete("/delete/:roomId", userAuth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);

    if (!room) throw new Error("Room not found");
    if (room.owner.toString() !== req.user._id.toString()) {
      throw new Error("Only the room owner can delete this room");
    }

    // Soft-delete the room
    room.isDeleted = true;
    room.members = [];
    room.permanentMembers = [];
    room.invitedUsers = [];
    await room.save();

    // Delete all associated data
    await Message.deleteMany({ roomId });
    await CodeSession.deleteOne({ roomId });

    const io = getIO();
    io.to(roomId).emit("roomDeleted", { message: "Room has been deleted by the owner." });

    res.json({ message: "Room deleted successfully" });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

/* ─────────────────────────────────────────────────────────
   REMOVE MEMBER  (owner only)
───────────────────────────────────────────────────────── */
roomRouter.post("/remove-member", userAuth, async (req, res) => {
  try {
    const { roomId, userId: targetUserId } = req.body;
    const room = await Room.findById(roomId);

    if (!room || room.isDeleted) throw new Error("Room not found");
    if (room.owner.toString() !== req.user._id.toString()) {
      throw new Error("Only the room owner can remove members");
    }
    if (room.owner.toString() === targetUserId) {
      throw new Error("Cannot remove the room owner");
    }

    room.members = room.members.filter((m) => m.userId.toString() !== targetUserId);
    room.permanentMembers = room.permanentMembers.filter((id) => id.toString() !== targetUserId);
    room.invitedUsers = room.invitedUsers.filter((id) => id.toString() !== targetUserId);

    const removedUser = await User.findById(targetUserId);
    room.activityLog.push({
      message: `${req.user.firstName} removed ${removedUser?.firstName || "a member"}`,
    });

    await room.save();

    const io = getIO();
    io.to(roomId).emit("memberRemoved", { userId: targetUserId });
    io.to(roomId).emit("roomUpdate", {
      message: `${removedUser?.firstName || "A member"} was removed`,
    });

    res.json({ message: "Member removed" });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

/* ─────────────────────────────────────────────────────────
   GET ROOM
───────────────────────────────────────────────────────── */
roomRouter.get("/get/:roomId", userAuth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId)
      .populate("owner", "firstName")
      .populate("members.userId", "firstName");

    if (!room || room.isDeleted) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json({ data: room });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

/* ─────────────────────────────────────────────────────────
   GET ACTIVITY LOG
───────────────────────────────────────────────────────── */
roomRouter.get("/activity/:roomId", userAuth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    res.json({ data: room?.activityLog || [] });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

/* ─────────────────────────────────────────────────────────
   GET CHAT HISTORY  (last 100 messages)
───────────────────────────────────────────────────────── */
roomRouter.get("/messages/:roomId", userAuth, async (req, res) => {
  try {
    const messages = await Message.find({ roomId: req.params.roomId })
      .sort({ createdAt: 1 })
      .limit(100)
      .populate("senderId", "firstName");

    res.json({ data: messages });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

/* ─────────────────────────────────────────────────────────
   GET CODE SESSION
───────────────────────────────────────────────────────── */
roomRouter.get("/code/:roomId", userAuth, async (req, res) => {
  try {
    let session = await CodeSession.findOne({ roomId: req.params.roomId });
    if (!session) {
      session = await CodeSession.create({ roomId: req.params.roomId });
    }
    res.json({ data: session });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

/* ─────────────────────────────────────────────────────────
   GET MY ROOMS  (rooms I own or am a permanent member of)
───────────────────────────────────────────────────────── */
roomRouter.get("/my-rooms", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const rooms = await Room.find({
      isDeleted: false,
      $or: [{ owner: userId }, { permanentMembers: userId }],
    })
      .populate("owner", "firstName")
      .sort({ updatedAt: -1 });

    res.json({ data: rooms });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

module.exports = roomRouter;
