import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    // Initialize from localStorage or default to dark
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      return stored ? stored === 'dark' : true;
    }
    return true;
  });

  useEffect(() => {
    // Apply theme on mount and whenever it changes
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  return (
    <button
      onClick={toggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg glass hover:bg-white/20"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}


