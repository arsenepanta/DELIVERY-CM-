import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import toast from 'react-hot-toast';

export default function LivreurDashboard() {
  const { user, logout } = useAuth();
  const [disponibles, setDisponibles]   = useState([]);
  const [mesLivraisons, setMesLivraisons] = useState([]);
  const [tab, setTab] = useState('disponibles');
  const [loading, setLoading] = useState(false);

  const fetchDisponibles = async () => {
    try {
      const res = await API.get('/commandes/disponibles');
      setDisponibles(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchMesLivraisons = async () => {
    try {
      const res = await API.get('/commandes/mes-livraisons');
      setMesLivraisons(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchDisponibles(); fetchMesLivraisons(); }, []);

  const accepter = async (id) => {
    setLoading(true);
    try {
      await API.put(`/commandes/${id}/accepter`);
      toast.success('✅ Commande acceptée !');
      fetchDisponibles();
      fetchMesLivraisons();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const majStatut = async (id, statut) => {
    try {
      await API.put(`/commandes/${id}/statut`, { statut });
      toast.success('Statut mis à jour');
      fetchMesLivraisons();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur');
    }
  };

  const enCours   = mesLivraisons.filter(c => c.statut === 'en_cours').length;
  const terminees = mesLivraisons.filter(c => c.statut === 'livree').length;
  const gains     = mesLivraisons.filter(c => c.statut === 'livree').reduce((s, c) => s + (c.prix || 0), 0);

  const statutColor = {
    acceptee: 'bg-blue-100 text-blue-700',
    en_cours: 'bg-orange-100 text-orange-700',
    livree:   'bg-green-100 text-green-700',
    annulee:  'bg-red-100 text-red-700'
  };
  const statutLabel = {
    acceptee: 'Acceptée',
    en_cours: 'En cours',
    livree:   'Livrée',
    annulee:  'Annulée'
  };

  return (
    <div className="min-h-screen bg-green-50">
      <nav className="bg-green-600 text-white px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">🛵 Delivery CM - Livreur</h1>
        <div className="flex items-center gap-4">
          <span>Bonjour, {user?.prenom || user?.nom}</span>
          <button onClick={logout} className="bg-white text-green-600 px-3 py-1 rounded font-semibold">
            Déconnexion
          </button>
        </div>
      </nav>

      <div className="p-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Tableau de bord livreur</h2>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow text-center">
            <p className="text-3xl font-bold text-green-600">{enCours}</p>
            <p className="text-gray-500">En cours</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow text-center">
            <p className="text-3xl font-bold text-blue-600">{terminees}</p>
            <p className="text-gray-500">Terminées</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow text-center">
            <p className="text-3xl font-bold text-orange-600">{gains} FCFA</p>
            <p className="text-gray-500">Gains estimés</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('disponibles')}
            className={`px-5 py-2 rounded-lg font-semibold transition ${tab === 'disponibles' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-green-50'}`}
          >
            📦 Disponibles ({disponibles.length})
          </button>
          <button
            onClick={() => setTab('mes-livraisons')}
            className={`px-5 py-2 rounded-lg font-semibold transition ${tab === 'mes-livraisons' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-green-50'}`}
          >
            🛵 Mes livraisons ({mesLivraisons.length})
          </button>
        </div>

        {/* Commandes disponibles */}
        {tab === 'disponibles' && (
          <div className="space-y-4">
            {disponibles.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucune commande disponible</p>
            ) : (
              disponibles.map(c => (
                <div key={c._id} className="bg-white rounded-xl p-4 shadow flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-semibold">{c.description}</p>
                    <p className="text-sm text-gray-500">📦 {c.adresseDepart} → {c.adresseArrivee}</p>
                    <p className="text-sm text-gray-500">👤 Client : {c.client?.nom} — {c.client?.telephone}</p>
                    <p className="text-sm font-semibold text-orange-600">{c.prix} FCFA</p>
                  </div>
                  <button
                    onClick={() => accepter(c._id)}
                    disabled={loading}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                  >
                    Accepter
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Mes livraisons */}
        {tab === 'mes-livraisons' && (
          <div className="space-y-4">
            {mesLivraisons.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucune livraison en cours</p>
            ) : (
              mesLivraisons.map(c => (
                <div key={c._id} className="bg-white rounded-xl p-4 shadow flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-semibold">{c.description}</p>
                    <p className="text-sm text-gray-500">📍 {c.adresseDepart} → {c.adresseArrivee}</p>
                    <p className="text-sm text-gray-500">👤 {c.client?.nom} — {c.client?.telephone}</p>
                    <p className="text-sm font-semibold text-orange-600">{c.prix} FCFA</p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statutColor[c.statut] || 'bg-gray-100 text-gray-700'}`}>
                      {statutLabel[c.statut] || c.statut}
                    </span>
                    {c.statut === 'acceptee' && (
                      <button
                        onClick={() => majStatut(c._id, 'en_cours')}
                        className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600"
                      >
                        Démarrer
                      </button>
                    )}
                    {c.statut === 'en_cours' && (
                      <button
                        onClick={() => majStatut(c._id, 'livree')}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Marquer livrée
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
