import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import toast from 'react-hot-toast';
import { getSocket } from '../../services/socket';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [commandes, setCommandes] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('commandes');

  // Filtres commandes
  const [rechercheCmd, setRechercheCmd] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [filtreDateCmd, setFiltreDateCmd] = useState('tous');

  // Filtres users
  const [rechercheUser, setRechercheUser] = useState('');
  const [filtreRole, setFiltreRole] = useState('tous');
  const [filtreBloque, setFiltreBloque] = useState('tous');

  const fetchCommandes = async () => {
    try {
      const res = await API.get('/commandes/toutes');
      setCommandes(res.data);
    } catch { toast.error('Erreur chargement commandes'); }
  };

  const fetchUsers = async () => {
    try {
      const res = await API.get('/admin/users');
      setUsers(res.data);
    } catch { toast.error('Erreur chargement users'); }
  };

  useEffect(() => { fetchCommandes(); fetchUsers(); }, []);

  // Temps réel
  useEffect(() => {
    const socket = getSocket();
    if (!socket?.connected) return;
    socket.on('nouvelle_commande', fetchCommandes);
    socket.on('statut_commande', fetchCommandes);
    return () => {
      socket.off('nouvelle_commande', fetchCommandes);
      socket.off('statut_commande', fetchCommandes);
    };
  }, []);

  const toggleBlock = async (id, isBlocked) => {
    try {
      await API.patch(`/admin/users/${id}/bloquer`);
      toast.success(isBlocked ? 'Utilisateur débloqué' : 'Utilisateur bloqué');
      fetchUsers();
    } catch { toast.error('Erreur'); }
  };

  const changeRole = async (id, role) => {
    try {
      await API.patch(`/admin/users/${id}/role`, { role });
      toast.success('Rôle modifié');
      fetchUsers();
    } catch { toast.error('Erreur changement rôle'); }
  };

  const deleteUser = async (id) => {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    try {
      await API.delete(`/admin/users/${id}`);
      toast.success('Utilisateur supprimé');
      fetchUsers();
    } catch { toast.error('Erreur suppression'); }
  };

  const deleteCommande = async (id) => {
    if (!confirm('Supprimer cette commande ?')) return;
    try {
      await API.delete(`/commandes/${id}`);
      toast.success('Commande supprimée');
      fetchCommandes();
    } catch { toast.error('Erreur suppression'); }
  };

  const statutColor = {
    en_attente: 'bg-yellow-100 text-yellow-800',
    acceptee:   'bg-blue-100 text-blue-800',
    en_cours:   'bg-purple-100 text-purple-800',
    livree:     'bg-green-100 text-green-800',
    annulee:    'bg-red-100 text-red-800'
  };
  const statutLabel = {
    en_attente: 'En attente', acceptee: 'Acceptée',
    en_cours: 'En cours', livree: 'Livrée', annulee: 'Annulée'
  };
  const roleColor = {
    admin:   'bg-red-100 text-red-700',
    livreur: 'bg-blue-100 text-blue-700',
    client:  'bg-green-100 text-green-700'
  };

  // Stats
  const total    = commandes.length;
  const livrees  = commandes.filter(c => c.statut === 'livree').length;
  const attente  = commandes.filter(c => c.statut === 'en_attente').length;
  const enCours  = commandes.filter(c => ['acceptee','en_cours'].includes(c.statut)).length;
  const revenus  = commandes.filter(c => c.statut === 'livree').reduce((s,c) => s+(c.prix||0), 0);
  const nbClients  = users.filter(u => u.role === 'client').length;
  const nbLivreurs = users.filter(u => u.role === 'livreur').length;
  const nbBloques  = users.filter(u => u.isBlocked).length;

  // Filtrage commandes
  const isRecente = (date, jours) => {
    if (!date) return false;
    return (Date.now() - new Date(date)) / 86400000 <= jours;
  };
  const commandesFiltrees = commandes.filter(c => {
    const matchRecherche = !rechercheCmd ||
      c.description?.toLowerCase().includes(rechercheCmd.toLowerCase()) ||
      c.adresseDepart?.toLowerCase().includes(rechercheCmd.toLowerCase()) ||
      c.adresseArrivee?.toLowerCase().includes(rechercheCmd.toLowerCase()) ||
      c.client?.nom?.toLowerCase().includes(rechercheCmd.toLowerCase()) ||
      c.livreur?.nom?.toLowerCase().includes(rechercheCmd.toLowerCase());
    const matchStatut = filtreStatut === 'tous' || c.statut === filtreStatut;
    const matchDate = filtreDateCmd === 'tous' ? true
      : filtreDateCmd === 'aujourd_hui' ? isRecente(c.createdAt, 1)
      : filtreDateCmd === '7j' ? isRecente(c.createdAt, 7)
      : isRecente(c.createdAt, 30);
    return matchRecherche && matchStatut && matchDate;
  });

  // Filtrage users
  const usersFiltres = users.filter(u => {
    const matchRecherche = !rechercheUser ||
      u.nom?.toLowerCase().includes(rechercheUser.toLowerCase()) ||
      u.prenom?.toLowerCase().includes(rechercheUser.toLowerCase()) ||
      u.telephone?.includes(rechercheUser) ||
      u.email?.toLowerCase().includes(rechercheUser.toLowerCase());
    const matchRole = filtreRole === 'tous' || u.role === filtreRole;
    const matchBloque = filtreBloque === 'tous'
      ? true : filtreBloque === 'bloques' ? u.isBlocked : !u.isBlocked;
    return matchRecherche && matchRole && matchBloque;
  });

  const resetFiltresCmd = () => { setRechercheCmd(''); setFiltreStatut('tous'); setFiltreDateCmd('tous'); };
  const resetFiltresUser = () => { setRechercheUser(''); setFiltreRole('tous'); setFiltreBloque('tous'); };
  const filtresActifsCmd = rechercheCmd || filtreStatut !== 'tous' || filtreDateCmd !== 'tous';
  const filtresActifsUser = rechercheUser || filtreRole !== 'tous' || filtreBloque !== 'tous';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">⚙️ DeliveryCM - Admin</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">Bonjour, {user?.prenom || user?.nom}</span>
          <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition">
            Déconnexion
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">

        {/* Stats commandes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div onClick={() => { setTab('commandes'); setFiltreStatut('tous'); }}
            className="bg-white rounded-2xl shadow p-6 text-center cursor-pointer hover:shadow-md transition">
            <p className="text-3xl font-bold text-orange-500">{total}</p>
            <p className="text-gray-500 text-sm">Total commandes</p>
          </div>
          <div onClick={() => { setTab('commandes'); setFiltreStatut('en_attente'); }}
            className="bg-white rounded-2xl shadow p-6 text-center cursor-pointer hover:shadow-md transition">
            <p className="text-3xl font-bold text-yellow-500">{attente}</p>
            <p className="text-gray-500 text-sm">En attente</p>
          </div>
          <div onClick={() => { setTab('commandes'); setFiltreStatut('en_cours'); }}
            className="bg-white rounded-2xl shadow p-6 text-center cursor-pointer hover:shadow-md transition">
            <p className="text-3xl font-bold text-purple-500">{enCours}</p>
            <p className="text-gray-500 text-sm">En cours</p>
          </div>
          <div onClick={() => { setTab('commandes'); setFiltreStatut('livree'); }}
            className="bg-white rounded-2xl shadow p-6 text-center cursor-pointer hover:shadow-md transition">
            <p className="text-3xl font-bold text-green-500">{livrees}</p>
            <p className="text-gray-500 text-sm">Livrées</p>
          </div>
        </div>

        {/* Stats users */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <p className="text-3xl font-bold text-blue-500">{revenus.toLocaleString()}</p>
            <p className="text-gray-500 text-sm">Revenus (FCFA)</p>
          </div>
          <div onClick={() => { setTab('users'); setFiltreRole('client'); }}
            className="bg-white rounded-2xl shadow p-6 text-center cursor-pointer hover:shadow-md transition">
            <p className="text-3xl font-bold text-green-600">{nbClients}</p>
            <p className="text-gray-500 text-sm">Clients</p>
          </div>
          <div onClick={() => { setTab('users'); setFiltreRole('livreur'); }}
            className="bg-white rounded-2xl shadow p-6 text-center cursor-pointer hover:shadow-md transition">
            <p className="text-3xl font-bold text-blue-600">{nbLivreurs}</p>
            <p className="text-gray-500 text-sm">Livreurs</p>
          </div>
          <div onClick={() => { setTab('users'); setFiltreBloque('bloques'); }}
            className="bg-white rounded-2xl shadow p-6 text-center cursor-pointer hover:shadow-md transition">
            <p className="text-3xl font-bold text-red-500">{nbBloques}</p>
            <p className="text-gray-500 text-sm">Bloqués</p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('commandes')}
            className={`px-5 py-2 rounded-full font-medium transition ${tab === 'commandes' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 shadow'}`}>
            📦 Commandes ({commandesFiltrees.length}/{total})
          </button>
          <button onClick={() => setTab('users')}
            className={`px-5 py-2 rounded-full font-medium transition ${tab === 'users' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 shadow'}`}>
            👥 Utilisateurs ({usersFiltres.length}/{users.length})
          </button>
        </div>

        {/* TAB COMMANDES */}
        {tab === 'commandes' && (
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Toutes les commandes</h2>
              <button onClick={fetchCommandes} className="text-sm text-blue-600 hover:underline">🔄 Actualiser</button>
            </div>

            {/* Filtres */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <input
                type="text"
                placeholder="🔍 Rechercher..."
                value={rechercheCmd}
                onChange={e => setRechercheCmd(e.target.value)}
                className="border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
                className="border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                <option value="tous">📋 Tous les statuts</option>
                <option value="en_attente">🟡 En attente</option>
                <option value="acceptee">🔵 Acceptée</option>
                <option value="en_cours">🟣 En cours</option>
                <option value="livree">🟢 Livrée</option>
                <option value="annulee">🔴 Annulée</option>
              </select>
              <select value={filtreDateCmd} onChange={e => setFiltreDateCmd(e.target.value)}
                className="border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                <option value="tous">📅 Toutes les dates</option>
                <option value="aujourd_hui">Aujourd'hui</option>
                <option value="7j">7 derniers jours</option>
                <option value="30j">30 derniers jours</option>
              </select>
            </div>
            {filtresActifsCmd && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-gray-500">{commandesFiltrees.length} résultat(s)</span>
                <button onClick={resetFiltresCmd} className="text-sm text-red-500 hover:underline">✕ Réinitialiser</button>
              </div>
            )}

            {commandesFiltrees.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucune commande trouvée</p>
            ) : (
              <div className="space-y-3">
                {commandesFiltrees.map(c => (
                  <div key={c._id} className="border rounded-xl p-4 flex justify-between items-start">
                    <div className="space-y-1 flex-1">
                      <p className="font-semibold">{c.description}</p>
                      <p className="text-sm text-gray-500">📍 {c.adresseDepart} → {c.adresseArrivee}</p>
                      <p className="text-sm text-gray-500">👤 Client : {c.client?.nom} {c.client?.telephone ? `— ${c.client.telephone}` : ''}</p>
                      <p className="text-sm text-gray-500">🛵 Livreur : {c.livreur ? `${c.livreur.nom} — ${c.livreur.telephone}` : 'Non assigné'}</p>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold text-orange-600">{c.prix?.toLocaleString()} FCFA</p>
                        <p className="text-xs text-gray-400">{c.createdAt ? new Date(c.createdAt).toLocaleString('fr-FR') : ''}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statutColor[c.statut] || 'bg-gray-100'}`}>
                        {statutLabel[c.statut] || c.statut}
                      </span>
                      <button onClick={() => deleteCommande(c._id)}
                        className="text-xs px-3 py-1 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition">
                        🗑️ Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB USERS */}
        {tab === 'users' && (
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Gestion des utilisateurs</h2>
              <button onClick={fetchUsers} className="text-sm text-blue-600 hover:underline">🔄 Actualiser</button>
            </div>

            {/* Filtres */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <input
                type="text"
                placeholder="🔍 Rechercher..."
                value={rechercheUser}
                onChange={e => setRechercheUser(e.target.value)}
                className="border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <select value={filtreRole} onChange={e => setFiltreRole(e.target.value)}
                className="border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                <option value="tous">👥 Tous les rôles</option>
                <option value="client">👤 Clients</option>
                <option value="livreur">🛵 Livreurs</option>
                <option value="admin">⚙️ Admins</option>
              </select>
              <select value={filtreBloque} onChange={e => setFiltreBloque(e.target.value)}
                className="border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                <option value="tous">🔓 Tous</option>
                <option value="actifs">✅ Actifs</option>
                <option value="bloques">🚫 Bloqués</option>
              </select>
            </div>
            {filtresActifsUser && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-gray-500">{usersFiltres.length} résultat(s)</span>
                <button onClick={resetFiltresUser} className="text-sm text-red-500 hover:underline">✕ Réinitialiser</button>
              </div>
            )}

            {usersFiltres.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucun utilisateur trouvé</p>
            ) : (
              <div className="space-y-3">
                {usersFiltres.map(u => (
                  <div key={u._id} className={`border rounded-xl p-4 flex justify-between items-center ${u.isBlocked ? 'bg-red-50 border-red-200' : ''}`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{u.nom} {u.prenom}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor[u.role]}`}>
                          {u.role}
                        </span>
                        {u.isBlocked && <span className="px-2 py-0.5 rounded-full text-xs bg-red-200 text-red-800">Bloqué</span>}
                      </div>
                      <p className="text-sm text-gray-500">📞 {u.telephone} {u.email ? `— ${u.email}` : ''}</p>
                      <p className="text-sm text-gray-500">🏙️ {u.ville || 'N/A'} · Inscrit le {u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : '—'}</p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <select value={u.role} onChange={e => changeRole(u._id, e.target.value)}
                        className="text-sm border rounded-lg px-2 py-1">
                        <option value="client">Client</option>
                        <option value="livreur">Livreur</option>
                        <option value="admin">Admin</option>
                      </select>
                      <div className="flex gap-2">
                        <button onClick={() => toggleBlock(u._id, u.isBlocked)}
                          className={`text-sm px-3 py-1 rounded-lg transition ${u.isBlocked ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-yellow-500 text-white hover:bg-yellow-600'}`}>
                          {u.isBlocked ? '✅ Débloquer' : '🚫 Bloquer'}
                        </button>
                        <button onClick={() => deleteUser(u._id)}
                          className="text-sm px-3 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition">
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
