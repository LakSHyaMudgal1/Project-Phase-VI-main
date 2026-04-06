// routes/roomRouter.js
const express = require("express");
const roomRouter = express.Router();

const Room = require("../models/room");
const userAuth = require("../middleware/auth");
const { getIO } = require("../utils/socket");
const User = require("../models/user");


roomRouter.post("/create", userAuth, async (req, res) => {
  try {
    const { name } = req.body;

    const room = new Room({
      name,
      owner: req.user._id,
      members: [{ userId: req.user._id }],
      activityLog: [{ message: `${req.user.firstName} created room` }],
    });

    await room.save();

    res.json({ message: "Room created", data: room });
  } catch (err) {
    res.status(400).send(err.message);
  }
});


roomRouter.post("/invite", userAuth, async (req, res) => {
  try {
    const { roomId, emailId } = req.body;

    const room = await Room.findById(roomId);
    if (!room) throw new Error("Room not found");

    if (room.owner.toString() !== req.user._id.toString()) {
      throw new Error("Only owner can invite");
    }

    const userToInvite = await User.findOne({ emailId });
    if (!userToInvite) throw new Error("User not found");

    const userId = userToInvite._id.toString();

    // Already a permanent member (invited before) or pending invite
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


// Returns rooms where user has a pending invite OR is a permanent member (can rejoin)
roomRouter.get("/invites", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;

    const rooms = await Room.find({
      $or: [
        { invitedUsers: userId },
        { permanentMembers: userId },
      ],
    }).populate("owner", "firstName");

    res.json({ data: rooms });
  } catch (err) {
    res.status(400).send(err.message);
  }
});


roomRouter.post("/join", userAuth, async (req, res) => {
  try {
    const { roomId } = req.body;
    const userId = req.user._id.toString();

    const room = await Room.findById(roomId);
    if (!room) throw new Error("Room not found");

    // Allow join if user has a pending invite OR is a permanent member
    const hasPendingInvite = room.invitedUsers.some((id) => id.toString() === userId);
    const isPermanentMember = room.permanentMembers.some((id) => id.toString() === userId);

    if (!hasPendingInvite && !isPermanentMember) {
      throw new Error("Not invited");
    }

    // Prevent duplicate active membership
    const alreadyMember = room.members.some((m) => m.userId.toString() === userId);
    if (alreadyMember) throw new Error("Already in room");

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


roomRouter.post("/leave", userAuth, async (req, res) => {
  try {
    const { roomId } = req.body;
    const userId = req.user._id.toString();

    const room = await Room.findById(roomId);
    if (!room) throw new Error("Room not found");

    const isOwner = room.owner.toString() === userId;

    // Remove from active members
    room.members = room.members.filter((m) => m.userId.toString() !== userId);

    if (isOwner) {
      // Owner leaving — revoke all permanent access so no one can rejoin
      room.permanentMembers = [];
      room.invitedUsers = [];
      room.activityLog.push({ message: `${req.user.firstName} (host) left — room closed` });
    } else {
      room.activityLog.push({ message: `${req.user.firstName} left` });
    }

    await room.save();

    const io = getIO();
    io.to(roomId).emit("roomUpdate", {
      message: isOwner
        ? `${req.user.firstName} (host) left the room`
        : `${req.user.firstName} left the room`,
    });

    res.json({ message: "Left room" });
  } catch (err) {
    res.status(400).send(err.message);
  }
});


roomRouter.get("/get/:roomId", userAuth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId)
      .populate("owner", "firstName")
      .populate("members.userId", "firstName");

    res.json({ data: room });
  } catch (err) {
    res.status(400).send(err.message);
  }
});


roomRouter.get("/activity/:roomId", userAuth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    res.json({ data: room.activityLog });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

module.exports = roomRouter;
