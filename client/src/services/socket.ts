import { io, Socket } from 'socket.io-client';

// 포트 24700 또는 현재 호스트
const SOCKET_URL = window.location.port === '24701' ? 'http://localhost:24700' : '/';

export const socket: Socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});

socket.on('connect', () => {
  console.log('[Socket] Connected to server, ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('[Socket] Disconnected from server');
});
