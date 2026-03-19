import { useEffect } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';

export default function SocketManager() {
  useEffect(() => {
    const ensureConnected = () => {
      const token = localStorage.getItem('token');
      const rawUser = localStorage.getItem('user');
      let user = null;
      if (rawUser) {
        try {
          user = JSON.parse(rawUser);
        } catch {
          user = null;
        }
      }

      const s = getSocket();
      if (!s && token && user?._id) {
        connectSocket({ userId: user._id });
      }
      if (s && !token) {
        disconnectSocket();
      }
    };

    ensureConnected();
    const interval = window.setInterval(ensureConnected, 1500);

    const onStorage = (e) => {
      if (e.key === 'token' && !e.newValue) {
        disconnectSocket();
      }
      if (e.key === 'user' && e.newValue) {
        try {
          const u = JSON.parse(e.newValue);
          const s = getSocket();
          if (!s && localStorage.getItem('token') && u?._id) {
            connectSocket({ userId: u._id });
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}

