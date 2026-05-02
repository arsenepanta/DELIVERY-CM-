import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import toast from 'react-hot-toast';
import NotificationToast from '../../components/NotificationToast';
import { getSocket } from '../../services/socket';

export default function ClientDashboard() {
  const { user, logout } = useAuth();
  const [commandes, setCommandes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🔍 Filtres
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [filtreDate, setFiltreDate] = useState('tous');
  const [recherche, setRecherche] = useState('');

  const [form, setForm] = useState({
    adresseDepart: '',
    adresseArrivee: '',
    description: '',
    poids: 1,
    notes: ''
  });

  const fetchCommandes = async () => {
    try {
      const res = await API.get('/commandes/mes-commandes');
      setCommandes(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchCommandes(); }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket?.connected) return;

    const handleCommandeAcceptee = (data) => {
      setCommandes(prev =>
        prev.map(c => c._id === data.commandeId ? { ...c, statut: 'acceptee', livreur: data } : c)
      );
    };

    const handleStatutCommande = (data) => {
      setCommandes(prev =>
        prev.map(c => c._id === data.commandeId ? { ...c, statut: data.statut } : c)
      );
    };

    socket.on('commande_acceptee', handleCommandeAcceptee);
    socket.on('statut_commande', handleStatutCommande);

    return () => {
      socket.off('commande_acceptee', handleCommandeAcceptee);
      socket.off('statut_commande', handleStatutCommande);
    };
  }, []);

  const creerCommande = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post('/commandes', form);
      setCommandes([res.data, ...commandes]);
      setForm({ adresseDepart: '', adresseArrivee: '', description: '', poids: 1, notes: '' });
      setShowForm(false);
      toast.success('✅ Commande créée !');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Logique de filtrage
  const commandesFiltrees = commandes.filter(c => {
    // Filtre statut
    if (filtreStatut !== 'tous' && c.statut !== filtreStatut) return false;

    // Filtre date
    if (filtreDate !== 'tous') {
      const date = new Date(c.createdAt);
      const now = new Date();
      if (filtreDate === 'today') {
        if (date.toDateString() !== now.toDateString()) return false;
      } else if (filtreDate === 'week') {
        const il7jours = new Date(now - 7 * 24 * 60 * 60 * 1000);
        if (date < il7jours) return false;
      } else if (filtreDate === 'month') {
        const il30jours = new Date(now - 30 * 24 * 60 * 60 * 1000);
        if (date < il30jours) return false;
      }
    }

    // Filtre recherche
    if (recherche.trim()) {
      const q = recherche.toLowerCase();
      return (
        c.description?.toLowerCase().includes(q) ||
        c.adresseDepart?.toLowerCase().includes(q) ||
        c.adresseArrivee?.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const enAttente = commandes.filter(c => c.statut === 'en_attente').length;
  const enCours = commandes.filter(c => c.statut === 'en_cours').length;
  const terminees = commandes.filter(c => c.statut === 'livree').length;

  const statutColor = {
    en_attente: 'bg-yellow-100 text-yellow-700',
    acceptee: 'bg-blue-100 text-blue-700',
    en_cours: 'bg-orange-100 text-orange-700',
    livree: 'bg-green-100 text-green-700',
    annulee: 'bg-red-100 text-red-700'
  };

  const statutLabel = {
    en_attente: '⏳ En attente',
    acceptee: '✅ Acceptée',
    en_cours: '🚴 En cours',
    livree: '🎉 Livrée',
    annulee: '❌ Annulée'
  };

  const resetFiltres = () => {
    setFiltreStatut('tous');
    setFiltreDate('tous');
    setRecherche('');
  };

  const filtresActifs = filtreStatut !== 'tous' || filtreDate !== 'tous' || recherche.trim() !== '';

  return (
    <div className="min-h-screen bg-blue-50">
      <NotificationToast role="client" />

      <nav className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">📦 Delivery CM - Client</h1>
        <div className="flex items-center gap-4">
          <span>Bonjour, {user?.prenom || user?.nom}</span>
          <button onClick={logout} className="bg-white text-blue-600 px-3 py-1 rounded font-semibold">
            Déconnexion
          </button>
        </div>
      </nav>

      <div className="p-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Mes commandes</h2>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div
            onClick={() => setFiltreStatut('en_attente')}
            className="bg-white rounded-xl p-6 shadow text-center cursor-pointer hover:shadow-md transition"
          >
            <p className="text-3xl font-bold text-yellow-600">{enAttente}</p>
            <p className="text-gray-500">En attente</p>
          </div>
          <div
            onClick={() => setFiltreStatut('en_cours')}
            className="bg-white rounded-xl p-6 shadow text-center cursor-pointer hover:shadow-md transition"
          >
            <p className="text-3xl font-bold text-orange-600">{enCours}</p>
            <p className="text-gray-500">En cours</p>
          </div>
          <div
            onClick={() => setFiltreStatut('livree')}
            className="bg-white rounded-xl p-6 shadow text-center cursor-pointer hover:shadow-md transition"
          >
            <p className="text-3xl font-bold text-green-600">{terminees}</p>
            <p className="text-gray-500">Livrées</p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold mb-6 hover:bg-blue-700"
        >
          ➕ Nouvelle commande
        </button>

        {showForm && (
          <div className="bg-white rounded-xl p-6 shadow mb-6">
            <form onSubmit={creerCommande} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Adresse de départ</label>
                <input type="text" required value={form.adresseDepart}
                  onChange={(e) => setForm({ ...form, adresseDepart: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Douala, Akwa" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Adresse d'arrivée</label>
                <input type="text" required value={form.adresseArrivee}
                  onChange={(e) => setForm({ ...form, adresseArrivee: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Yaoundé, Centre" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Description</label>
                <input type="text" required value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Colis fragile" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Poids (kg)</label>
                <input type="number" min="0.5" step="0.5" value={form.poids}
                  onChange={(e) => setForm({ ...form, poids: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Notes (optionnel)</label>
                <textarea value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Instructions spéciales..." rows="3" />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {loading ? '⏳ Création...' : '✅ Créer la commande'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-400">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 🔍 Barre de filtres */}
        <div className="bg-white rounded-xl p-4 shadow mb-4">
          <div className="flex flex-wrap gap-3 items-center">

            {/* Recherche */}
            <div className="flex-1 min-w-48">
              <input
                type="text"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="🔍 Rechercher (description, adresse...)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filtre statut */}
            <select
              value={filtreStatut}
              onChange={(e) => setFiltreStatut(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="tous">📋 Tous les statuts</option>
              <option value="en_attente">⏳ En attente</option>
              <option value="acceptee">✅ Acceptée</option>
              <option value="en_cours">🚴 En cours</option>
              <option value="livree">🎉 Livrée</option>
              <option value="annulee">❌ Annulée</option>
            </select>

            {/* Filtre date */}
            <select
              value={filtreDate}
              onChange={(e) => setFiltreDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="tous">📅 Toutes les dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">7 derniers jours</option>
              <option value="month">30 derniers jours</option>
            </select>

            {/* Reset */}
            {filtresActifs && (
              <button
                onClick={resetFiltres}
                className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-200"
              >
                ✕ Effacer
              </button>
            )}
          </div>

          {/* Résumé résultats */}
          <div className="mt-2 text-sm text-gray-500">
            {filtresActifs
              ? `${commandesFiltrees.length} résultat(s) sur ${commandes.length} commande(s)`
              : `${commandes.length} commande(s) au total`
            }
          </div>
        </div>

        {/* Liste des commandes */}
        <div className="space-y-4">
          {commandesFiltrees.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">😔 Aucune commande trouvée</p>
              {filtresActifs && (
                <button onClick={resetFiltres} className="mt-2 text-blue-600 underline text-sm">
                  Effacer les filtres
                </button>
              )}
            </div>
          ) : (
            commandesFiltrees.map((c) => (
              <div key={c._id} className="bg-white rounded-xl p-4 shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-lg">{c.description}</p>
                    <p className="text-sm text-gray-500">📍 {c.adresseDepart} → {c.adresseArrivee}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      🕐 {new Date(c.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statutColor[c.statut] || 'bg-gray-100 text-gray-700'}`}>
                    {statutLabel[c.statut] || c.statut}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <p><strong>Poids:</strong> {c.poids} kg</p>
                  <p><strong>Prix:</strong> {c.prix} FCFA</p>
                  {c.livreur && <p className="col-span-2"><strong>Livreur:</strong> {c.livreur?.nom || 'Assigné'}</p>}
                  {c.notes && <p className="col-span-2"><strong>Notes:</strong> {c.notes}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
