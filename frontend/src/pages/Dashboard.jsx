import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>🚚 Delivery CM - Dashboard</h1>
        <div>
          <span>Bonjour, {user?.name || user?.email}</span>
          <button
            onClick={logout}
            style={{ marginLeft: '15px', padding: '8px 16px', background: 'red', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Déconnexion
          </button>
        </div>
      </div>
      <p>Bienvenue sur votre tableau de bord !</p>
    </div>
  );
}

export default Dashboard;
