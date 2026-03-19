import { useEffect, useState } from 'react';

export function useLocalStorageBoolean(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return raw === '1' || raw === 'true';
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, value ? '1' : '0');
    } catch {
      // ignore
    }
  }, [key, value]);

  return [value, setValue];
}

