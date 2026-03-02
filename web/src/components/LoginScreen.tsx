import React, { useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { registerUser, loginUser, loginWithGoogle, setAuthToken } from '../api/auth';

interface Props {
  onAuthenticated: (token: string, email: string) => void;
}

type Mode = 'login' | 'register';

const LoginScreen: React.FC<Props> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fn = mode === 'login' ? loginUser : registerUser;
      const res = await fn({ email, password });
      setAuthToken(res.access_token);
      onAuthenticated(res.access_token, email);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Authentication failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) return;
    setError('');
    setLoading(true);
    try {
      const res = await loginWithGoogle({ tokenId: credentialResponse.credential });
      setAuthToken(res.access_token);
      // Extract email from JWT payload (base64 middle segment)
      const payloadB64 = res.access_token.split('.')[1];
      const payload = JSON.parse(atob(payloadB64));
      onAuthenticated(res.access_token, payload.email || '');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Google sign-in failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">🎬</div>
        <h1 className="login-title">Media Compressor</h1>
        <p className="login-subtitle">Compress video, image &amp; audio for any platform — free.</p>

        <div className="login-tabs">
          <button
            className={`login-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            Sign In
          </button>
          <button
            className={`login-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
          >
            Register
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
          />
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="btn-primary login-submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="login-divider"><span>or</span></div>

        <div className="google-btn-wrapper">
          <GoogleLogin
            onSuccess={handleGoogle}
            onError={() => setError('Google sign-in failed.')}
            useOneTap={false}
            theme="outline"
            size="large"
            width="100%"
          />
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
