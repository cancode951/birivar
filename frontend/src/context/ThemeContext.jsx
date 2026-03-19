import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

function getInitialTheme() {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;

  // Varsayılan: mevcut tasarım = koyu
  return 'dark';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    localStorage.setItem('theme', theme);

    // Tailwind dark: variant yok; bu projede global "filter" ile light görünümü veriyoruz.
    const root = document.documentElement;
    if (theme === 'light') root.classList.add('theme-light');
    else root.classList.remove('theme-light');
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const v = useContext(ThemeContext);
  if (!v) throw new Error('useTheme must be used within ThemeProvider');
  return v;
}

