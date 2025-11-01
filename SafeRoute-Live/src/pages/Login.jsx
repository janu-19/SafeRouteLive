import { useEffect, useState } from 'react';

export default function Login() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  function login(e) {
    e.preventDefault();
    const u = { name, email };
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  }

  function logout() {
    localStorage.removeItem('user');
    setUser(null);
  }

  if (user) {
    return (
      <div className="p-6 max-w-md mx-auto glass rounded-2xl">
        <div className="text-lg font-semibold">Profile</div>
        <div className="mt-2 text-sm opacity-90">Name: {user.name}</div>
        <div className="text-sm opacity-90">Email: {user.email}</div>
        <button className="mt-4 w-full rounded-lg bg-rose-600 py-2 hover:bg-rose-500" onClick={logout}>Logout</button>
      </div>
    );
  }

  return (
    <form className="p-6 max-w-md mx-auto glass rounded-2xl" onSubmit={login}>
      <div className="text-lg font-semibold">Login</div>
      <div className="mt-3">
        <label className="text-xs opacity-80">Name</label>
        <input className="mt-1 w-full rounded-lg bg-transparent border border-white/20 px-3 py-2 outline-none" value={name} onChange={(e)=>setName(e.target.value)} />
      </div>
      <div className="mt-3">
        <label className="text-xs opacity-80">Email</label>
        <input type="email" className="mt-1 w-full rounded-lg bg-transparent border border-white/20 px-3 py-2 outline-none" value={email} onChange={(e)=>setEmail(e.target.value)} />
      </div>
      <button className="mt-4 w-full rounded-lg bg-blue-600 py-2 hover:bg-blue-500">Login</button>
    </form>
  );
}


