import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import toast from 'react-hot-toast';

export default function LivreurDashboard() {
  const { user, logout } = useAuth();
  const [disponibles, setDisponibles] = useState([]);
  const [mesLivraisons, setMesLivraisons] = useState([]);
  const [tab, setTab] = useState('disponibles');

  const fetchData = async () => {
    try {
      const [r1, r2] = await Promise.all([
        API.get('/commandes/disponibles'),
        API.get('/commandes/mes-livraisons')
      ]);
      setDisponibles(r1.data);
      setMesLivraisons(r2.data);
    } catch { toast.error('Erreur chargement'); }
  };

  useEffect(() => { fetchData(); }, []);

  const accepter = async (id) => {
    try {
      await API.put(`/commandes/${id}/accepter`);
      toast.success('Commande acceptée !');
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  const updateStatut = async (id, statut) => {
    try {
      await API.put(`/commandes/${id}/statut`, { statut });
      toast.success('Statut mis à jour !');
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  const statutColor = {
    en_attente: 'bg-yellow-100 text-yellow-800',
    acceptee:   'bg-blue-100 text-blue-800',
    en_cours:   'bg-purple-100 text-purple-800',
    livree:     'bg-green-100 text-green-800',
    annulee:    'bg-red-100 text-red-800'
  };

  const statutLabel = {
    en_attente: 'En attente',
    acceptee:   'Acceptée',
    en_cours:   'En cours',
    livree:     'Livrée',
    annulee:    'Annulée'
  };

  const mesCours  = mesLivraisons.filter(c => ['acceptee','en_cours'].includes(c.statut));
  const terminees = mesLivraisons.filter(c => c.statut === 'livree');

  const liste = tab === 'disponibles' ? disponibles
              : tab === 'encours'     ? mesCours
              : terminees;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-600 text-white px-6 py-4 flex justify-between items-center shadow-md">
        <h1 className="text-2xl font-bold">🚴 DeliveryCM - Livreur</h1>
        <div className="flex items-center gap-4">
          <span className="text-green-100">Bonjour, {user?.prenom || user?.nom}</span>
          <button
            onClick={logout}
            className="bg-white text-green-600 px-4 py-2 rounded-lg font-semibold hover:bg-green-50 transition"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <p className="text-3xl font-bold text-yellow-500">{disponibles.length}</p>
            <p className="text-gray-500">Disponibles</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <p className="text-3xl font-bold text-purple-500">{mesCours.length}</p>
            <p className="text-gray-500">En cours</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <p className="text-3xl font-bold text-green-500">{terminees.length}</p>
            <p className="text-gray-500">Livrées</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('disponibles')}
            className={`px-5 py-2 rounded-full font-medium transition ${tab === 'disponibles' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 shadow'}`}
          >
            📦 Disponibles ({disponibles.length})
          </button>
          <button
            onClick={() => setTab('encours')}
            className={`px-5 py-2 rounded-full font-medium transition ${tab === 'encours' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 shadow'}`}
          >
            🚴 Mes livraisons ({mesCours.length})
          </button>
          <button
            onClick={() => setTab('terminees')}
            className={`px-5 py-2 rounded-full font-medium transition ${tab === 'terminees' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 shadow'}`}
          >
            ✅ Terminées ({terminees.length})
          </button>
        </div>

        <div className="space-y-4">
          {liste.length === 0 ? (
            <p className="text-gray-500 text-center py-12">Aucune commande dans cette catégorie</p>
          ) : (
            liste.map((c) => (
              <div key={c._id} className="bg-white rounded-xl p-5 shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-lg text-gray-800">{c.description}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      📍 {c.adresseDepart} → {c.adresseArrivee}
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statutColor[c.statut]}`}>
                    {statutLabel[c.statut]}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-4">
                  <p><strong>👤 Client:</strong> {c.client?.nom || '—'}</p>
                  <p><strong>📞 Téléphone:</strong> {c.client?.telephone || '—'}</p>
                  <p><strong>⚖️ Poids:</strong> {c.poids} kg</p>
                  <p><strong>💰 Prix:</strong> <span className="text-orange-500 font-semibold">{c.prix} FCFA</span></p>
                  {c.notes && <p className="col-span-2"><strong>📝 Notes:</strong> {c.notes}</p>}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {c.statut === 'en_attente' && (
                    <button
                      onClick={() => accepter(c._id)}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600 transition"
                    >
                      ✅ Accepter
                    </button>
                  )}
                  {c.statut === 'acceptee' && (
                    <button
                      onClick={() => updateStatut(c._id, 'en_cours')}
                      className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-600 transition"
                    >
                      🚴 Démarrer la livraison
                    </button>
                  )}
                  {c.statut === 'en_cours' && (
                    <button
                      onClick={() => updateStatut(c._id, 'livree')}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition"
                    >
                      📦 Marquer comme livrée
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
