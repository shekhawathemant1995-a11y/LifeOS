import React, { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function SignUp({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      onNavigate('/');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onNavigate('/');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md bg-surface-container-low p-8 rounded-3xl shadow-card">
        <h2 className="text-3xl font-headline font-bold text-on-surface mb-6 text-center">Sign Up</h2>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full mb-6 py-4 bg-surface-container-high text-on-surface rounded-xl font-bold text-lg flex items-center justify-center gap-3 border border-outline-variant/10 hover:bg-surface-container-highest transition-colors disabled:opacity-50"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign up with Google
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-outline-variant/20"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-surface-container-low px-2 text-on-surface-variant font-bold tracking-widest">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 bg-surface-container-high border-none rounded-xl p-4 text-on-surface focus:ring-2 ring-primary"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 bg-surface-container-high border-none rounded-xl p-4 text-on-surface focus:ring-2 ring-primary"
              required
            />
          </div>
          {error && <p className="text-error text-sm font-medium text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-on-primary rounded-xl font-bold text-lg shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {loading ? 'Signing Up...' : 'Sign Up'}
          </button>
        </form>
        <p className="mt-6 text-center text-on-surface-variant text-sm">
          Already have an account?{' '}
          <button onClick={() => onNavigate('/signin')} className="text-primary font-bold">Sign In</button>
        </p>
      </div>
    </div>
  );
}
