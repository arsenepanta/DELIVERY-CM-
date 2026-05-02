import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function BlockedNotification() {
  const { isBlocked } = useAuth();
  const navigate = useNavigate();
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (isBlocked) {
      setShowNotification(true);
      // Redirection vers /blocked après 2 secondes
      const timer = setTimeout(() => {
        navigate('/blocked');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isBlocked, navigate]);

  if (!showNotification) return null;

  return (
    <div className="fixed top-4 right-4 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-pulse z-50">
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
      </svg>
      <span className="font-semibold">Votre compte a été bloqué</span>
    </div>
  );
}
