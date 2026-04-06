// utils/socket.js
const { Server } = require("socket.io");

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (origin, cb) => cb(null, true),
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("joinRoom", (roomId) => {
      socket.join(roomId);
    });

    // Chat — broadcast to everyone in the room
    socket.on("chatMessage", ({ roomId, message, sender }) => {
      if (!roomId || !message?.trim()) return;
      io.to(roomId).emit("chatMessage", {
        sender,
        message: message.trim(),
        timestamp: new Date().toISOString(),
      });
    });

    // Collaborative code — broadcast to everyone else
    socket.on("codeUpdate", ({ roomId, code, language }) => {
      socket.to(roomId).emit("codeUpdate", { code, language });
    });

    // Cursor position broadcast
    socket.on("cursorUpdate", ({ roomId, cursor, sender, color }) => {
      socket.to(roomId).emit("cursorUpdate", { cursor, sender, color, socketId: socket.id });
    });

    // WebRTC signaling for screen share
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

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket not initialized");
  return io;
};

module.exports = { initSocket, getIO };
