const Commande = require('../models/Commande');

// Client: créer une commande
exports.creerCommande = async (req, res) => {
  try {
    const { adresseDepart, adresseArrivee, description, poids, notes } = req.body;
    
    // Prix simple: 500 FCFA de base + 100 par kg
    const prix = 500 + (poids || 0) * 100;

    const commande = await Commande.create({
      client: req.user._id,
      adresseDepart,
      adresseArrivee,
      description,
      poids: poids || 0,
      prix,
      notes: notes || ''
    });

    res.status(201).json(commande);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Client: mes commandes
exports.mesCommandes = async (req, res) => {
  try {
    const commandes = await Commande.find({ client: req.user._id })
      .populate('livreur', 'nom telephone')
      .sort({ createdAt: -1 });
    res.json(commandes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Livreur: commandes disponibles
exports.commandesDisponibles = async (req, res) => {
  try {
    const commandes = await Commande.find({ statut: 'en_attente' })
      .populate('client', 'nom telephone')
      .sort({ createdAt: -1 });
    res.json(commandes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Livreur: accepter une commande
exports.accepterCommande = async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id);
    if (!commande) return res.status(404).json({ message: 'Commande non trouvée' });
    if (commande.statut !== 'en_attente') return res.status(400).json({ message: 'Commande déjà prise' });

    commande.livreur = req.user._id;
    commande.statut = 'acceptee';
    await commande.save();

    res.json(commande);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Livreur: mes livraisons
exports.mesLivraisons = async (req, res) => {
  try {
    const commandes = await Commande.find({ livreur: req.user._id })
      .populate('client', 'nom telephone adresse')
      .sort({ createdAt: -1 });
    res.json(commandes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Livreur: mettre à jour statut
exports.majStatut = async (req, res) => {
  try {
    const { statut } = req.body;
    const commande = await Commande.findOne({ _id: req.params.id, livreur: req.user._id });
    if (!commande) return res.status(404).json({ message: 'Commande non trouvée' });

    commande.statut = statut;
    await commande.save();
    res.json(commande);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: toutes les commandes
exports.toutesCommandes = async (req, res) => {
  try {
    const commandes = await Commande.find()
      .populate('client', 'nom telephone')
      .populate('livreur', 'nom telephone')
      .sort({ createdAt: -1 });
    res.json(commandes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
