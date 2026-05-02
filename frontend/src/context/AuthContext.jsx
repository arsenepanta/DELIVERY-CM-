import { createContext, useContext, useState, useEffect } from 'react';
import { connectSocket, disconnectSocket, onAccountBlocked } from '../services/socket';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (user?._id && token) {
      connectSocket(user._id, token);
    }
  }, [user?._id, token]);

  // Enregistrer le callback une seule fois
  useEffect(() => {
    onAccountBlocked((data) => {
      console.log('🔒 Compte bloqué détecté');
      // Vider session sans toucher isBlocked
      setUser(null);
      setToken(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      disconnectSocket();
      // Marquer comme bloqué APRÈS nettoyage
      setIsBlocked(true);
    });
  }, []);

  const login = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
    setIsBlocked(false);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', tokenData);
    connectSocket(userData._id, tokenData);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsBlocked(false);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    disconnectSocket();
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isBlocked }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
