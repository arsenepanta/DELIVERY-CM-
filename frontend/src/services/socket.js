import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

let socket = null;

export const connectSocket = (userId) => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'], // WebSocket en priorité
      cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST']
      }
    });
  }

  if (!socket.connected) {
    socket.connect();
  }

  socket.off('connect');
  socket.on('connect', () => {
    console.log('🔌 Socket connecté:', socket.id);
    if (userId) {
      socket.emit('identify', userId.toString());
      console.log('👤 Identifié:', userId);
    }
  });

  if (socket.connected && userId) {
    socket.emit('identify', userId.toString());
  }

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
