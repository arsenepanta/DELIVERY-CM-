const express = require('express');
const router = express.Router();
const { getProduitsStore, getProduit, creerProduit, modifierProduit, supprimerProduit } = require('../controllers/productController');
const { proteger, autoriser } = require('../middlewares/authMiddleware');

router.get('/store/:storeId', getProduitsStore);
router.get('/:id', getProduit);
router.post('/', proteger, autoriser('vendeur', 'admin'), creerProduit);
router.put('/:id', proteger, autoriser('vendeur', 'admin'), modifierProduit);
router.delete('/:id', proteger, autoriser('vendeur', 'admin'), supprimerProduit);

module.exports = router;
