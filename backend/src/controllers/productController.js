const Product = require('../models/Product');
const Store = require('../models/Store');

// GET produits d'un store
const getProduitsStore = async (req, res, next) => {
  try {
    const { categorie } = req.query;
    let filtre = { store: req.params.storeId, disponible: true };
    if (categorie) filtre.categorie = categorie;

    const produits = await Product.find(filtre).sort('categorie nom');

    res.status(200).json({
      succes: true,
      total: produits.length,
      data: produits
    });
  } catch (error) {
    next(error);
  }
};

// GET un produit
const getProduit = async (req, res, next) => {
  try {
    const produit = await Product.findById(req.params.id).populate('store', 'nom type');
    if (!produit) {
      return res.status(404).json({ succes: false, message: '❌ Produit introuvable.' });
    }
    res.status(200).json({ succes: true, data: produit });
  } catch (error) {
    next(error);
  }
};

// POST créer un produit
const creerProduit = async (req, res, next) => {
  try {
    // Vérifier que le store appartient à ce vendeur
    const store = await Store.findById(req.body.store);
    if (!store) {
      return res.status(404).json({ succes: false, message: '❌ Commerce introuvable.' });
    }
    if (store.proprietaire.toString() !== req.user._id.toString() 
        && req.user.role !== 'admin') {
      return res.status(403).json({ succes: false, message: '❌ Non autorisé.' });
    }

    const produit = await Product.create(req.body);
    res.status(201).json({
      succes: true,
      message: '✅ Produit ajouté !',
      data: produit
    });
  } catch (error) {
    next(error);
  }
};

// PUT modifier un produit
const modifierProduit = async (req, res, next) => {
  try {
    const produit = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!produit) {
      return res.status(404).json({ succes: false, message: '❌ Produit introuvable.' });
    }
    res.status(200).json({ succes: true, message: '✅ Produit mis à jour !', data: produit });
  } catch (error) {
    next(error);
  }
};

// DELETE supprimer un produit
const supprimerProduit = async (req, res, next) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ succes: true, message: '✅ Produit supprimé !' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProduitsStore, getProduit, creerProduit, modifierProduit, supprimerProduit };
