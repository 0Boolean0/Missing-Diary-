import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'local' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const nav = useNavigate();

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })); }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      nav('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const roles = [
    { value: 'local', label: '🏘️ Local Member', desc: 'Help find missing persons nearby' },
    { value: 'guardian', label: '👨‍👩‍👧 Guardian / Family', desc: 'Report a missing family member' },
  ];

  return (
    <div className="auth-page">
      {/* Left Panel */}
      <div className="auth-left">
        <div className="auth-left-inner">
          <Link to="/" className="auth-logo">🛡️ Missing Diary</Link>
          <div className="auth-left-body">
            <h2>Join the Mission.</h2>
            <p>Join our network and help reunite missing persons with their families.</p>
            <div className="auth-left-stats">
              <div className="auth-left-stat">
                <span>📋</span>
                <div>
                  <b>File Reports</b>
                  <p>Submit missing person cases instantly</p>
                </div>
              </div>
              <div className="auth-left-stat">
                <span>📍</span>
                <div>
                  <b>Track Cases</b>
                  <p>Follow updates on your dashboard</p>
                </div>
              </div>
              <div className="auth-left-stat">
                <span>🔔</span>
                <div>
                  <b>Get Alerts</b>
                  <p>Receive notifications on new cases</p>
                </div>
              </div>
            </div>
          </div>
          <p className="auth-left-footer">© 2026 Missing Diary. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="auth-right">
        <div className="auth-form-card auth-form-card-wide">
          <div className="auth-form-header">
            <div className="auth-form-icon">🛡️</div>
            <h1>Create Account</h1>
            <p>Join Missing Diary — it's free</p>
          </div>

          {error && (
            <div className="auth-error-box">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={submit} className="auth-form">
            <div className="auth-form-row">
              <div className="auth-field">
                <label>Full Name</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon"></span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={set('name')}
                    placeholder="Your Name"
                    required
                  />
                </div>
              </div>
              <div className="auth-field">
                <label>Phone Number</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">📞</span>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={set('phone')}
                    placeholder="+880 1XXX-XXXXXX"
                  />
                </div>
              </div>
            </div>

            <div className="auth-field">
              <label>Email Address</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"></span>
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="Enter Your Mail"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field">
              <label>Password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"></span>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Create a strong password"
                  required
                  autoComplete="new-password"
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

            <div className="auth-field">
              <label>I am joining as</label>
              <div className="auth-role-grid">
                {roles.map(r => (
                  <label
                    key={r.value}
                    className={`auth-role-option ${form.role === r.value ? 'active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={form.role === r.value}
                      onChange={set('role')}
                    />
                    <div>
                      <b>{r.label}</b>
                      <p>{r.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button className="auth-submit-btn" disabled={loading}>
              {loading ? <span className="auth-spinner" /> : null}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
