const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  commande: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  livreur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  statut: {
    type: String,
    enum: [
      'assignee',         // Livreur assigné
      'en_route_store',   // Livreur va au commerce
      'au_store',         // Livreur au commerce
      'en_route_client',  // Livreur va chez le client
      'livree',           // Livraison effectuée
      'echec'             // Echec livraison
    ],
    default: 'assignee'
  },

  // Position en temps réel du livreur
  positionActuelle: {
    latitude: Number,
    longitude: Number,
    miseAJour: { type: Date, default: Date.now }
  },

  // Distances et temps
  distanceKm: Number,
  tempsEstimeMin: Number,
  tempsReelMin: Number,

  // Preuve de livraison
  preuveLivraison: {
    photo: String,
    signatureClient: String,
    confirmeParClient: { type: Boolean, default: false }
  },

  noteClient: { type: Number },
  commentaireClient: String,
  noteLivreur: { type: Number }

}, { timestamps: true });

module.exports = mongoose.model('Delivery', deliverySchema);
