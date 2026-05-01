import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [commandes, setCommandes] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('commandes');

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

  const total   = commandes.length;
  const livrees = commandes.filter(c => c.statut === 'livree').length;
  const attente = commandes.filter(c => c.statut === 'en_attente').length;
  const revenus = commandes.filter(c => c.statut === 'livree').reduce((s,c) => s+(c.prix||0), 0);

  const roleColor = {
    admin:   'bg-red-100 text-red-700',
    livreur: 'bg-blue-100 text-blue-700',
    client:  'bg-green-100 text-green-700'
  };

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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <p className="text-3xl font-bold text-orange-500">{total}</p>
            <p className="text-gray-500">Total commandes</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <p className="text-3xl font-bold text-yellow-500">{attente}</p>
            <p className="text-gray-500">En attente</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <p className="text-3xl font-bold text-green-500">{livrees}</p>
            <p className="text-gray-500">Livrées</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-6 text-center">
            <p className="text-3xl font-bold text-blue-500">{revenus} F</p>
            <p className="text-gray-500">Revenus</p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('commandes')}
            className={`px-5 py-2 rounded-full font-medium transition ${tab === 'commandes' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 shadow'}`}
          >
            📦 Commandes ({total})
          </button>
          <button
            onClick={() => setTab('users')}
            className={`px-5 py-2 rounded-full font-medium transition ${tab === 'users' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 shadow'}`}
          >
            👥 Utilisateurs ({users.length})
          </button>
        </div>

        {/* TAB COMMANDES */}
        {tab === 'commandes' && (
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Toutes les commandes</h2>
              <button onClick={fetchCommandes} className="text-sm text-blue-600 hover:underline">🔄 Actualiser</button>
            </div>
            {commandes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucune commande</p>
            ) : (
              <div className="space-y-3">
                {commandes.map(c => (
                  <div key={c._id} className="border rounded-xl p-4 flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="font-semibold">{c.description}</p>
                      <p className="text-sm text-gray-500">📍 {c.adresseDepart} → {c.adresseArrivee}</p>
                      <p className="text-sm text-gray-500">👤 Client : {c.client?.nom} {c.client?.telephone ? `— ${c.client.telephone}` : ''}</p>
                      <p className="text-sm text-gray-500">🛵 Livreur : {c.livreur ? `${c.livreur.nom} — ${c.livreur.telephone}` : 'Non assigné'}</p>
                      <p className="text-sm font-semibold text-orange-600">{c.prix} FCFA</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statutColor[c.statut] || 'bg-gray-100'}`}>
                      {statutLabel[c.statut] || c.statut}
                    </span>
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
            {users.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucun utilisateur</p>
            ) : (
              <div className="space-y-3">
                {users.map(u => (
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
                      <p className="text-sm text-gray-500">🏙️ {u.ville || 'N/A'}</p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {/* Changer rôle */}
                      <select
                        value={u.role}
                        onChange={e => changeRole(u._id, e.target.value)}
                        className="text-sm border rounded-lg px-2 py-1"
                      >
                        <option value="client">Client</option>
                        <option value="livreur">Livreur</option>
                        <option value="admin">Admin</option>
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleBlock(u._id, u.isBlocked)}
                          className={`text-sm px-3 py-1 rounded-lg transition ${u.isBlocked ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-yellow-500 text-white hover:bg-yellow-600'}`}
                        >
                          {u.isBlocked ? '✅ Débloquer' : '🚫 Bloquer'}
                        </button>
                        <button
                          onClick={() => deleteUser(u._id)}
                          className="text-sm px-3 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
                        >
                          🗑️ Supprimer
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
