const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Générer un token JWT
const genererToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Formater la réponse utilisateur
const reponseUtilisateur = (user, token) => ({
  _id: user._id,
  nom: user.nom,
  prenom: user.prenom,
  email: user.email,
  telephone: user.telephone,
  role: user.role,
  ville: user.ville,
  token
});

// ─────────────────────────────────────────
// @route   POST /api/auth/inscription
// @access  Public
// ─────────────────────────────────────────
const inscription = async (req, res, next) => {
  try {
    const { nom, prenom, email, telephone, motDePasse, ville, role } = req.body;

    // Vérifier si email déjà utilisé
    const existeDeja = await User.findOne({ email });
    if (existeDeja) {
      return res.status(400).json({
        succes: false,
        message: '❌ Cet email est déjà utilisé.'
      });
    }

    // Créer l'utilisateur
    const user = await User.create({
      nom,
      prenom,
      email,
      telephone,
      motDePasse,
      ville: ville || 'Yaoundé',
      role: role || 'client'
    });

    const token = genererToken(user._id);

    res.status(201).json({
      succes: true,
      message: '✅ Inscription réussie !',
      data: reponseUtilisateur(user, token)
    });

  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   POST /api/auth/connexion
// @access  Public
// ─────────────────────────────────────────
const connexion = async (req, res, next) => {
  try {
    const { email, motDePasse } = req.body;

    if (!email || !motDePasse) {
      return res.status(400).json({
        succes: false,
        message: '❌ Email et mot de passe obligatoires.'
      });
    }

    // Chercher l'utilisateur avec le mot de passe
    const user = await User.findOne({ email }).select('+motDePasse');
    if (!user) {
      return res.status(401).json({
        succes: false,
        message: '❌ Email ou mot de passe incorrect.'
      });
    }

    // Vérifier le mot de passe
    const motDePasseValide = await user.verifierMotDePasse(motDePasse);
    if (!motDePasseValide) {
      return res.status(401).json({
        succes: false,
        message: '❌ Email ou mot de passe incorrect.'
      });
    }

    if (!user.actif) {
      return res.status(401).json({
        succes: false,
        message: '❌ Compte désactivé. Contactez le support.'
      });
    }

    const token = genererToken(user._id);

    res.status(200).json({
      succes: true,
      message: `✅ Bienvenue ${user.prenom} !`,
      data: reponseUtilisateur(user, token)
    });

  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   GET /api/auth/profil
// @access  Privé
// ─────────────────────────────────────────
const getProfil = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      succes: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────
// @route   PUT /api/auth/profil
// @access  Privé
// ─────────────────────────────────────────
const modifierProfil = async (req, res, next) => {
  try {
    const champsAutorise = ['nom', 'prenom', 'telephone', 'ville', 'quartier', 'adresse', 'mobileMoney'];
    const miseAJour = {};
    
    champsAutorise.forEach(champ => {
      if (req.body[champ] !== undefined) {
        miseAJour[champ] = req.body[champ];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      miseAJour,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      succes: true,
      message: '✅ Profil mis à jour !',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { inscription, connexion, getProfil, modifierProfil };
