const express = require('express');
const router = express.Router();
const { proteger, adminOnly } = require('../middlewares/authMiddleware');
const User = require('../models/User');
const Commande = require('../models/Commande');

// Toutes les routes admin sont protégées
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
      totalCommandes,
      commandesActives,
      commandesLivrees,
      revenusAgg
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'client' }),
      User.countDocuments({ role: 'livreur' }),
      Commande.countDocuments(),
      Commande.countDocuments({ statut: { $in: ['en_attente', 'acceptee', 'en_cours'] } }),
      Commande.countDocuments({ statut: 'livree' }),
      Commande.aggregate([
        { $match: { statut: 'livree' } },
        { $group: { _id: null, total: { $sum: '$prix' } } }
      ])
    ]);

    res.json({
      users: { total: totalUsers, clients: totalClients, livreurs: totalLivreurs },
      commandes: { total: totalCommandes, actives: commandesActives, livrees: commandesLivrees },
      revenus: revenusAgg[0]?.total || 0
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
      { nom:       { $regex: search, $options: 'i' } },
      { prenom:    { $regex: search, $options: 'i' } },
      { telephone: { $regex: search, $options: 'i' } },
      { email:     { $regex: search, $options: 'i' } }
    ];

    const users = await User.find(query)
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Bloquer / Débloquer
router.patch('/users/:id/bloquer', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    user.isBlocked = !user.isBlocked;
    await user.save();

    // 🔔 NOTIFICATION SOCKET
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    const socketId = connectedUsers[user._id?.toString()];

    if (socketId) {
      io.to(socketId).emit('compte_bloque', {
        message: user.isBlocked 
          ? '🔒 Votre compte a été bloqué par un admin'
          : '✅ Votre compte a été débloqué',
        isBlocked: user.isBlocked
      });
      console.log(`📨 Notification blocage → User ${user._id}`);
    }

    res.json({
      message: user.isBlocked ? 'Utilisateur bloqué' : 'Utilisateur débloqué',
      isBlocked: user.isBlocked,
      user: {
        _id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        isBlocked: user.isBlocked
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Changer le rôle
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const rolesValides = ['client', 'livreur', 'admin'];
    if (!rolesValides.includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    res.json({ message: 'Rôle modifié', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Supprimer un user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    // 🔔 Notifier si l'utilisateur était connecté
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    const socketId = connectedUsers[user._id?.toString()];
    
    if (socketId) {
      io.to(socketId).emit('compte_supprime', {
        message: '❌ Votre compte a été supprimé'
      });
      delete connectedUsers[user._id?.toString()];
    }

    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =====================
// STATS LIVREURS
// =====================
router.get('/livreurs/stats', async (req, res) => {
  try {
    const livreurs = await User.find({ role: 'livreur' });

    const stats = await Promise.all(livreurs.map(async (livreur) => {
      const [total, livrees, revenusAgg] = await Promise.all([
        Commande.countDocuments({ livreur: livreur._id }),
        Commande.countDocuments({ livreur: livreur._id, statut: 'livree' }),
        Commande.aggregate([
          { $match: { livreur: livreur._id, statut: 'livree' } },
          { $group: { _id: null, total: { $sum: '$prix' } } }
        ])
      ]);

      return {
        livreur: {
          _id: livreur._id,
          nom: livreur.nom,
          prenom: livreur.prenom,
          email: livreur.email,
          telephone: livreur.telephone
        },
        stats: {
          totalCommandes: total,
          commandesLivrees: livrees,
          revenus: revenusAgg[0]?.total || 0
        }
      };
    }));

    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
