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

  useEffect(() => {
    fetchCommandes();
  }, []);

  // 🔔 Écouter les mises à jour en temps réel
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow text-center">
            <p className="text-3xl font-bold text-yellow-600">{enAttente}</p>
            <p className="text-gray-500">En attente</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow text-center">
            <p className="text-3xl font-bold text-orange-600">{enCours}</p>
            <p className="text-gray-500">En cours</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow text-center">
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
                <input
                  type="text"
                  required
                  value={form.adresseDepart}
                  onChange={(e) => setForm({ ...form, adresseDepart: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Douala, Akwa"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Adresse d'arrivée</label>
                <input
                  type="text"
                  required
                  value={form.adresseArrivee}
                  onChange={(e) => setForm({ ...form, adresseArrivee: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Yaoundé, Centre"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Description</label>
                <input
                  type="text"
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Colis fragile"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Poids (kg)</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={form.poids}
                  onChange={(e) => setForm({ ...form, poids: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Notes (optionnel)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Instructions spéciales..."
                  rows="3"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? '⏳ Création...' : '✅ Créer la commande'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-400"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {commandes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune commande pour le moment</p>
          ) : (
            commandes.map((c) => (
              <div key={c._id} className="bg-white rounded-xl p-4 shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-lg">{c.description}</p>
                    <p className="text-sm text-gray-500">📍 {c.adresseDepart} → {c.adresseArrivee}</p>
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
