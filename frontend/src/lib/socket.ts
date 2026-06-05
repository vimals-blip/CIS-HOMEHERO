import { io, type Socket } from "socket.io-client";
import { API_BASE, getAccessToken } from "@/lib/api";

// Socket.IO shares the API host; strip the /api/v1 path to get the origin.
const SOCKET_URL = API_BASE.replace(/\/api\/v\d+\/?$/, "");

let socket: Socket | null = null;

// Lazily create a single authenticated socket for the app.
export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  const token = getAccessToken();
  if (!token) return null;
  if (!socket) {
    socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket", "polling"] });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.close();
  socket = null;
}
