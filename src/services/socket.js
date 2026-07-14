import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://127.0.0.1:4000';

export function createSocketConnection() {
  return io(SOCKET_URL, {
    autoConnect: false,
  });
}
