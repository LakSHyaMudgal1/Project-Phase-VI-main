// utils/socket.js
import { io } from "socket.io-client";
import { BASE_URL } from "./constants";

export const socket = io(BASE_URL, {
  withCredentials: true,
  // Automatically reconnect with exponential backoff
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
