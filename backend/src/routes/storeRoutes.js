const express = require('express');
const router = express.Router();
const { getStores, getStore, creerStore, modifierStore, getStoresParType } = require('../controllers/storeController');
const { proteger, autoriser } = require('../middlewares/authMiddleware');

router.get('/', getStores);
router.get('/categories', getStoresParType);
router.get('/:id', getStore);
router.post('/', proteger, autoriser('vendeur', 'admin'), creerStore);
router.put('/:id', proteger, autoriser('vendeur', 'admin'), modifierStore);

module.exports = router;
