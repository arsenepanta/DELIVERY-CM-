import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import BlockedNotification from './components/BlockedNotification';
import Login from './pages/Login';
import Register from './pages/Register';
import ClientDashboard from './pages/client/Dashboard';
import LivreurDashboard from './pages/livreur/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import BlockedPage from './pages/BlockedPage';

function PrivateRoute({ children, roles }) {
  const { token, user, isBlocked } = useAuth();
  
  if (isBlocked) return <Navigate to="/blocked" />;
  if (!token) return <Navigate to="/login" />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" />;
  return children;
}

function HomeRedirect() {
  const { user, isBlocked } = useAuth();
  
  if (isBlocked) return <Navigate to="/blocked" />;
  if (user?.role === 'admin') return <Navigate to="/admin" />;
  if (user?.role === 'livreur') return <Navigate to="/livreur" />;
  return <Navigate to="/client" />;
}

function AppContent() {
  return (
    <>
      <BlockedNotification />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/blocked" element={<BlockedPage />} />
        <Route path="/" element={<PrivateRoute><HomeRedirect /></PrivateRoute>} />
        <Route path="/client" element={<PrivateRoute roles={['client']}><ClientDashboard /></PrivateRoute>} />
        <Route path="/livreur" element={<PrivateRoute roles={['livreur']}><LivreurDashboard /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
