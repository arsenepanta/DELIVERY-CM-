const Order = require('../models/Order');
const Product = require('../models/Product');

// POST passer une commande
const passerCommande = async (req, res, next) => {
  try {
    const { storeId, articles, adresseLivraison, paiement } = req.body;

    // Calculer les montants
    let sousTotal = 0;
    const articlesVerifies = [];

    for (const article of articles) {
      const produit = await Product.findById(article.produitId);
      if (!produit || !produit.disponible) {
        return res.status(400).json({
          succes: false,
          message: `❌ Produit "${article.nom}" indisponible.`
        });
      }
      const sousT = produit.prix * article.quantite;
      sousTotal += sousT;
      articlesVerifies.push({
        produit: produit._id,
        nom: produit.nom,
        prix: produit.prix,
        quantite: article.quantite,
        optionsChoisies: article.optionsChoisies || [],
        sousTotal: sousT
      });
    }

    const fraisLivraison = 500; // FCFA - à rendre dynamique plus tard
    const total = sousTotal + fraisLivraison;

    const commande = await Order.create({
      client: req.user._id,
      store: storeId,
      articles: articlesVerifies,
      montants: { sousTotal, fraisLivraison, total },
      adresseLivraison,
      paiement: paiement || { methode: 'cash' },
      historiqueStatuts: [{ statut: 'en_attente', note: 'Commande créée' }]
    });

    res.status(201).json({
      succes: true,
      message: '✅ Commande passée avec succès !',
      data: commande
    });
  } catch (error) {
    next(error);
  }
};

// GET commandes du client connecté
const mesCommandes = async (req, res, next) => {
  try {
    const commandes = await Order.find({ client: req.user._id })
      .populate('store', 'nom type images.logo')
      .sort('-createdAt');

    res.status(200).json({ succes: true, total: commandes.length, data: commandes });
  } catch (error) {
    next(error);
  }
};

// GET une commande par ID
const getCommande = async (req, res, next) => {
  try {
    const commande = await Order.findById(req.params.id)
      .populate('store', 'nom type contact')
      .populate('client', 'nom prenom telephone')
      .populate('livreur', 'nom prenom telephone livreurInfo');

    if (!commande) {
      return res.status(404).json({ succes: false, message: '❌ Commande introuvable.' });
    }

    res.status(200).json({ succes: true, data: commande });
  } catch (error) {
    next(error);
  }
};

// PUT mettre à jour le statut (vendeur/livreur/admin)
const mettreAJourStatut = async (req, res, next) => {
  try {
    const { statut, note } = req.body;

    const commande = await Order.findByIdAndUpdate(
      req.params.id,
      {
        statut,
        $push: { 
          historiqueStatuts: { statut, note: note || '', date: new Date() } 
        }
      },
      { new: true }
    );

    if (!commande) {
      return res.status(404).json({ succes: false, message: '❌ Commande introuvable.' });
    }

    res.status(200).json({
      succes: true,
      message: `✅ Statut mis à jour : ${statut}`,
      data: commande
    });
  } catch (error) {
    next(error);
  }
};

// GET commandes d'un store (pour le vendeur)
const commandesStore = async (req, res, next) => {
  try {
    const commandes = await Order.find({ store: req.params.storeId })
      .populate('client', 'nom prenom telephone')
      .sort('-createdAt');

    res.status(200).json({ succes: true, total: commandes.length, data: commandes });
  } catch (error) {
    next(error);
  }
};

module.exports = { passerCommande, mesCommandes, getCommande, mettreAJourStatut, commandesStore };
