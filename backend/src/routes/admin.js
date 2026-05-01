const express = require('express');
const router = express.Router();
const { proteger, adminOnly } = require('../middlewares/authMiddleware');
const User = require('../models/User');
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');

// Middleware - toutes les routes admin sont protégées
router.use(proteger);
router.use(adminOnly);

// =====================
// STATS GLOBALES
// =====================
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalClients,
      totalLivreurs,
      totalOrders,
      activeOrders,
      deliveredOrders,
      totalRevenue
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'client' }),
      User.countDocuments({ role: 'livreur' }),
      Order.countDocuments(),
      Order.countDocuments({ status: { $in: ['pending', 'accepted', 'picked_up'] } }),
      Order.countDocuments({ status: 'delivered' }),
      Order.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$price' } } }
      ])
    ]);

    res.json({
      users: { total: totalUsers, clients: totalClients, livreurs: totalLivreurs },
      orders: { total: totalOrders, active: activeOrders, delivered: deliveredOrders },
      revenue: totalRevenue[0]?.total || 0
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =====================
// GESTION USERS
// =====================
router.get('/users', async (req, res) => {
  try {
    const { role, search } = req.query;
    let query = {};
    if (role) query.role = role;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/users/:id/toggle-block', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({ 
      message: user.isBlocked ? 'Utilisateur bloqué' : 'Utilisateur débloqué',
      isBlocked: user.isBlocked 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =====================
// GESTION COMMANDES
// =====================
router.get('/orders', async (req, res) => {
  try {
    const { status, city } = req.query;
    let query = {};
    if (status) query.status = status;
    if (city) query['pickup.city'] = { $regex: city, $options: 'i' };

    const orders = await Order.find(query)
      .populate('client', 'name phone')
      .populate('livreur', 'name phone')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =====================
// STATS LIVREURS
// =====================
router.get('/livreurs/stats', async (req, res) => {
  try {
    const livreurs = await User.find({ role: 'livreur' }).select('-password');
    
    const stats = await Promise.all(livreurs.map(async (livreur) => {
      const [total, delivered, earnings] = await Promise.all([
        Order.countDocuments({ livreur: livreur._id }),
        Order.countDocuments({ livreur: livreur._id, status: 'delivered' }),
        Order.aggregate([
          { $match: { livreur: livreur._id, status: 'delivered' } },
          { $group: { _id: null, total: { $sum: '$price' } } }
        ])
      ]);

      return {
        ...livreur.toObject(),
        stats: {
          total,
          delivered,
          earnings: earnings[0]?.total || 0
        }
      };
    }));

    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
