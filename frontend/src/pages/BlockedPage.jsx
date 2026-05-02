import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

export default function BlockedPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login');
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-red-600 mb-3">Compte Bloqué</h1>
        <p className="text-gray-600 text-lg mb-6">
          Votre compte a été bloqué par l'administrateur.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          Vous allez être redirigé dans 5 secondes...
        </p>
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
        >
          Retourner à la connexion
        </button>
      </div>
    </div>
  );
}
