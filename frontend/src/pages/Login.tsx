import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, register } = useAuth();

  // Google Sign-In placeholder - backend integration required

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ email, username, password, displayName });
      }
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const handleGuestLogin = async () => {
    setError("");
    setLoading(true);

    try {
      // Create guest user
      const guestUsername = `guest_${Date.now()}`;
      const guestEmail = `${guestUsername}@guest.local`;
      const guestPassword = Math.random().toString(36).slice(-12);

      await register({
        email: guestEmail,
        username: guestUsername,
        password: guestPassword,
        displayName: 'Guest User',
      });
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create guest account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl w-full max-w-md border border-neutral-200 shadow-sm">
        <h1 className="text-3xl font-bold mb-2 text-center">
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h1>
        <p className="text-center text-neutral-500 text-sm mb-6">
          {mode === 'login' ? 'Welcome back to our video platform' : 'Join our video platform'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <input
                className="w-full px-4 py-3 rounded-xl bg-white border border-neutral-200 focus:outline-none focus:border-red-600"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <input
                className="w-full px-4 py-3 rounded-xl bg-white border border-neutral-200 focus:outline-none focus:border-red-600"
                placeholder="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </>
          )}

          <input
            type="email"
            className="w-full px-4 py-3 rounded-xl bg-white border border-neutral-200 focus:outline-none focus:border-red-600"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="w-full px-4 py-3 rounded-xl bg-white border border-neutral-200 focus:outline-none focus:border-red-600"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Sign Up'}
          </button>
        </form>

        {/* Divider */}
        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-neutral-200"></div>
          <span className="text-xs text-neutral-500 uppercase">Or</span>
          <div className="flex-1 h-px bg-neutral-200"></div>
        </div>

        {/* Google Sign-In */}
        <button
          onClick={() => window.location.href = '/api/auth/google'}
          className="w-full mt-4 py-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 font-semibold transition flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#1f2937" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#1f2937" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#1f2937" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#1f2937" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        {/* Guest Login */}
        <button
          onClick={handleGuestLogin}
          disabled={loading}
          className="w-full mt-3 py-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 font-semibold transition disabled:opacity-50"
        >
          Continue as Guest
        </button>

        {/* Toggle Mode */}
        <div className="mt-6 text-center text-sm text-neutral-500">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => setMode('register')}
                className="text-red-500 hover:underline font-semibold"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-red-500 hover:underline font-semibold"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
