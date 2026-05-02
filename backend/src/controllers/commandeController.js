const Commande = require('../models/Commande');
const User = require('../models/User');

// ============ HELPER NOTIFICATION ============
function notify(req, userId, event, data) {
  const io = req.app.get('io');
  const connectedUsers = req.app.get('connectedUsers');
  const socketId = connectedUsers[userId?.toString()];
  if (socketId) {
    io.to(socketId).emit(event, data);
    console.log(`📨 Notification → User ${userId}: ${event}`);
  }
}

function notifyAllLivreurs(req, event, data) {
  const io = req.app.get('io');
  io.emit(event, data);
}

// ============ CLIENT ============

// Client: créer une commande
exports.creerCommande = async (req, res) => {
  try {
    const { adresseDepart, adresseArrivee, description, poids, notes } = req.body;
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

    // 🔔 Notifier TOUS les livreurs
    notifyAllLivreurs(req, 'nouvelle_commande', {
      message: `📦 Nouvelle commande : ${description}`,
      commande: {
        id: commande._id,
        description,
        adresseDepart,
        adresseArrivee,
        prix
      }
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

// ============ LIVREUR ============

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
    const commande = await Commande.findById(req.params.id)
      .populate('client', 'nom telephone');

    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    if (commande.statut !== 'en_attente') {
      return res.status(400).json({ message: 'Cette commande n\'est pas disponible' });
    }
    // Mettre à jour
    commande.livreur = req.user._id;
    commande.statut = 'acceptee';
    await commande.save();

    // 🔔 Notifier le client
    notify(req, commande.client._id, 'commande_acceptee', {
      message: `✅ Votre commande a été acceptée !`,
      commandeId: commande._id,
      livreur: {
        nom: req.user.nom,
        telephone: req.user.telephone
      }
    });

    res.json({
      message: 'Commande acceptée',
      commande
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.refuserCommande = async (req, res) => {
  try {
    const { raison } = req.body;
    const commande = await Commande.findById(req.params.id)
      .populate('client', 'nom telephone');

    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    if (commande.statut !== 'en_attente') {
      return res.status(400).json({ message: 'Cette commande n\'est pas disponible' });
    }

    // Enregistrer le refus pour éviter de re-proposer au même livreur
    if (!commande.livreurRefus) commande.livreurRefus = [];
    commande.livreurRefus.push({
      livreur: req.user._id,
      raison: raison || 'Aucune raison',
      date: new Date()
    });

    await commande.save();

    // 🔔 Notifier tous les livreurs que la commande est toujours dispo
    notifyAllLivreurs(req, 'nouvelle_commande', {
      message: `📦 Commande disponible : ${commande.description}`,
      commande: {
        id: commande._id,
        description: commande.description,
        adresseDepart: commande.adresseDepart,
        adresseArrivee: commande.adresseArrivee,
        prix: commande.prix
      }
    });

    res.json({ message: 'Commande refusée, remise en file d\'attente' });
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
    const commande = await Commande.findOne({ _id: req.params.id, livreur: req.user._id })
      .populate('client', 'nom telephone');

    if (!commande) return res.status(404).json({ message: 'Commande non trouvée' });

    commande.statut = statut;
    await commande.save();

    // 🔔 Notifier le client selon le statut
    const messages = {
      en_cours: `🚴 Votre commande "${commande.description}" est en cours de livraison !`,
      livree:   `🎉 Votre commande "${commande.description}" a été livrée !`
    };

    if (messages[statut]) {
      notify(req, commande.client._id, 'statut_commande', {
        message: messages[statut],
        commandeId: commande._id,
        statut
      });
    }

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
