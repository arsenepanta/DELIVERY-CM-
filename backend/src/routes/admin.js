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

    res.json({
      message: user.isBlocked ? 'Utilisateur bloqué' : 'Utilisateur débloqué',
      isBlocked: user.isBlocked
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
    await User.findByIdAndDelete(req.params.id);
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
        ...livreur.toObject(),
        stats: {
          total,
          livrees,
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
