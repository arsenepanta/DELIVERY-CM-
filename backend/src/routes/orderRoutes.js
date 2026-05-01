const express = require('express');
const router = express.Router();
const { passerCommande, mesCommandes, getCommande, mettreAJourStatut, commandesStore } = require('../controllers/orderController');
const { proteger, autoriser } = require('../middlewares/authMiddleware');

router.post('/', proteger, passerCommande);
router.get('/mes-commandes', proteger, mesCommandes);
router.get('/store/:storeId', proteger, autoriser('vendeur', 'admin'), commandesStore);
router.get('/:id', proteger, getCommande);
router.put('/:id/statut', proteger, autoriser('vendeur', 'livreur', 'admin'), mettreAJourStatut);

module.exports = router;
