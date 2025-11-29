import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onLogin: (token: string, user: { id: number; username: string; email: string; name: string; role: string }) => void;
}

function Login({ onLogin }: LoginProps) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLogin(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-700 animate-mesh-gradient" />
      
      {/* Secondary gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-purple-900/30" />

      {/* Animated floating orbs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-purple-500/40 to-pink-500/30 rounded-full blur-3xl animate-float-orb-1" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/30 to-purple-600/40 rounded-full blur-3xl animate-float-orb-2" />
      <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-gradient-to-br from-pink-400/25 to-rose-500/30 rounded-full blur-3xl animate-float-orb-3" />
      <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-gradient-to-br from-blue-500/20 to-indigo-600/25 rounded-full blur-3xl animate-float-orb-1-delayed" />
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-violet-400/30 to-fuchsia-500/20 rounded-full blur-3xl animate-float-orb-2-delayed" />

      {/* Centered login form with glassmorphism */}
      <div className="relative z-10 w-full max-w-md p-4">
        <div className="glass-card rounded-3xl shadow-2xl p-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-light text-white tracking-wide">
              Willkommen zurück
            </h2>
            <p className="text-white/60 mt-3 text-sm tracking-wider uppercase">
              Melden Sie sich in Ihrem Konto an
            </p>
          </div>
          
          {error && (
            <div className="glass-error text-red-200 px-4 py-3 rounded-xl mb-6 flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-white/80 mb-2 tracking-wide">
                Benutzername
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-white/50 group-focus-within:text-purple-300 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="glass-input w-full pl-12 pr-4 py-4 rounded-xl text-white focus:outline-none"
                  placeholder="Ihr Benutzername"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-2 tracking-wide">
                Passwort
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-white/50 group-focus-within:text-purple-300 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input w-full pl-12 pr-4 py-4 rounded-xl text-white focus:outline-none"
                  placeholder="Ihr Passwort"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="premium-button w-full text-white py-4 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed font-medium text-base shadow-lg mt-8"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Anmeldung läuft...
                </span>
              ) : (
                'Anmelden'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-white/50 text-sm mt-8 tracking-wider">
          © 2024 DispoTool. Alle Rechte vorbehalten.
        </p>
      </div>
    </div>
  );
}

export default Login;
