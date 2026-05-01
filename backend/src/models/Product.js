const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Nom du produit obligatoire'],
    trim: true
  },
  description: { type: String, trim: true },
  
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },

  categorie: {
    type: String,
    required: true
    // Ex: "Plats chauds", "Boissons", "Médicaments", "Vêtements"...
  },

  prix: {
    type: Number,
    required: [true, 'Prix obligatoire'],
    min: [0, 'Prix invalide']
  },
  // Prix en FCFA

  // Options/Variantes (ex: taille, couleur, accompagnement)
  options: [{
    nom: String,        // Ex: "Taille"
    choix: [String],    // Ex: ["S", "M", "L", "XL"]
    obligatoire: Boolean
  }],

  images: [String],

  disponible: { type: Boolean, default: true },
  
  // Spécifique restaurant
  tempsPreparation: { type: Number }, // en minutes

  // Spécifique pharmacie
  surOrdonnance: { type: Boolean, default: false },

  note: { type: Number, default: 0 },
  nombreAvis: { type: Number, default: 0 }

}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
