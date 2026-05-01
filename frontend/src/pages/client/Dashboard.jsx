import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import toast from 'react-hot-toast';

export default function ClientDashboard() {
  const { user, logout } = useAuth();
  const [commandes, setCommandes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    adresseDepart: '',
    adresseArrivee: '',
    description: '',
    poids: 0,
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/commandes', form);
      toast.success('✅ Commande passée avec succès !');
      setShowForm(false);
      setForm({ adresseDepart: '', adresseArrivee: '', description: '', poids: 0, notes: '' });
      fetchCommandes();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const actives = commandes.filter(c => !['livree','annulee'].includes(c.statut)).length;
  const livrees = commandes.filter(c => c.statut === 'livree').length;
  const total   = commandes.filter(c => c.statut === 'livree').reduce((s, c) => s + (c.prix || 0), 0);

  const statutColor = {
    en_attente: 'bg-yellow-100 text-yellow-700',
    acceptee:   'bg-blue-100 text-blue-700',
    en_cours:   'bg-orange-100 text-orange-700',
    livree:     'bg-green-100 text-green-700',
    annulee:    'bg-red-100 text-red-700'
  };
  const statutLabel = {
    en_attente: 'En attente',
    acceptee:   'Acceptée',
    en_cours:   'En cours',
    livree:     'Livrée',
    annulee:    'Annulée'
  };

  return (
    <div className="min-h-screen bg-blue-50">
      <nav className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">🚚 Delivery CM - Client</h1>
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
          <div className="bg-white rounded-xl p-6 shadow text-center">
            <p className="text-3xl font-bold text-blue-600">{actives}</p>
            <p className="text-gray-500">Commandes actives</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow text-center">
            <p className="text-3xl font-bold text-green-600">{livrees}</p>
            <p className="text-gray-500">Livrées</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow text-center">
            <p className="text-3xl font-bold text-orange-600">{total} FCFA</p>
            <p className="text-gray-500">Total dépensé</p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 mb-6"
        >
          {showForm ? '✕ Annuler' : '+ Nouvelle commande'}
        </button>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow mb-6 space-y-4">
            <h3 className="text-lg font-bold">Nouvelle commande</h3>

            <div>
              <label className="block text-sm font-medium mb-1">Adresse de départ</label>
              <input
                className="w-full border rounded p-2"
                placeholder="Ex: Marché Mokolo, Yaoundé"
                value={form.adresseDepart}
                onChange={e => setForm({...form, adresseDepart: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Adresse d'arrivée</label>
              <input
                className="w-full border rounded p-2"
                placeholder="Ex: Bastos, face Ambassade"
                value={form.adresseArrivee}
                onChange={e => setForm({...form, adresseArrivee: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description du colis</label>
              <input
                className="w-full border rounded p-2"
                placeholder="Ex: Documents administratifs"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Poids (kg)</label>
              <input
                className="w-full border rounded p-2"
                type="number"
                min="0"
                step="0.1"
                value={form.poids}
                onChange={e => setForm({...form, poids: parseFloat(e.target.value) || 0})}
              />
              <p className="text-xs text-gray-400 mt-1">
                Prix estimé : {500 + (form.poids || 0) * 100} FCFA
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes (optionnel)</label>
              <textarea
                className="w-full border rounded p-2"
                placeholder="Instructions supplémentaires..."
                value={form.notes}
                onChange={e => setForm({...form, notes: e.target.value})}
                rows={2}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Envoi...' : 'Passer la commande'}
            </button>
          </form>
        )}

        {/* Liste commandes */}
        <div className="space-y-4">
          {commandes.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune commande pour l'instant</p>
          ) : (
            commandes.map(c => (
              <div key={c._id} className="bg-white rounded-xl p-4 shadow flex justify-between items-start">
                <div className="space-y-1">
                  <p className="font-semibold">{c.description}</p>
                  <p className="text-sm text-gray-500">📦 {c.adresseDepart} → {c.adresseArrivee}</p>
                  {c.livreur && (
                    <p className="text-sm text-blue-600">🛵 Livreur : {c.livreur.nom} — {c.livreur.telephone}</p>
                  )}
                  <p className="text-sm font-semibold text-orange-600">{c.prix} FCFA</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statutColor[c.statut] || 'bg-gray-100 text-gray-700'}`}>
                  {statutLabel[c.statut] || c.statut}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
