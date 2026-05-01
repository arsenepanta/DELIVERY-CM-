const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const errorMiddleware = require('./middlewares/errorMiddleware');

dotenv.config();
connectDB();

// Routes
const authRoutes     = require('./routes/authRoutes');
const storeRoutes    = require('./routes/storeRoutes');
const productRoutes  = require('./routes/productRoutes');
const orderRoutes    = require('./routes/orderRoutes');
const commandeRoutes = require('./routes/commandeRoutes');

const app = express();
const server = http.createServer(app);

// 🔌 Socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

const connectedUsers = {}; // { userId: socketId }

io.on('connection', (socket) => {
  console.log('🔌 Nouveau client connecté:', socket.id);

  // Un utilisateur s'identifie après login
  socket.on('identify', (userId) => {
    connectedUsers[userId] = socket.id;
    console.log(`👤 User ${userId} → socket ${socket.id}`);
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of Object.entries(connectedUsers)) {
      if (socketId === socket.id) {
        delete connectedUsers[userId];
        console.log(`👋 User ${userId} déconnecté`);
        break;
      }
    }
  });
});

// Rendre io accessible dans les controllers
app.set('io', io);
app.set('connectedUsers', connectedUsers);
app.set('connectedUsers', connectedUsers);

app.use(cors());
app.use(express.json());

// Routes API
app.use('/api/auth',      authRoutes);
app.use('/api/stores',    storeRoutes);
app.use('/api/products',  productRoutes);
app.use('/api/orders',    orderRoutes);
app.use('/api/commandes', commandeRoutes);
app.use('/api/admin',     require('./routes/admin'));

// Route de test
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Delivery CM API - Opérationnelle!',
    version: '1.0.0',
    routes: ['/api/auth', '/api/stores', '/api/products', '/api/orders', '/api/commandes']
  });
});

app.use(errorMiddleware);

// ⚠️ server.listen au lieu de app.listen (obligatoire pour Socket.io)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur + Socket.io démarré sur le port ${PORT}`);
});
