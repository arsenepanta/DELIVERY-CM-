import { useEffect } from 'react';
import { getSocket } from '../services/socket';
import toast from 'react-hot-toast';

export default function NotificationToast({ role }) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket?.connected) {
      console.warn('⚠️ Socket non connecté pour NotificationToast');
      return;
    }

    console.log(`🔔 NotificationToast activé pour: ${role}`);

    const handlers = {};

    if (role === 'client') {
      handlers.commande_acceptee = (data) => {
        console.log('📨 Événement reçu: commande_acceptee', data);
        toast.success(data.message || '✅ Votre commande a été acceptée !', {
          duration: 5000,
          style: { background: '#1e293b', color: 'white', borderLeft: '4px solid #22c55e' }
        });
      };

      handlers.statut_commande = (data) => {
        console.log('📨 Événement reçu: statut_commande', data);
        toast(data.message || '📋 Statut mis à jour', {
          duration: 5000,
          icon: '🚴',
          style: { background: '#1e293b', color: 'white', borderLeft: '4px solid #f97316' }
        });
      };
    }

    if (role === 'livreur') {
      handlers.nouvelle_commande = (data) => {
        console.log('📨 Événement reçu: nouvelle_commande', data);
        toast(data.message || '📦 Nouvelle commande disponible !', {
          duration: 6000,
          icon: '🔔',
          style: { background: '#1e293b', color: 'white', borderLeft: '4px solid #3b82f6' }
        });
      };

      handlers.commande_prise = (data) => {
        console.log('📨 Événement reçu: commande_prise', data);
      };
    }

    // Enregistrer tous les handlers
    Object.entries(handlers).forEach(([event, fn]) => {
      socket.on(event, fn);
    });

    // Cleanup
    return () => {
      Object.entries(handlers).forEach(([event, fn]) => {
        socket.off(event, fn);
      });
    };
  }, [role]);

  return null;
}
