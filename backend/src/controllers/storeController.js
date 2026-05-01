const Store = require('../models/Store');

// GET tous les stores (avec filtres)
const getStores = async (req, res, next) => {
  try {
    const { type, ville, search } = req.query;
    
    let filtre = { actif: true };
    if (type)   filtre.type = type;
    if (ville)  filtre['localisation.ville'] = ville;
    if (search) filtre.nom = { $regex: search, $options: 'i' };

    const stores = await Store.find(filtre)
      .populate('proprietaire', 'nom prenom telephone')
      .sort('-createdAt');

    res.status(200).json({
      succes: true,
      total: stores.length,
      data: stores
    });
  } catch (error) {
    next(error);
  }
};

// GET un store par ID
const getStore = async (req, res, next) => {
  try {
    const store = await Store.findById(req.params.id)
      .populate('proprietaire', 'nom prenom telephone');

    if (!store) {
      return res.status(404).json({ 
        succes: false, 
        message: '❌ Commerce introuvable.' 
      });
    }

    res.status(200).json({ succes: true, data: store });
  } catch (error) {
    next(error);
  }
};

// POST créer un store
const creerStore = async (req, res, next) => {
  try {
    req.body.proprietaire = req.user._id;
    const store = await Store.create(req.body);

    res.status(201).json({
      succes: true,
      message: '✅ Commerce créé avec succès !',
      data: store
    });
  } catch (error) {
    next(error);
  }
};

// PUT modifier un store
const modifierStore = async (req, res, next) => {
  try {
    let store = await Store.findById(req.params.id);

    if (!store) {
      return res.status(404).json({ 
        succes: false, 
        message: '❌ Commerce introuvable.' 
      });
    }

    // Vérifier que c'est bien le propriétaire ou un admin
    if (store.proprietaire.toString() !== req.user._id.toString() 
        && req.user.role !== 'admin') {
      return res.status(403).json({ 
        succes: false, 
        message: '❌ Non autorisé.' 
      });
    }

    store = await Store.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      succes: true,
      message: '✅ Commerce mis à jour !',
      data: store
    });
  } catch (error) {
    next(error);
  }
};

// GET stores par catégorie (pour la homepage)
const getStoresParType = async (req, res, next) => {
  try {
    const types = ['restaurant', 'boutique', 'supermarche', 'pharmacie', 'boulangerie', 'electronique', 'mode'];
    const result = {};

    for (const type of types) {
      result[type] = await Store.find({ type, actif: true }).limit(6);
    }

    res.status(200).json({ succes: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStores, getStore, creerStore, modifierStore, getStoresParType };
