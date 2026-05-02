const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Vérifier si l'utilisateur est connecté
const proteger = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        succes: false,
        message: '❌ Accès refusé. Connectez-vous d\'abord.'
      });
    }

    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        succes: false,
        message: '❌ Utilisateur introuvable.'
      });
    }

    // 🔒 VÉRIFIER LE BLOCAGE À CHAQUE REQUÊTE
    if (req.user.isBlocked) {
      return res.status(403).json({
        succes: false,
        message: '🔒 Votre compte a été bloqué. Contactez le support.'
      });
    }

    next();
  } catch (error) {
    res.status(401).json({
      succes: false,
      message: '❌ Token invalide.'
    });
  }
};

// Restreindre selon le rôle
const autoriser = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        succes: false,
        message: `❌ Rôle "${req.user.role}" non autorisé pour cette action.`
      });
    }
    next();
  };
};

// 🔒 Middleware admin uniquement
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      succes: false,
      message: '❌ Accès refusé - Admins seulement'
    });
  }
  next();
};

module.exports = { proteger, autoriser, adminOnly };
