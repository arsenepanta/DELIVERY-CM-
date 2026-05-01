const express = require('express');
const router = express.Router();
const { proteger, autoriser } = require('../middlewares/authMiddleware');
const {
  creerCommande, mesCommandes,
  commandesDisponibles, accepterCommande, mesLivraisons, majStatut,
  toutesCommandes
} = require('../controllers/commandeController');

// Client
router.post('/', proteger, autoriser('client'), creerCommande);
router.get('/mes-commandes', proteger, autoriser('client'), mesCommandes);

// Livreur
router.get('/disponibles', proteger, autoriser('livreur'), commandesDisponibles);
router.get('/mes-livraisons', proteger, autoriser('livreur'), mesLivraisons);
router.put('/:id/accepter', proteger, autoriser('livreur'), accepterCommande);
router.put('/:id/statut', proteger, autoriser('livreur'), majStatut);

// Admin
router.get('/toutes', proteger, autoriser('admin'), toutesCommandes);

module.exports = router;
