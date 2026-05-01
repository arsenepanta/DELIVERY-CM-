import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ClientDashboard from './pages/client/Dashboard';
import LivreurDashboard from './pages/livreur/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';

function PrivateRoute({ children, roles }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" />;
  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin" />;
  if (user?.role === 'livreur') return <Navigate to="/livreur" />;
  return <Navigate to="/client" />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<PrivateRoute><HomeRedirect /></PrivateRoute>} />
          <Route path="/client" element={<PrivateRoute roles={['client']}><ClientDashboard /></PrivateRoute>} />
          <Route path="/livreur" element={<PrivateRoute roles={['livreur']}><LivreurDashboard /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
