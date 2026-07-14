import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? '';

export function createSocketConnection() {
  return io(SOCKET_URL, {
    autoConnect: false,
  });
}
