import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import Logo from './Logo';

const Auth: React.FC = () => {
  const [loading, setLoading] = useState<'signin' | 'signup' | 'forgot' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading('signin');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
    }
    setLoading(null);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading('signup');

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Check your email for the confirmation link!');
    }
    setLoading(null);
  };
  
  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address to reset your password.");
      return;
    }
    setError(null);
    setMessage(null);
    setLoading('forgot');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Check your email for password reset instructions.');
    }
    setLoading(null);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-paper dark:bg-paper-dark animate-fade-in">
        <div className="w-full max-w-sm p-8 space-y-6 bg-white dark:bg-charcoal-dark rounded-xl shadow-soft border border-chrome/50 dark:border-border-dark">
            <div className='flex justify-center'>
                <Logo />
            </div>
            <h2 className="text-2xl font-bold text-center text-charcoal dark:text-text-dark font-sans">Welcome to Nota</h2>
            <p className="text-center text-sm text-charcoal/70 dark:text-text-dark/70">
                Sign in or create an account to sync your notes across all devices.
            </p>
            <form className="space-y-4" onSubmit={handleLogin}>
                <div>
                    <label htmlFor="email" className="sr-only">Email</label>
                    <input
                        id="email"
                        className="w-full px-4 py-2 text-charcoal dark:text-text-dark bg-paper dark:bg-paper-dark border border-chrome dark:border-border-dark rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                        type="email"
                        placeholder="Your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                    />
                </div>
                 <div>
                    <label htmlFor="password" className="sr-only">Password</label>
                    <input
                        id="password"
                        className="w-full px-4 py-2 text-charcoal dark:text-text-dark bg-paper dark:bg-paper-dark border border-chrome dark:border-border-dark rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                        type="password"
                        placeholder="Your password"
                        value={password}
                        // FIX: Corrected typo from 'e.g.value' to 'e.target.value' to get the input value.
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                    />
                </div>
                 <div className="text-right -mt-2">
                    <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-xs font-medium text-accent hover:underline focus:outline-none focus:ring-1 focus:ring-accent rounded disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                        disabled={!!loading || !email}
                        aria-label="Forgot password?"
                    >
                        {loading === 'forgot' ? 'Sending...' : 'Forgot password?'}
                    </button>
                </div>
                <div className="flex flex-col space-y-2 pt-2">
                     <button
                        type="submit"
                        className="w-full px-4 py-2 font-semibold text-white bg-accent rounded-md hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50"
                        disabled={!!loading || !email || password.length < 6}
                    >
                        {loading === 'signin' ? 'Signing in...' : 'Sign In'}
                    </button>
                     <button
                        onClick={handleSignup}
                        type="button"
                        className="w-full px-4 py-2 font-semibold text-accent bg-accent/10 dark:bg-accent/20 rounded-md hover:bg-accent/20 dark:hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50"
                        disabled={!!loading || !email || password.length < 6}
                    >
                        {loading === 'signup' ? 'Signing up...' : 'Sign Up'}
                    </button>
                </div>
            </form>
            
            {error && <p className="text-center text-sm text-coral">{error}</p>}
            {message && <p className="text-center text-sm text-green-600">{message}</p>}
        </div>
    </div>
  );
};

export default Auth;