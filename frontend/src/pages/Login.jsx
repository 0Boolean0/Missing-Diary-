import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
            <span className="brand-logo">
              <svg width="30" height="30" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="34" height="34" rx="9" fill="#e11d2e"/>
                <path d="M7 10.5C7 10.5 11 9 17 9C23 9 27 10.5 27 10.5V25.5C27 25.5 23 24 17 24C11 24 7 25.5 7 25.5V10.5Z" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                <line x1="17" y1="9" x2="17" y2="24" stroke="white" strokeWidth="1.5"/>
                <circle cx="24" cy="11" r="4" fill="#fbbf24" stroke="#e11d2e" strokeWidth="1.5"/>
                <text x="24" y="14.5" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#1e3a5f">!</text>
              </svg>
              <span className="brand-text">
                <span className="brand-main" style={{color:'#fff'}}>Missing</span>
                <span className="brand-sub">Diary</span>
              </span>
            </span>
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

          <div className="auth-hint">
            <p>Test accounts: <code>admin@missingdiary.test</code> / <code>password123</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
