import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const { login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (isSignup) {
        if (!name || !email || !password) {
          setError('Name, email, and password are required');
          setLoading(false);
          return;
        }
        result = await register(name, email, password, phone);
      } else {
        if (!email || !password) {
          setError('Email and password are required');
          setLoading(false);
          return;
        }
        result = await login(email, password);
      }

      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-[var(--color-bg-light)] to-slate-200 text-slate-900 dark:from-slate-900 dark:via-[var(--color-bg-dark)] dark:to-black dark:text-slate-100 p-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full border border-slate-200/50 dark:border-slate-700/50">
        <h2 className="text-3xl font-bold text-center mb-6 text-slate-900 dark:text-slate-100">
          {isSignup ? 'Create Account' : 'Welcome Back'}
        </h2>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              placeholder="your@email.com"
              required
            />
          </div>

          {isSignup && (
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Phone (optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                placeholder="+91 1234567890"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] py-2.5 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all text-white"
          >
            {loading ? 'Please wait...' : isSignup ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300 dark:border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-transparent text-slate-600 dark:text-slate-400">Or continue with</span>
            </div>
          </div>

          <button
            onClick={loginWithGoogle}
            className="mt-4 w-full rounded-lg bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all flex items-center justify-center gap-2 text-slate-900 dark:text-slate-100"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Google</span>
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignup(!isSignup)}
            className="text-sm text-[var(--color-primary)] hover:opacity-80"
          >
            {isSignup ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-sm text-slate-600 dark:text-slate-400 hover:text-[var(--color-primary)]">
            Continue without account
          </Link>
        </div>
      </div>
    </div>
  );
}
