import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', telephone: '', motDePasse: '', role: 'client'
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/auth/inscription', form);
      toast.success('Compte créé ! Connectez-vous.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const field = (type, placeholder, key, required = true) => (
    <input
      type={type}
      placeholder={placeholder}
      className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
      value={form[key]}
      onChange={e => setForm({...form, [key]: e.target.value})}
      required={required}
    />
  );

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center">
      <Toaster />
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-orange-500 text-center mb-2">🛵 DeliveryCM</h1>
        <p className="text-center text-gray-500 mb-6">Créer un compte</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {field('text', 'Nom', 'nom')}
            {field('text', 'Prénom', 'prenom')}
          </div>
          {field('email', 'Email', 'email')}
          {field('tel', 'Téléphone (ex: 6XXXXXXXX)', 'telephone')}
          {field('password', 'Mot de passe', 'motDePasse')}
          <select
            className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
            value={form.role}
            onChange={e => setForm({...form, role: e.target.value})}
          >
            <option value="client">Client</option>
            <option value="livreur">Livreur</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>
        <p className="text-center mt-4 text-gray-500">
          Déjà un compte ? <a href="/login" className="text-orange-500 font-semibold">Se connecter</a>
        </p>
      </div>
    </div>
  );
}
