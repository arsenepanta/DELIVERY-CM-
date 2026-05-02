import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import toast from 'react-hot-toast';
import { getSocket } from '../../services/socket';

export default function LivreurDashboard() {
  const { user, logout } = useAuth();
  const [disponibles, setDisponibles] = useState([]);
  const [mesLivraisons, setMesLivraisons] = useState([]);
  const [tab, setTab] = useState('disponibles');
  const [enLigne, setEnLigne] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingActions, setPendingActions] = useState([]);
  const [gains, setGains] = useState({ today: 0, week: 0, month: 0, total: 0 });
  const [ratings, setRatings] = useState({ moyenne: 0, total: 0, liste: [] });
  const [showGains, setShowGains] = useState(false);
  const [showRatings, setShowRatings] = useState(false);
  const [problemModal, setProblemModal] = useState(null);
  const [problemType, setProblemType] = useState('');
  const [problemDesc, setProblemDesc] = useState('');
  const [mapCommande, setMapCommande] = useState(null);
  const [refusModal, setRefusModal] = useState(null); // id commande
  const [refusRaison, setRefusRaison] = useState('');
  const [timer, setTimer] = useState({}); // { [commandeId]: secondes }


  // Filtres
  const [recherche, setRecherche] = useState('');
  const [filtreDate, setFiltreDate] = useState('tous');
  const [filtrePoids, setFiltrePoids] = useState('tous');

  // ─── Offline detection ───────────────────────────────────────────
  useEffect(() => {
    const goOnline  = () => { setIsOffline(false); syncPending(); };
    const goOffline = () => { setIsOffline(true); toast('📶 Mode hors-ligne activé', { icon: '⚠️' }); };
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  const syncPending = async () => {
    const actions = JSON.parse(localStorage.getItem('pendingActions') || '[]');
    if (!actions.length) return;
    toast('🔄 Synchronisation en cours...');
    for (const action of actions) {
      try {
        if (action.type === 'statut') await API.put(`/commandes/${action.id}/statut`, { statut: action.statut });
        if (action.type === 'accepter') await API.put(`/commandes/${action.id}/accepter`);
      } catch {}
    }
    localStorage.removeItem('pendingActions');
    toast.success('✅ Synchronisation terminée');
    fetchData();
  };

  const saveOfflineAction = (action) => {
    const actions = JSON.parse(localStorage.getItem('pendingActions') || '[]');
    actions.push(action);
    localStorage.setItem('pendingActions', JSON.stringify(actions));
  };

  // ─── Fetch ───────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        API.get('/commandes/disponibles'),
        API.get('/commandes/mes-livraisons'),
        API.get('/livreur/gains').catch(() => ({ data: { today: 0, week: 0, month: 0, total: 0 } })),
        API.get('/livreur/ratings').catch(() => ({ data: { moyenne: 0, total: 0, liste: [] } })),
      ]);
      setDisponibles(r1.data);
      setMesLivraisons(r2.data);
      setGains(r3.data);
      setRatings(r4.data);
      // Cache offline
      localStorage.setItem('cached_disponibles', JSON.stringify(r1.data));
      localStorage.setItem('cached_livraisons',  JSON.stringify(r2.data));
    } catch {
      if (isOffline) {
        setDisponibles(JSON.parse(localStorage.getItem('cached_disponibles') || '[]'));
        setMesLivraisons(JSON.parse(localStorage.getItem('cached_livraisons') || '[]'));
      } else {
        toast.error('Erreur chargement');
      }
    }
  }, [isOffline]);

  useEffect(() => { fetchData(); }, []);

  // ─── Sockets ─────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket?.connected) return;
    const onNew    = () => fetchData();
    const onStatut = (data) => setMesLivraisons(prev =>
      prev.map(c => c._id === data.commandeId ? { ...c, statut: data.statut } : c)
    );
    socket.on('nouvelle_commande', onNew);
    socket.on('statut_commande', onStatut);
    return () => { socket.off('nouvelle_commande', onNew); socket.off('statut_commande', onStatut); };
  }, []);
  // ─── useEffect ───────────────────────────────────────────
    // Timer 30s par commande disponible
  useEffect(() => {
    if (disponibles.length === 0) return;

    // Initialiser les timers pour les nouvelles commandes
    setTimer(prev => {
      const next = { ...prev };
      disponibles.forEach(c => {
        if (!(c._id in next)) next[c._id] = 30;
      });
      // Nettoyer les timers des commandes qui ne sont plus dispo
      Object.keys(next).forEach(id => {
        if (!disponibles.find(c => c._id === id)) delete next[id];
      });
      return next;
    });

    const interval = setInterval(() => {
      setTimer(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          if (next[id] > 0) {
            next[id] -= 1;
            changed = true;
          } else if (next[id] === 0) {
            // Auto-refus silencieux
            API.put(`/commandes/${id}/refuser`, { raison: 'Pas de réponse (timeout)' })
              .then(() => fetchData())
              .catch(() => {});
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [disponibles.length]);


  // ─── Toggle en ligne ─────────────────────────────────────────────
  const toggleEnLigne = async () => {
    try {
      await API.put('/livreur/disponibilite', { disponible: !enLigne });
      setEnLigne(v => !v);
      toast.success(enLigne ? '🔴 Vous êtes hors ligne' : '🟢 Vous êtes en ligne');
    } catch { toast.error('Erreur'); }
  };

  // ─── Actions commande ────────────────────────────────────────────
  const accepter = async (id) => {
    if (isOffline) { saveOfflineAction({ type: 'accepter', id }); toast('📦 Acceptation en attente de connexion'); return; }
    try { await API.put(`/commandes/${id}/accepter`); toast.success('✅ Commande acceptée !'); fetchData(); }
    catch { toast.error('Erreur'); }
  };
  const refuser = async (id, raison) => {
    try {
      await API.put(`/commandes/${id}/refuser`, { raison });
      toast('❌ Commande refusée');
      setRefusModal(null);
      setRefusRaison('');
      // Retirer le timer
      setTimer(prev => { const t = {...prev}; delete t[id]; return t; });
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  const updateStatut = async (id, statut) => {
    if (isOffline) { saveOfflineAction({ type: 'statut', id, statut }); toast(`📝 Statut "${statut}" sauvegardé hors-ligne`); return; }
    try { await API.put(`/commandes/${id}/statut`, { statut }); toast.success('✅ Statut mis à jour'); fetchData(); }
    catch { toast.error('Erreur'); }
  };

  const signalerProbleme = async () => {
    if (!problemType || !problemDesc.trim()) { toast.error('Remplissez tous les champs'); return; }
    try {
      await API.post(`/commandes/${problemModal}/probleme`, { type: problemType, description: problemDesc });
      toast.success('⚠️ Problème signalé');
      setProblemModal(null); setProblemType(''); setProblemDesc('');
    } catch { toast.error('Erreur'); }
  };

  // ─── Contact client ──────────────────────────────────────────────
  const appeler   = (tel) => window.open(`tel:${tel}`);
  const whatsapp  = (tel, nom) => window.open(`https://wa.me/${tel?.replace(/\D/g,'')}?text=Bonjour ${nom}, je suis votre livreur pour votre commande.`);
  const sms       = (tel) => window.open(`sms:${tel}`);

  // ─── Navigation GPS ──────────────────────────────────────────────
  const naviguerVers = (adresse) => {
    const encoded = encodeURIComponent(adresse);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving`);
  };

  // ─── Stats ───────────────────────────────────────────────────────
  const mesCours  = mesLivraisons.filter(c => ['acceptee', 'en_cours', 'recupere'].includes(c.statut));
  const terminees = mesLivraisons.filter(c => c.statut === 'livree');

  // ─── Filtres ─────────────────────────────────────────────────────
  const appliquerFiltres = (liste) => liste.filter(c => {
    if (recherche.trim()) {
      const q = recherche.toLowerCase();
      if (![c.description, c.adresseDepart, c.adresseArrivee, c.client?.nom]
        .some(v => v?.toLowerCase().includes(q))) return false;
    }
    if (filtreDate !== 'tous') {
      const diff = (new Date() - new Date(c.createdAt)) / 86400000;
      if (filtreDate === 'aujourd_hui' && diff > 1) return false;
      if (filtreDate === '7jours' && diff > 7) return false;
      if (filtreDate === '30jours' && diff > 30) return false;
    }
    if (filtrePoids !== 'tous') {
      const p = c.poids || 0;
      if (filtrePoids === 'leger' && p >= 5) return false;
      if (filtrePoids === 'moyen' && (p < 5 || p >= 20)) return false;
      if (filtrePoids === 'lourd' && p < 20) return false;
    }
    return true;
  });

  const resetFiltres = () => { setRecherche(''); setFiltreDate('tous'); setFiltrePoids('tous'); };
  const filtresActifs = recherche || filtreDate !== 'tous' || filtrePoids !== 'tous';

  const statutColor = {
    en_attente: 'bg-yellow-100 text-yellow-800',
    acceptee:   'bg-blue-100 text-blue-800',
    en_cours:   'bg-purple-100 text-purple-800',
    recupere:   'bg-orange-100 text-orange-800',
    livree:     'bg-green-100 text-green-800',
    annulee:    'bg-red-100 text-red-800',
  };
  const statutLabel = {
    en_attente: 'En attente', acceptee: 'Acceptée',
    en_cours: 'En cours', recupere: 'Récupéré',
    livree: 'Livrée', annulee: 'Annulée',
  };

  const listeSource  = tab === 'disponibles' ? disponibles : tab === 'en_cours' ? mesCours : terminees;
  const liste        = appliquerFiltres(listeSource);

  // ─── Étoiles ─────────────────────────────────────────────────────
  const Etoiles = ({ note, taille = 'text-lg' }) => (
    <span className={taille}>
      {[1,2,3,4,5].map(i => (
        <span key={i} className={i <= Math.round(note) ? 'text-yellow-400' : 'text-gray-300'}>★</span>
      ))}
    </span>
  );

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Bannière offline */}
      {isOffline && (
        <div className="bg-orange-500 text-white text-center py-2 text-sm font-semibold">
          📶 Hors-ligne — Les actions seront synchronisées à la reconnexion
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">🚴 Tableau de bord</h1>
            <p className="text-green-100 text-sm">Bonjour, {user?.nom} 👋</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Toggle en ligne */}
            <button
              onClick={toggleEnLigne}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                enLigne ? 'bg-white text-green-600' : 'bg-gray-700 text-gray-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${enLigne ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}/>
              {enLigne ? 'En ligne' : 'Hors ligne'}
            </button>
            <button onClick={logout} className="text-green-100 text-sm underline">Déconnexion</button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Stats rapides */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'En cours', value: mesCours.length,  color: 'blue',   icon: '🚴' },
            { label: 'Livrées',  value: terminees.length, color: 'green',  icon: '✅' },
            { label: 'Gains',    value: `${(gains.today||0).toLocaleString()}`, color: 'orange', icon: '💰', action: () => setShowGains(true) },
            { label: 'Note',     value: ratings.moyenne ? `${ratings.moyenne}/5` : '—', color: 'yellow', icon: '⭐', action: () => setShowRatings(true) },
          ].map(s => (
            <button key={s.label} onClick={s.action}
              className={`bg-white rounded-xl p-3 text-center shadow hover:shadow-md transition ${s.action ? 'cursor-pointer' : ''}`}
            >
              <p className="text-xl">{s.icon}</p>
              <p className={`text-lg font-bold text-${s.color}-600`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Onglets */}
        <div className="flex bg-white rounded-xl shadow overflow-hidden">
          {[
            { key: 'disponibles', label: `Disponibles (${disponibles.length})` },
            { key: 'en_cours',    label: `En cours (${mesCours.length})` },
            { key: 'terminees',   label: `Terminées (${terminees.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                tab === t.key ? 'bg-green-500 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl p-3 shadow space-y-2">
          <div className="flex gap-2 flex-wrap">
            <input
              type="text" placeholder="🔍 Rechercher..."
              value={recherche} onChange={e => setRecherche(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[150px]"
            />
            <select value={filtreDate} onChange={e => setFiltreDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-2 text-sm">
              <option value="tous">Toutes dates</option>
              <option value="aujourd_hui">Aujourd'hui</option>
              <option value="7jours">7 jours</option>
              <option value="30jours">30 jours</option>
            </select>
            <select value={filtrePoids} onChange={e => setFiltrePoids(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-2 text-sm">
              <option value="tous">Tout poids</option>
              <option value="leger">Léger (&lt;5kg)</option>
              <option value="moyen">Moyen (5–20kg)</option>
              <option value="lourd">Lourd (&gt;20kg)</option>
            </select>
            {filtresActifs && (
              <button onClick={resetFiltres}
                className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 transition">
                ✕ Effacer
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400">{liste.length} résultat{liste.length > 1 ? 's' : ''} sur {listeSource.length}</p>
        </div>

        {/* Liste commandes */}
        <div className="space-y-4">
          {liste.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">😔 Aucune commande trouvée</p>
              {filtresActifs && (
                <button onClick={resetFiltres} className="mt-2 text-green-600 underline text-sm">Effacer les filtres</button>
              )}
            </div>
          ) : liste.map(c => (
            <div key={c._id} className="bg-white rounded-xl p-5 shadow space-y-4">

              {/* En-tête commande */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-lg text-gray-800">{c.description}</p>
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

              {/* Adresses + Navigation */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-700">🟢 <strong>Départ:</strong> {c.adresseDepart}</p>
                  <button onClick={() => naviguerVers(c.adresseDepart)}
                    className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-200 transition">
                    🗺️ GPS
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-700">🔴 <strong>Arrivée:</strong> {c.adresseArrivee}</p>
                  <button onClick={() => naviguerVers(c.adresseArrivee)}
                    className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-200 transition">
                    🗺️ GPS
                  </button>
                </div>
                <button
                  onClick={() => setMapCommande(mapCommande === c._id ? null : c._id)}
                  className="w-full text-xs bg-green-50 text-green-600 py-1 rounded-lg hover:bg-green-100 transition mt-1"
                >
                  {mapCommande === c._id ? '🗺️ Masquer la carte' : '🗺️ Voir la carte'}
                </button>
                {mapCommande === c._id && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-gray-200">
                    <iframe
                      title="map"
                      width="100%" height="200"
                      style={{ border: 0 }}
                      loading="lazy"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(c.adresseArrivee)}&output=embed`}
                    />
                  </div>
                )}
              </div>

              {/* Infos */}
              <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                <p><strong>⚖️ Poids:</strong> {c.poids} kg</p>
                <p><strong>💰 Prix:</strong> <span className="text-orange-500 font-semibold">{c.prix?.toLocaleString()} FCFA</span></p>
                {c.notes && <p className="col-span-2"><strong>📝 Notes:</strong> {c.notes}</p>}
              </div>

              {/* Contact client */}
              {c.client && (
                <div className="border border-gray-100 rounded-xl p-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">📞 Client : {c.client.nom}</p>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => appeler(c.client.telephone)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition">
                      📱 Appeler
                    </button>
                    <button onClick={() => whatsapp(c.client.telephone, c.client.nom)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition">
                      💬 WhatsApp
                    </button>
                    <button onClick={() => sms(c.client.telephone)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
                      ✉️ SMS
                    </button>
                  </div>
                </div>
              )}

              {/* Workflow */}
              <div className="space-y-2">
                {/* Barre de progression */}
                {['acceptee','en_cours','recupere','livree'].includes(c.statut) && (
                  <div className="flex items-center gap-1 mb-3">
                    {[
                      { s: 'acceptee', label: 'Accepté' },
                      { s: 'en_cours', label: 'Démarré' },
                      { s: 'recupere', label: 'Récupéré' },
                      { s: 'livree',   label: 'Livré' },
                    ].map((step, i, arr) => {
                      const order  = ['acceptee','en_cours','recupere','livree'];
                      const done   = order.indexOf(c.statut) >= order.indexOf(step.s);
                      return (
                        <div key={step.s} className="flex-1 flex flex-col items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                            {i+1}
                          </div>
                          <p className={`text-xs mt-1 ${done ? 'text-green-600' : 'text-gray-400'}`}>{step.label}</p>
                          {i < arr.length-1 && (
                            <div className={`absolute`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Boutons d'action */}
                <div className="flex gap-2 flex-wrap">
                  {/* Boutons Accepter / Refuser */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => accepter(c._id)}
                      className="flex-1 bg-green-500 text-white py-2 rounded-xl font-semibold hover:bg-green-600 transition flex items-center justify-center gap-2"
                    >
                      ✅ Accepter
                    </button>
                    <button
                      onClick={() => { setRefusModal(c._id); setRefusRaison(''); }}
                      className="flex-1 bg-red-100 text-red-600 py-2 rounded-xl font-semibold hover:bg-red-200 transition flex items-center justify-center gap-2"
                    >
                      ❌ Refuser
                    </button>
                  </div>

                  {/* Timer */}
                  {timer[c._id] !== undefined && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>⏱ Répondre dans</span>
                        <span className={`font-bold ${timer[c._id] <= 10 ? 'text-red-500' : 'text-gray-600'}`}>
                          {timer[c._id]}s
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${timer[c._id] <= 10 ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ width: `${(timer[c._id] / 30) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {c.statut === 'acceptee' && (
                    <button onClick={() => updateStatut(c._id, 'en_cours')}
                      className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-600 transition">
                      🚴 Démarrer
                    </button>
                  )}
                  {c.statut === 'en_cours' && (
                    <button onClick={() => updateStatut(c._id, 'recupere')}
                      className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 transition">
                      📦 Colis récupéré
                    </button>
                  )}
                  {c.statut === 'recupere' && (
                    <button onClick={() => updateStatut(c._id, 'livree')}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition">
                      ✅ Marquer livré
                    </button>
                  )}
                  {['acceptee','en_cours','recupere'].includes(c.statut) && (
                    <button onClick={() => setProblemModal(c._id)}
                      className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-200 transition">
                      ⚠️ Problème
                    </button>
                  )}
                </div>
              </div>

              {/* Note reçue (si livrée) */}
              {c.statut === 'livree' && c.note && (
                <div className="bg-yellow-50 rounded-xl p-3">
                  <p className="text-sm font-semibold text-gray-700">⭐ Note reçue</p>
                  <Etoiles note={c.note} />
                  {c.commentaire && <p className="text-sm text-gray-500 mt-1 italic">"{c.commentaire}"</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal Gains ────────────────────────────────────────────── */}
      {showGains && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">💸 Mes Gains</h2>
              <button onClick={() => setShowGains(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Aujourd'hui", value: gains.today,  icon: '📅' },
                { label: 'Cette semaine', value: gains.week, icon: '📆' },
                { label: 'Ce mois', value: gains.month,      icon: '🗓️' },
                { label: 'Total',   value: gains.total,      icon: '💰' },
              ].map(g => (
                <div key={g.label} className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl">{g.icon}</p>
                  <p className="text-xl font-bold text-green-700">{(g.value||0).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">FCFA — {g.label}</p>
                </div>
              ))}
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">🚴 {terminees.length} livraison{terminees.length > 1 ? 's' : ''} effectuée{terminees.length > 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Ratings ──────────────────────────────────────────── */}
      {showRatings && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">⭐ Mes Notes</h2>
              <button onClick={() => setShowRatings(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="text-center bg-yellow-50 rounded-xl p-4">
              <p className="text-4xl font-bold text-yellow-500">{ratings.moyenne || '—'}</p>
              <Etoiles note={ratings.moyenne} taille="text-2xl" />
              <p className="text-sm text-gray-500 mt-1">{ratings.total} avis</p>
            </div>
            {ratings.liste?.length > 0 && (
              <div className="space-y-3">
                <p className="font-semibold text-gray-700">Derniers avis :</p>
                {ratings.liste.map((r, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex justify-between items-center">
                      <Etoiles note={r.note} />
                      <span className="text-xs text-gray-400">
                        {new Date(r.date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    {r.commentaire && <p className="text-sm text-gray-600 mt-1 italic">"{r.commentaire}"</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal Problème ─────────────────────────────────────────── */}
      {problemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">⚠️ Signaler un problème</h2>
              <button onClick={() => setProblemModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Type de problème</label>
              <select value={problemType} onChange={e => setProblemType(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
                <option value="">-- Sélectionner --</option>
                <option value="client_absent">Client absent</option>
                <option value="adresse_incorrecte">Adresse incorrecte</option>
                <option value="colis_endommage">Colis endommagé</option>
                <option value="accident">Accident / incident</option>
                <option value="refus_reception">Refus de réception</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Description</label>
              <textarea
                value={problemDesc} onChange={e => setProblemDesc(e.target.value)}
                placeholder="Décrivez le problème..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setProblemModal(null)}
                className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition">
                Annuler
              </button>
              <button onClick={signalerProbleme}
                className="flex-1 py-2 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition">
                Signaler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Refus ──────────────────────────────────────────── */}
      {refusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">❌ Refuser la commande</h2>
              <button onClick={() => setRefusModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <p className="text-sm text-gray-500">Pourquoi refusez-vous cette commande ?</p>

            {/* Raisons rapides */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '📍 Trop loin', value: 'Trop loin' },
                { label: '🚗 Problème véhicule', value: 'Problème de véhicule' },
                { label: '⛈️ Météo', value: 'Conditions météo' },
                { label: '📦 Déjà occupé', value: 'Déjà occupé' },
              ].map(r => (
                <button
                  key={r.value}
                  onClick={() => setRefusRaison(r.value)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium border-2 transition ${
                    refusRaison === r.value
                      ? 'border-red-500 bg-red-50 text-red-600'
                      : 'border-gray-200 text-gray-600 hover:border-red-300'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Raison personnalisée */}
            <textarea
              value={refusRaison}
              onChange={e => setRefusRaison(e.target.value)}
              placeholder="Autre raison..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setRefusModal(null)}
                className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => refuser(refusModal, refusRaison)}
                disabled={!refusRaison.trim()}
                className="flex-1 py-2 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 disabled:opacity-50 transition"
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
