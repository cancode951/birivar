import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { connectSocket } from '../lib/socket';

const Ctx = createContext(null);

const api = axios.create({ baseURL: '' });
api.interceptors.request.use((config) => {
  const t = localStorage.getItem('token');
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export function UnreadMessagesProvider({ children }) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setCount(0);
        return;
      }
      const res = await api.get('/api/messages/unread-count');
      setCount(Number(res.data?.count || 0));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 8000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Socket: kullanıcı varken bağlan; ilk frame'de socket yoktu, dinleyici hiç eklenmiyordu
  useEffect(() => {
    const onNew = () => refresh();
    let lastSock = null;
    const sync = () => {
      const token = localStorage.getItem('token');
      let u = null;
      try {
        u = JSON.parse(localStorage.getItem('user') || 'null');
      } catch {
        u = null;
      }
      if (!token || !u?._id) return;
      const sock = connectSocket({ userId: u._id });
      sock.emit('join_dm', String(u._id));
      if (lastSock && lastSock !== sock) lastSock.off('receive_message', onNew);
      lastSock = sock;
      sock.off('receive_message', onNew);
      sock.on('receive_message', onNew);
    };
    sync();
    const id = window.setInterval(sync, 2000);
    return () => {
      window.clearInterval(id);
      if (lastSock) lastSock.off('receive_message', onNew);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ unreadCount: count, refreshUnread: refresh }),
    [count, refresh]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUnreadMessages() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUnreadMessages must be used within UnreadMessagesProvider');
  return v;
}

