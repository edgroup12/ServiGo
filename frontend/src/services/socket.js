import { io } from "socket.io-client";

const isProduction = import.meta.env.PROD;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5001";

// In production (Vercel serverless), Socket.io is not available — create a stub
const socket = isProduction
  ? {
    on: () => { },
    off: () => { },
    emit: () => { },
    connect: () => { },
    disconnect: () => { },
    connected: false,
  }
  : io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
  });

export default socket;
