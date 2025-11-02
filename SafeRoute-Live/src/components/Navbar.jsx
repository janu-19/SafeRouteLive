import { Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { Menu, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import ThemeSelector from './ThemeSelector.jsx';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="glass border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="mx-auto max-w-7xl">
          <div className="flex h-12 items-center justify-between px-6">
            <Link to="/" className="text-base font-semibold text-slate-900 dark:text-white tracking-tight hover:opacity-70 transition-opacity">
              SafeRoute Live
            </Link>
            <nav className="hidden md:flex items-center gap-2 text-sm absolute left-1/2 -translate-x-1/2">
              <NavLink to="/" className={({ isActive }) => isActive ? 'text-primary px-3 py-1.5 rounded-md bg-slate-200/60 dark:bg-slate-800/60 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-all px-3 py-1.5 rounded-md'}>Home</NavLink>
              <NavLink to="/route-planner" className={({ isActive }) => isActive ? 'text-primary px-3 py-1.5 rounded-md bg-slate-200/60 dark:bg-slate-800/60 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-all px-3 py-1.5 rounded-md'}>Route Planner</NavLink>
              <NavLink to="/share" className={({ isActive }) => isActive ? 'text-primary px-3 py-1.5 rounded-md bg-slate-200/60 dark:bg-slate-800/60 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-all px-3 py-1.5 rounded-md'}>Share Live</NavLink>
              <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'text-primary px-3 py-1.5 rounded-md bg-slate-200/60 dark:bg-slate-800/60 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-all px-3 py-1.5 rounded-md'}>Dashboard</NavLink>
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  {user?.picture ? (
                    <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full" />
                  ) : (
                    <User size={16} />
                  )}
                  <span className="text-xs">{user?.name}</span>
                  <button onClick={logout} className="text-slate-600 dark:text-slate-400 hover:text-primary px-3 py-1.5 rounded-md transition-all flex items-center gap-1">
                    <LogOut size={14} />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <NavLink to="/login" className={({ isActive }) => isActive ? 'text-primary px-3 py-1.5 rounded-md bg-slate-200/60 dark:bg-slate-800/60 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-all px-3 py-1.5 rounded-md'}>Login</NavLink>
              )}
            </nav>
            <div className="flex items-center gap-2">
              <ThemeSelector />
              <ThemeToggle />
              <button className="md:hidden text-slate-700 dark:text-slate-200" onClick={() => setOpen(v => !v)} aria-label="Menu">
                <Menu size={20} />
              </button>
            </div>
          </div>
          {open && (
            <div className="md:hidden px-6 pb-4 border-t border-slate-200/50 dark:border-slate-700/50">
              <div className="mt-3 flex flex-col gap-1 text-sm">
                <NavLink to="/" onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'text-primary py-2 px-3 rounded-md bg-slate-200/60 dark:bg-slate-800/60 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-200/60 dark:hover:bg-slate-800/60 py-2 px-3 rounded-md transition-all'}>Home</NavLink>
                <NavLink to="/route-planner" onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'text-primary py-2 px-3 rounded-md bg-slate-200/60 dark:bg-slate-800/60 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-200/60 dark:hover:bg-slate-800/60 py-2 px-3 rounded-md transition-all'}>Route Planner</NavLink>
                <NavLink to="/share" onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'text-primary py-2 px-3 rounded-md bg-slate-200/60 dark:bg-slate-800/60 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-200/60 dark:hover:bg-slate-800/60 py-2 px-3 rounded-md transition-all'}>Share Live</NavLink>
                <NavLink to="/dashboard" onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'text-primary py-2 px-3 rounded-md bg-slate-200/60 dark:bg-slate-800/60 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-200/60 dark:hover:bg-slate-800/60 py-2 px-3 rounded-md transition-all'}>Dashboard</NavLink>
                {isAuthenticated ? (
                  <div className="py-2 px-3">
                    <div className="flex items-center gap-2 mb-2">
                      {user?.picture ? (
                        <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full" />
                      ) : (
                        <User size={16} />
                      )}
                      <span className="text-sm">{user?.name}</span>
                    </div>
                    <button onClick={() => { logout(); setOpen(false); }} className="text-slate-600 dark:text-slate-400 hover:text-primary py-2 px-3 rounded-md transition-all flex items-center gap-1 text-sm w-full">
                      <LogOut size={14} />
                      <span>Logout</span>
                    </button>
                  </div>
                ) : (
                  <NavLink to="/login" onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'text-primary py-2 px-3 rounded-md bg-slate-200/60 dark:bg-slate-800/60 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-200/60 dark:hover:bg-slate-800/60 py-2 px-3 rounded-md transition-all'}>Login</NavLink>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


