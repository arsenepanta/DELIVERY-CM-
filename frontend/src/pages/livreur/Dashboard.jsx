import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import toast from 'react-hot-toast';
import { getSocket } from '../../services/socket';

export default function LivreurDashboard() {
  const { user, logout } = useAuth();
  const [disponibles, setDisponibles] = useState([]);
  const [mesLivraisons, setMesLivraisons] = useState([]);
  const [tab, setTab] = useState('disponibles');

  // 🔍 Filtres
  const [recherche, setRecherche] = useState('');
  const [filtreDate, setFiltreDate] = useState('tous');
  const [filtrePoids, setFiltrePoids] = useState('tous');

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

  // 🔔 Temps réel
  useEffect(() => {
    const socket = getSocket();
    if (!socket?.connected) return;

    const handleNouvelleCommande = () => fetchData();
    const handleStatutCommande = (data) => {
      setMesLivraisons(prev =>
        prev.map(c => c._id === data.commandeId ? { ...c, statut: data.statut } : c)
      );
    };

    socket.on('nouvelle_commande', handleNouvelleCommande);
    socket.on('statut_commande', handleStatutCommande);

    return () => {
      socket.off('nouvelle_commande', handleNouvelleCommande);
      socket.off('statut_commande', handleStatutCommande);
    };
  }, []);

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

  const mesCours  = mesLivraisons.filter(c => ['acceptee', 'en_cours'].includes(c.statut));
  const terminees = mesLivraisons.filter(c => c.statut === 'livree');
  const revenus   = terminees.reduce((sum, c) => sum + (c.prix || 0), 0);

  // 🔍 Fonction de filtrage
  const appliquerFiltres = (liste) => {
    return liste.filter(c => {
      // Recherche texte
      if (recherche.trim()) {
        const q = recherche.toLowerCase();
        const match =
          c.description?.toLowerCase().includes(q) ||
          c.adresseDepart?.toLowerCase().includes(q) ||
          c.adresseArrivee?.toLowerCase().includes(q) ||
          c.client?.nom?.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Filtre date
      if (filtreDate !== 'tous') {
        const now = new Date();
        const created = new Date(c.createdAt);
        const diffDays = (now - created) / (1000 * 60 * 60 * 24);
        if (filtreDate === 'aujourd_hui' && diffDays > 1) return false;
        if (filtreDate === '7jours' && diffDays > 7) return false;
        if (filtreDate === '30jours' && diffDays > 30) return false;
      }

      // Filtre poids
      if (filtrePoids !== 'tous') {
        const p = c.poids || 0;
        if (filtrePoids === 'leger' && p >= 5) return false;
        if (filtrePoids === 'moyen' && (p < 5 || p >= 20)) return false;
        if (filtrePoids === 'lourd' && p < 20) return false;
      }

      return true;
    });
  };

  const listeSource = tab === 'disponibles' ? disponibles
                    : tab === 'encours'     ? mesCours
                    : terminees;

  const liste = appliquerFiltres(listeSource);

  const filtresActifs = recherche.trim() || filtreDate !== 'tous' || filtrePoids !== 'tous';

  const resetFiltres = () => {
    setRecherche('');
    setFiltreDate('tous');
    setFiltrePoids('tous');
  };

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

        {/* Stats cliquables */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div
            onClick={() => setTab('disponibles')}
            className="bg-white rounded-2xl shadow p-5 text-center border-t-4 border-yellow-400 cursor-pointer hover:shadow-md transition"
          >
            <p className="text-3xl font-bold text-yellow-500">{disponibles.length}</p>
            <p className="text-gray-500 text-sm mt-1">Disponibles</p>
          </div>
          <div
            onClick={() => setTab('encours')}
            className="bg-white rounded-2xl shadow p-5 text-center border-t-4 border-purple-400 cursor-pointer hover:shadow-md transition"
          >
            <p className="text-3xl font-bold text-purple-500">{mesCours.length}</p>
            <p className="text-gray-500 text-sm mt-1">En cours</p>
          </div>
          <div
            onClick={() => setTab('terminees')}
            className="bg-white rounded-2xl shadow p-5 text-center border-t-4 border-green-400 cursor-pointer hover:shadow-md transition"
          >
            <p className="text-3xl font-bold text-green-500">{terminees.length}</p>
            <p className="text-gray-500 text-sm mt-1">Livrées</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-5 text-center border-t-4 border-orange-400">
            <p className="text-2xl font-bold text-orange-500">{revenus.toLocaleString()}</p>
            <p className="text-gray-500 text-sm mt-1">Revenus (FCFA)</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { key: 'disponibles', label: '📦 Disponibles', count: disponibles.length },
            { key: 'encours',     label: '🚴 En cours',    count: mesCours.length },
            { key: 'terminees',   label: '✅ Terminées',   count: terminees.length },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); resetFiltres(); }}
              className={`px-5 py-2 rounded-full font-medium transition ${
                tab === t.key ? 'bg-green-600 text-white' : 'bg-white text-gray-600 shadow'
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* 🔍 Barre de filtres */}
        <div className="bg-white rounded-xl shadow p-4 mb-6 space-y-3">
          <input
            type="text"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="🔍 Rechercher par description, adresse, client..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          />
          <div className="flex gap-3 flex-wrap">
            <select
              value={filtreDate}
              onChange={e => setFiltreDate(e.target.value)}
              className="flex-1 min-w-[140px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="tous">📅 Toutes les dates</option>
              <option value="aujourd_hui">Aujourd'hui</option>
              <option value="7jours">7 derniers jours</option>
              <option value="30jours">30 derniers jours</option>
            </select>

            <select
              value={filtrePoids}
              onChange={e => setFiltrePoids(e.target.value)}
              className="flex-1 min-w-[140px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="tous">⚖️ Tous les poids</option>
              <option value="leger">Léger (&lt; 5 kg)</option>
              <option value="moyen">Moyen (5–20 kg)</option>
              <option value="lourd">Lourd (&gt; 20 kg)</option>
            </select>

            {filtresActifs && (
              <button
                onClick={resetFiltres}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 transition"
              >
                ✕ Effacer
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400">
            {liste.length} résultat{liste.length > 1 ? 's' : ''} sur {listeSource.length}
          </p>
        </div>

        {/* Liste */}
        <div className="space-y-4">
          {liste.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">😔 Aucune commande trouvée</p>
              {filtresActifs && (
                <button onClick={resetFiltres} className="mt-2 text-green-600 underline text-sm">
                  Effacer les filtres
                </button>
              )}
            </div>
          ) : (
            liste.map((c) => (
              <div key={c._id} className="bg-white rounded-xl p-5 shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-lg text-gray-800">{c.description}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      📍 {c.adresseDepart} → {c.adresseArrivee}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      🕐 {new Date(c.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
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
                  <p><strong>💰 Prix:</strong> <span className="text-orange-500 font-semibold">{c.prix?.toLocaleString()} FCFA</span></p>
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
