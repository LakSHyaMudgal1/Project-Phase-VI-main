// utils/socket.js
import { io } from "socket.io-client";
import { BASE_URL } from "./constants";

export const socket = io(BASE_URL, {
  withCredentials: true,
});