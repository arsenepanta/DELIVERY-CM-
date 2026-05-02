import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

let socket = null;
let onBlockedCallback = null;

export const connectSocket = (userId, token) => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
      auth: {
        token: token // Envoyer le token au serveur
      },
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

  // 🔒 ÉCOUTER LES ÉVÉNEMENTS DE BLOCAGE
  socket.off('compte_bloque');
  socket.on('compte_bloque', (data) => {
    console.log('🔒 Compte bloqué:', data.message);
    if (onBlockedCallback) {
      onBlockedCallback(data);
    }
  });

  socket.on('disconnect', () => {
    console.log('👋 Socket déconnecté');
  });

  // Gestion des erreurs
  socket.off('connect_error');
  socket.on('connect_error', (error) => {
    console.error('❌ Erreur de connexion socket:', error);
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

// Callback pour gérer le blocage
export const onAccountBlocked = (callback) => {
  onBlockedCallback = callback;
};
