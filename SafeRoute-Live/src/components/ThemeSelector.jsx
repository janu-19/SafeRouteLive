import { useState, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';

const themes = [
  {
    id: 'default',
    name: 'Ocean',
    colors: {
      primary: '#3b82f6',
      secondary: '#06b6d4',
      accent: '#8b5cf6',
      success: '#22c55e',
      warning: '#f59e0b',
      danger: '#ef4444',
      bgLight: '#eff6ff',
      bgDark: '#0c4a6e',
      textLight: '#1e40af',
      textDark: '#93c5fd'
    }
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: {
      primary: '#f97316',
      secondary: '#ec4899',
      accent: '#a855f7',
      success: '#10b981',
      warning: '#fbbf24',
      danger: '#dc2626',
      bgLight: '#fff7ed',
      bgDark: '#7c2d12',
      textLight: '#c2410c',
      textDark: '#fed7aa'
    }
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: {
      primary: '#059669',
      secondary: '#14b8a6',
      accent: '#84cc16',
      success: '#22c55e',
      warning: '#eab308',
      danger: '#ef4444',
      bgLight: '#ecfdf5',
      bgDark: '#064e3b',
      textLight: '#047857',
      textDark: '#6ee7b7'
    }
  },
  {
    id: 'midnight',
    name: 'Midnight',
    colors: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      accent: '#ec4899',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#f43f5e',
      bgLight: '#eef2ff',
      bgDark: '#312e81',
      textLight: '#4f46e5',
      textDark: '#c7d2fe'
    }
  },
  {
    id: 'coral',
    name: 'Coral',
    colors: {
      primary: '#f43f5e',
      secondary: '#fb923c',
      accent: '#fbbf24',
      success: '#34d399',
      warning: '#fcd34d',
      danger: '#dc2626',
      bgLight: '#fff1f2',
      bgDark: '#881337',
      textLight: '#be123c',
      textDark: '#fda4af'
    }
  }
];

export default function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState('default');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('colorTheme');
    if (stored) {
      setCurrentTheme(stored);
      applyTheme(stored);
    }
  }, []);

  const applyTheme = (themeId) => {
    const theme = themes.find(t => t.id === themeId);
    if (!theme) return;

    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-accent', theme.colors.accent);
    root.style.setProperty('--color-success', theme.colors.success);
    root.style.setProperty('--color-warning', theme.colors.warning);
    root.style.setProperty('--color-danger', theme.colors.danger);
    root.style.setProperty('--color-bg-light', theme.colors.bgLight);
    root.style.setProperty('--color-bg-dark', theme.colors.bgDark);
    root.style.setProperty('--color-text-light', theme.colors.textLight);
    root.style.setProperty('--color-text-dark', theme.colors.textDark);
  };

  const handleThemeChange = (themeId) => {
    setCurrentTheme(themeId);
    applyTheme(themeId);
    localStorage.setItem('colorTheme', themeId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg glass hover:bg-white/20 transition-colors"
        aria-label="Select theme"
        title="Select theme"
      >
        <Palette size={18} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 z-[9999] w-64 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl p-3">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 px-2">
              Choose Theme
            </div>
            <div className="space-y-1">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all hover:bg-slate-100 dark:hover:bg-slate-800/50 ${
                    currentTheme === theme.id ? 'bg-slate-100 dark:bg-slate-800/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div 
                        className="w-4 h-4 rounded-full border border-white/50" 
                        style={{ backgroundColor: theme.colors.primary }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full border border-white/50" 
                        style={{ backgroundColor: theme.colors.secondary }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full border border-white/50" 
                        style={{ backgroundColor: theme.colors.accent }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {theme.name}
                    </span>
                  </div>
                  {currentTheme === theme.id && (
                    <Check size={16} className="text-slate-700 dark:text-slate-200" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
