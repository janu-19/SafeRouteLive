import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  
  const { login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (isSignup) {
        if (!firstName || !email || !password) {
          setError('First name, email, and password are required');
          setLoading(false);
          return;
        }
        if (!agreeToTerms) {
          setError('Please agree to the Terms & Conditions');
          setLoading(false);
          return;
        }
        const fullName = `${firstName} ${lastName}`.trim();
        result = await register(fullName, email, password, phone);
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
    <div className="min-h-screen flex bg-slate-900">
      {/* Left Side - Static Background */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="w-full h-full bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex flex-col items-center justify-center p-12 relative">
          {/* Logo */}
          <div className="absolute top-8 left-8">
            <div className="text-white text-3xl font-bold tracking-wider">SafeRoute</div>
          </div>

          {/* Back to website button */}
          <Link
            to="/"
            className="absolute top-8 right-8 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all border border-white/20"
          >
            <span className="text-sm">Back to website</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Content */}
          <div className="text-center text-white">
            <h1 className="text-5xl font-bold mb-4">Navigate Safely,</h1>
            <h2 className="text-5xl font-bold">Arrive Confidently</h2>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-900">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-white mb-2">
              {isSignup ? 'Create an account' : 'Welcome Back'}
            </h2>
            <p className="text-slate-400">
              {isSignup ? (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => setIsSignup(false)}
                    className="text-purple-400 hover:text-purple-300 underline"
                  >
                    Log in
                  </button>
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <button
                    onClick={() => setIsSignup(true)}
                    className="text-purple-400 hover:text-purple-300 underline"
                  >
                    Sign up
                  </button>
                </>
              )}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-lg bg-slate-800/50 border border-slate-700 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-slate-500"
                    placeholder="First name"
                    required
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-lg bg-slate-800/50 border border-slate-700 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-slate-500"
                    placeholder="Last name"
                  />
                </div>
              </div>
            )}

            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-slate-800/50 border border-slate-700 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-slate-500"
                placeholder="Email"
                required
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-slate-800/50 border border-slate-700 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-slate-500"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {isSignup && (
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-800/50 text-purple-500 focus:ring-2 focus:ring-purple-500"
                />
                <label htmlFor="terms" className="text-sm text-slate-400">
                  I agree to the{' '}
                  <a href="#" className="text-purple-400 hover:text-purple-300 underline">
                    Terms & Conditions
                  </a>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 py-3 hover:from-purple-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all text-white"
            >
              {loading ? 'Please wait...' : isSignup ? 'Create account' : 'Log in'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-900 text-slate-500">Or register with</span>
              </div>
            </div>

            <button
              onClick={loginWithGoogle}
              className="mt-6 w-full rounded-lg bg-slate-800/50 border border-slate-700 px-4 py-3 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 text-white"
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
            <Link to="/" className="text-sm text-slate-500 hover:text-slate-400">
              Continue without account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
