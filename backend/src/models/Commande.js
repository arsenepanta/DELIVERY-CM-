const mongoose = require('mongoose');

const commandeSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  livreur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  adresseDepart: { type: String, required: true },
  adresseArrivee: { type: String, required: true },
  description: { type: String, required: true },
  poids: { type: Number, default: 0 },
  prix: { type: Number, default: 0 },
  statut: {
    type: String,
    enum: ['en_attente', 'acceptee', 'en_cours', 'livree', 'annulee'],
    default: 'en_attente'
  },
  livreurRefus: [{
  livreur: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  raison: String,
  date: Date
}],

  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Commande', commandeSchema);
