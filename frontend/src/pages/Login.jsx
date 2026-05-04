import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoGif from '../assets/output-onlinegiftools.gif';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/dashboard';

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      nav(redirect);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {/* Left Panel */}
      <div className="auth-left">
        <div className="auth-left-inner">
          <Link to="/" className="auth-logo">
            <img src={logoGif} alt="Missing Diary" className="auth-logo-img" />
          </Link>
          <div className="auth-left-body">
            <h2>Every Second Counts.</h2>
            <p>Join Bangladesh's unified missing persons alert platform. Help reunite families and protect lives.</p>
            <div className="auth-left-stats">
              <div className="auth-left-stat">
                <span>🚨</span>
                <div>
                  <b>Instant Alerts</b>
                  <p>Reports go live immediately</p>
                </div>
              </div>
              <div className="auth-left-stat">
                <span>🔒</span>
                <div>
                  <b>Secure & Private</b>
                  <p>Your data is always protected</p>
                </div>
              </div>
              <div className="auth-left-stat">
                <span>🤝</span>
                <div>
                  <b>Community Driven</b>
                  <p>Thousands helping together</p>
                </div>
              </div>
            </div>
          </div>
          <p className="auth-left-footer">© 2026 Missing Diary. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="auth-right">
        <div className="auth-form-card">
          <div className="auth-form-header">
            <div className="auth-form-icon">👋</div>
            <h1>Welcome back</h1>
            <p>Sign in to your Missing Diary account</p>
          </div>

          {redirect !== '/dashboard' && (
            <div className="auth-redirect-notice">
              🔒 Login required to access <strong>{redirect}</strong>
            </div>
          )}

          {error && (
            <div className="auth-error-box">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={submit} className="auth-form">
            <div className="auth-field">
              <label>Email Address</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">✉️</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field">
              <label>Password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">🔑</span>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-pass-toggle"
                  onClick={() => setShowPass(s => !s)}
                  tabIndex={-1}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button className="auth-submit-btn" disabled={loading}>
              {loading ? <span className="auth-spinner" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Create one free →</Link>
          </p>

          {/* Fix #20: test credentials only shown in development builds */}
          {import.meta.env.DEV && (
            <div className="auth-hint">
              <p>Test accounts: <code>admin@missingdiary.test</code> / <code>password123</code></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
