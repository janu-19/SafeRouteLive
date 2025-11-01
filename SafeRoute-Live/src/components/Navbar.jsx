import { Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import ThemeToggle from './ThemeToggle.jsx';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="glass mt-3 rounded-2xl">
          <div className="flex h-12 items-center justify-between px-4">
            <Link to="/" className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-violet-400 to-indigo-400 tracking-tight">
              SafeRoute Live
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm text-slate-200">
              <NavLink to="/" className={({ isActive }) => isActive ? 'text-white' : 'hover:text-white'}>Home</NavLink>
              <NavLink to="/route-planner" className={({ isActive }) => isActive ? 'text-white' : 'hover:text-white'}>Route Planner</NavLink>
              <NavLink to="/share" className={({ isActive }) => isActive ? 'text-white' : 'hover:text-white'}>Share Live</NavLink>
              <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'text-white' : 'hover:text-white'}>Dashboard</NavLink>
              <NavLink to="/login" className={({ isActive }) => isActive ? 'text-white' : 'hover:text-white'}>Login</NavLink>
              <ThemeToggle />
            </div>
            <button className="md:hidden" onClick={() => setOpen(v => !v)} aria-label="Menu">
              <Menu size={20} />
            </button>
          </div>
          {open && (
            <div className="md:hidden px-4 pb-3">
              <div className="mt-2 flex flex-col gap-2 text-sm">
                <NavLink to="/" onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'text-white' : 'hover:text-white'}>Home</NavLink>
                <NavLink to="/route-planner" onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'text-white' : 'hover:text-white'}>Route Planner</NavLink>
                <NavLink to="/share" onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'text-white' : 'hover:text-white'}>Share Live</NavLink>
                <NavLink to="/dashboard" onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'text-white' : 'hover:text-white'}>Dashboard</NavLink>
                <NavLink to="/login" onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'text-white' : 'hover:text-white'}>Login</NavLink>
                <div className="pt-2"><ThemeToggle /></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


