const express = require('express');
const router = express.Router();
const { inscription, connexion, getProfil, modifierProfil } = require('../controllers/authController');
const { proteger } = require('../middlewares/authMiddleware');

router.post('/inscription', inscription);
router.post('/connexion', connexion);
router.get('/profil', proteger, getProfil);
router.put('/profil', proteger, modifierProfil);

module.exports = router;
