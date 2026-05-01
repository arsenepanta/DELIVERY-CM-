const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Nom du commerce obligatoire'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'restaurant',
      'boutique',
      'supermarche',
      'pharmacie',
      'boulangerie',
      'electronique',
      'mode',
      'autre'
    ]
  },
  proprietaire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Localisation
  localisation: {
    ville: {
      type: String,
      enum: ['Yaoundé', 'Douala', 'Bafoussam', 'Garoua', 'Bamenda', 'Autre'],
      required: true
    },
    quartier: { type: String, required: true },
    adresse: { type: String },
    coordonnees: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },

  contact: {
    telephone: { type: String },
    whatsapp: { type: String },
    email: { type: String }
  },

  // Horaires d'ouverture
  horaires: {
    lundi:    { ouvert: Boolean, debut: String, fin: String },
    mardi:    { ouvert: Boolean, debut: String, fin: String },
    mercredi: { ouvert: Boolean, debut: String, fin: String },
    jeudi:    { ouvert: Boolean, debut: String, fin: String },
    vendredi: { ouvert: Boolean, debut: String, fin: String },
    samedi:   { ouvert: Boolean, debut: String, fin: String },
    dimanche: { ouvert: Boolean, debut: String, fin: String }
  },

  images: {
    logo: { type: String, default: 'default-store.png' },
    couverture: { type: String },
    galerie: [String]
  },

  // Livraison
  livraison: {
    fraisLivraison: { type: Number, default: 500 }, // En FCFA
    tempsEstime: { type: String, default: '30-45 min' },
    rayonKm: { type: Number, default: 5 },
    commandeMinimum: { type: Number, default: 1000 } // En FCFA
  },

  // Stats
  note: { type: Number, default: 0 },
  nombreAvis: { type: Number, default: 0 },
  
  ouvertMaintenant: { type: Boolean, default: true },
  actif: { type: Boolean, default: true },
  verifie: { type: Boolean, default: false } // Vérifié par admin

}, { timestamps: true });

module.exports = mongoose.model('Store', storeSchema);
