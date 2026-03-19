import { io } from 'socket.io-client';

let socket = null;
let connectedUserId = null;

export function getSocket() {
  return socket;
}

export function connectSocket({ userId } = {}) {
  const uid = userId ? String(userId) : '';
  if (socket?.connected && connectedUserId === uid) {
    socket.emit('join_dm', uid);
    return socket;
  }
  if (socket && connectedUserId !== uid) {
    socket.disconnect();
    socket = null;
    connectedUserId = null;
  }
  if (socket) return socket;

  socket = io('/', {
    transports: ['websocket', 'polling'],
    query: uid ? { userId: uid } : {},
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });
  connectedUserId = uid || null;
  socket.on('connect', () => {
    if (connectedUserId) socket.emit('join_dm', connectedUserId);
  });
  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
  connectedUserId = null;
}

