const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Erreur serveur interne';

  // Erreur MongoDB - ID invalide
  if (err.name === 'CastError') {
    message = 'Ressource introuvable - ID invalide';
    statusCode = 404;
  }

  // Erreur MongoDB - Champ unique dupliqué
  if (err.code === 11000) {
    const champ = Object.keys(err.keyValue)[0];
    message = `${champ} déjà utilisé. Veuillez en choisir un autre.`;
    statusCode = 400;
  }

  // Erreur de validation Mongoose
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(e => e.message).join(', ');
    statusCode = 400;
  }

  res.status(statusCode).json({
    succes: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorMiddleware;
