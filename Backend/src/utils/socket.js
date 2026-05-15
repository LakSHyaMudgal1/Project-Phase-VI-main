// utils/socket.js
const { Server } = require("socket.io");
const Message = require("../models/message");
const CodeSession = require("../models/codeSession");

let io;

// Track which users are in which rooms for video call awareness
// { roomId: { socketId: { userId, userName } } }
const roomCallParticipants = {};

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (origin, cb) => cb(null, true),
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    /* ──────────────────────────────────────────────────
       ROOM JOIN / LEAVE
    ────────────────────────────────────────────────── */
    socket.on("joinRoom", ({ roomId, userId, userName }) => {
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.userId = userId;
      socket.data.userName = userName;
      console.log(`${userName || socket.id} joined room ${roomId}`);
    });

    socket.on("leaveRoom", ({ roomId }) => {
      socket.leave(roomId);
      _cleanupCallParticipant(socket, roomId);
    });

    /* ──────────────────────────────────────────────────
       CHAT — persist to DB, broadcast to room
    ────────────────────────────────────────────────── */
    socket.on("chatMessage", async ({ roomId, message, sender, senderId }) => {
      if (!roomId || !message?.trim()) return;

      const timestamp = new Date().toISOString();
      const payload = {
        sender,
        senderId,
        message: message.trim(),
        timestamp,
      };

      // Broadcast immediately for real-time feel
      io.to(roomId).emit("chatMessage", payload);

      // Persist to DB
      try {
        if (senderId && roomId) {
          await Message.create({
            roomId,
            senderId,
            senderName: sender,
            message: message.trim(),
          });
        }
      } catch (err) {
        console.error("[socket] Failed to save message:", err.message);
      }
    });

    /* ──────────────────────────────────────────────────
       TYPING INDICATORS
    ────────────────────────────────────────────────── */
    socket.on("typing", ({ roomId, sender }) => {
      socket.to(roomId).emit("typing", { sender });
    });

    socket.on("stopTyping", ({ roomId, sender }) => {
      socket.to(roomId).emit("stopTyping", { sender });
    });

    /* ──────────────────────────────────────────────────
       COLLABORATIVE CODE — broadcast + persist
    ────────────────────────────────────────────────── */
    socket.on("codeUpdate", async ({ roomId, code, language }) => {
      // Broadcast to everyone else in the room immediately
      socket.to(roomId).emit("codeUpdate", { code, language });

      // Debounced DB save — overwrite the single CodeSession doc for this room
      try {
        await CodeSession.findOneAndUpdate(
          { roomId },
          { currentCode: code, language },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error("[socket] Failed to save code:", err.message);
      }
    });

    // Cursor position broadcast (no DB persistence needed)
    socket.on("cursorUpdate", ({ roomId, cursor, sender, color }) => {
      socket.to(roomId).emit("cursorUpdate", {
        cursor,
        sender,
        color,
        socketId: socket.id,
      });
    });

    /* ──────────────────────────────────────────────────
       SCREEN SHARE (WebRTC signaling)
    ────────────────────────────────────────────────── */
    socket.on("screenShareOffer", ({ roomId, offer }) => {
      socket.to(roomId).emit("screenShareOffer", { offer, from: socket.id });
    });

    socket.on("screenShareAnswer", ({ to, answer }) => {
      io.to(to).emit("screenShareAnswer", { answer, from: socket.id });
    });

    socket.on("iceCandidate", ({ to, candidate }) => {
      io.to(to).emit("iceCandidate", { candidate, from: socket.id });
    });

    socket.on("screenShareStopped", ({ roomId }) => {
      socket.to(roomId).emit("screenShareStopped");
    });

    /* ──────────────────────────────────────────────────
       VIDEO CALL (WebRTC mesh signaling)
    ────────────────────────────────────────────────── */
    socket.on("videoCallJoin", ({ roomId, userName, userId }) => {
      // Track participant
      if (!roomCallParticipants[roomId]) roomCallParticipants[roomId] = {};
      roomCallParticipants[roomId][socket.id] = { userId, userName };

      // Notify everyone else in the room
      socket.to(roomId).emit("videoCallUserJoined", {
        socketId: socket.id,
        userName,
        userId,
      });

      // Send the new joiner the list of existing call participants
      const existing = Object.entries(roomCallParticipants[roomId])
        .filter(([sid]) => sid !== socket.id)
        .map(([sid, info]) => ({ socketId: sid, ...info }));

      socket.emit("existingCallParticipants", { participants: existing });
    });

    socket.on("videoCallLeave", ({ roomId }) => {
      _cleanupCallParticipant(socket, roomId);
    });

    // Relay offer to a specific peer
    socket.on("videoOffer", ({ to, offer, userName, userId }) => {
      io.to(to).emit("videoOffer", {
        from: socket.id,
        offer,
        userName,
        userId,
      });
    });

    // Relay answer to a specific peer
    socket.on("videoAnswer", ({ to, answer }) => {
      io.to(to).emit("videoAnswer", { from: socket.id, answer });
    });

    // Relay ICE candidate to a specific peer
    socket.on("videoIceCandidate", ({ to, candidate }) => {
      io.to(to).emit("videoIceCandidate", { from: socket.id, candidate });
    });

    /* ──────────────────────────────────────────────────
       DISCONNECT — clean up call state
    ────────────────────────────────────────────────── */
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      const roomId = socket.data.roomId;
      if (roomId) {
        _cleanupCallParticipant(socket, roomId);
      }
    });
  });

  return io;
};

/* ──────────────────────────────────────────────────────────
   HELPER — remove from call participants and notify room
────────────────────────────────────────────────────────── */
function _cleanupCallParticipant(socket, roomId) {
  if (roomCallParticipants[roomId]) {
    delete roomCallParticipants[roomId][socket.id];
    if (Object.keys(roomCallParticipants[roomId]).length === 0) {
      delete roomCallParticipants[roomId];
    }
  }
  socket.to(roomId).emit("videoCallUserLeft", { socketId: socket.id });
}

const getIO = () => {
  if (!io) throw new Error("Socket not initialized");
  return io;
};

module.exports = { initSocket, getIO };
