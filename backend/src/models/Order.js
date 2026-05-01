const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  numeroCommande: {
    type: String,
    unique: true
    // Généré automatiquement : CM-2024-XXXX
  },

  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },

  articles: [{
    produit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    nom: String,       // Copie du nom au moment de la commande
    prix: Number,      // Copie du prix au moment de la commande
    quantite: { type: Number, default: 1 },
    optionsChoisies: [String],
    sousTotal: Number
  }],

  // Montants en FCFA
  montants: {
    sousTotal: { type: Number, required: true },
    fraisLivraison: { type: Number, default: 500 },
    total: { type: Number, required: true }
  },

  statut: {
    type: String,
    enum: [
      'en_attente',      // Commande passée
      'confirmee',       // Confirmée par le vendeur
      'en_preparation',  // En cours de préparation
      'prete',           // Prête pour le livreur
      'en_livraison',    // Livreur en route
      'livree',          // Livrée avec succès
      'annulee'          // Annulée
    ],
    default: 'en_attente'
  },

  // Adresse de livraison
  adresseLivraison: {
    ville: String,
    quartier: String,
    adresse: String,
    indications: String, // "Près du marché central, maison bleue..."
    coordonnees: {
      latitude: Number,
      longitude: Number
    }
  },

  // Paiement
  paiement: {
    methode: {
      type: String,
      enum: ['mtn_momo', 'orange_money', 'cash'],
      default: 'cash'
    },
    statut: {
      type: String,
      enum: ['en_attente', 'paye', 'echoue', 'rembourse'],
      default: 'en_attente'
    },
    transactionId: String
  },

  // Livreur assigné
  livreur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Historique des statuts
  historiqueStatuts: [{
    statut: String,
    date: { type: Date, default: Date.now },
    note: String
  }],

  noteClient: { type: Number },       // Note donnée par le client
  commentaireClient: { type: String },

  tempsPrisEnCharge: Date,  // Quand le livreur a pris la commande
  tempsDeLivraison: Date    // Quand livré

}, { timestamps: true });

// Générer numéro de commande automatiquement
orderSchema.pre('save', async function(next) {
  if (!this.numeroCommande) {
    const date = new Date();
    const annee = date.getFullYear();
    const count = await mongoose.model('Order').countDocuments();
    this.numeroCommande = `CM-${annee}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
