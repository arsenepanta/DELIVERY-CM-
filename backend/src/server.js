const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorMiddleware = require('./middlewares/errorMiddleware');

dotenv.config();
connectDB();

// Routes
const authRoutes      = require('./routes/authRoutes');
const storeRoutes     = require('./routes/storeRoutes');
const productRoutes   = require('./routes/productRoutes');
const orderRoutes     = require('./routes/orderRoutes');
const commandeRoutes  = require('./routes/commandeRoutes');


const app = express();
app.use(cors());
app.use(express.json());

// Routes API
app.use('/api/auth',       authRoutes);
app.use('/api/stores',     storeRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/commandes',  commandeRoutes);
app.use('/api/admin', require('./routes/admin'));

// Route de test
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Delivery CM API - Opérationnelle!',
    version: '1.0.0',
    routes: ['/api/auth', '/api/stores', '/api/products', '/api/orders', '/api/commandes']
  });
});

app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
