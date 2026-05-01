import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

let socket = null;

export const connectSocket = (userId) => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL);

  socket.on('connect', () => {
    console.log('🔌 Socket connecté:', socket.id);
    // S'identifier auprès du serveur
    if (userId) {
      socket.emit('identify', userId);
    }
  });

  socket.on('disconnect', () => {
    console.log('👋 Socket déconnecté');
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
