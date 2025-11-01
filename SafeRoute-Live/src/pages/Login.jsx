import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function Login() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const u = { firstName, lastName, email };
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  }

  function logout() {
    localStorage.removeItem('user');
    setUser(null);
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full glass rounded-3xl p-8">
          <div className="text-2xl font-bold mb-6">Profile</div>
          <div className="space-y-3">
            <div className="text-sm opacity-90">
              <span className="font-semibold">Name:</span> {user.firstName} {user.lastName}
            </div>
            <div className="text-sm opacity-90">
              <span className="font-semibold">Email:</span> {user.email}
            </div>
          </div>
          <button 
            className="mt-6 w-full rounded-xl btn-danger py-3 text-white font-semibold hover:brightness-110 transition-all" 
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl bg-slate-800/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
        
        {/* Left Side - Image/Branding */}
        <div className="md:w-1/2 bg-gradient-to-br from-primary to-secondary p-12 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          
          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors">
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Back to website</span>
            </Link>
          </div>

          <div className="relative z-10 text-white flex-1 flex flex-col justify-center items-center text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              SafeRoute Live
            </h1>
            <p className="text-base md:text-lg font-light opacity-90">
              Travel Smart, Travel Safe
            </p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="md:w-1/2 p-8 md:p-12 bg-slate-700/30 dark:bg-slate-800/30">
          <div className="max-w-md mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
              {isSignUp ? 'Create an account' : 'Welcome back'}
            </h2>
            <p className="text-slate-300 text-sm mb-8">
              {isSignUp ? (
                <>
                  Already have an account?{' '}
                  <button 
                    onClick={() => setIsSignUp(false)} 
                    className="text-primary hover:underline font-medium"
                  >
                    Log in
                  </button>
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <button 
                    onClick={() => setIsSignUp(true)} 
                    className="text-primary hover:underline font-medium"
                  >
                    Sign up
                  </button>
                </>
              )}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-600/30 border border-slate-500/50 text-white placeholder-slate-400 outline-none focus:border-primary transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-600/30 border border-slate-500/50 text-white placeholder-slate-400 outline-none focus:border-primary transition-colors"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <input
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-600/30 border border-slate-500/50 text-white placeholder-slate-400 outline-none focus:border-primary transition-colors"
                  required
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-600/30 border border-slate-500/50 text-white placeholder-slate-400 outline-none focus:border-primary transition-colors pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {isSignUp && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-500 bg-slate-600/30 text-primary focus:ring-primary"
                    required
                  />
                  <label htmlFor="terms" className="text-sm text-slate-300">
                    I agree to the{' '}
                    <a href="#" className="text-primary hover:underline">
                      Terms & Conditions
                    </a>
                  </label>
                </div>
              )}

              <button
                type="submit"
                className="w-full btn-primary py-3 rounded-xl text-white font-semibold hover:brightness-110 transition-all shadow-lg"
              >
                {isSignUp ? 'Create account' : 'Log in'}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-slate-700/30 text-slate-400">Or register with</span>
                </div>
              </div>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-600/30 border border-slate-500/50 text-white hover:bg-slate-600/50 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}


