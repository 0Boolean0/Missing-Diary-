import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const OfflineQueueContext = createContext(null);
export const useOfflineQueue = () => useContext(OfflineQueueContext);

export function OfflineQueueProvider({ children }) {
  const [queue, setQueue] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('offline_queue') || '[]');
    } catch {
      return [];
    }
  });
  const [status, setStatus] = useState(() => navigator.onLine ? 'online' : 'offline');

  useEffect(() => {
    function handleOnline() {
      setStatus('online');
      retryAll();
    }
    function handleOffline() { setStatus('offline'); }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  function persistQueue(q) {
    setQueue(q);
    localStorage.setItem('offline_queue', JSON.stringify(q));
  }

  function enqueue(submission) {
    const item = { ...submission, id: Date.now(), retries: 0, status: 'queued' };
    persistQueue([...queue, item]);
  }

  async function retryAll() {
    if (queue.length === 0) return;
    const updated = [...queue];
    for (let i = 0; i < updated.length; i++) {
      const item = updated[i];
      if (item.status === 'failed') continue;
      const delay = Math.pow(2, item.retries) * 1000;
      await new Promise(r => setTimeout(r, delay));
      try {
        const { url, method = 'POST', data } = item;
        const { api } = await import('../api/client');
        await api[method.toLowerCase()](url, data);
        updated.splice(i, 1);
        i--;
      } catch {
        updated[i] = { ...item, retries: item.retries + 1, status: item.retries + 1 >= 3 ? 'failed' : 'queued' };
      }
    }
    persistQueue(updated);
  }

  const value = useMemo(() => ({ queue, status, enqueue, retryAll }), [queue, status]);
  return <OfflineQueueContext.Provider value={value}>{children}</OfflineQueueContext.Provider>;
}
