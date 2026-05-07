import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import logoGif from '../assets/output-onlinegiftools.gif';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'guardian' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { t } = useLang();
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
    { value: 'guardian', label: '👨‍👩‍👧 Guardian / Family', desc: 'Report a missing family member and track updates' },
  ];

  return (
    <div className="auth-page">
      {/* Left Panel */}
      <div className="auth-left">
        <div className="auth-left-inner">
          <Link to="/" className="auth-logo">
            <img src={logoGif} alt="Missing Diary" className="auth-logo-img" />
          </Link>
          <div className="auth-left-body">
            <h2>Join the Mission.</h2>
            <p>Join our network and help reunite missing persons with their families.</p>
            <div className="auth-left-stats">
              <div className="auth-left-stat">
                <span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></span>
                <div>
                  <b>File Reports</b>
                  <p>Submit missing person cases instantly</p>
                </div>
              </div>
              <div className="auth-left-stat">
                <span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg></span>
                <div>
                  <b>Track Cases</b>
                  <p>Follow updates on your dashboard</p>
                </div>
              </div>
              <div className="auth-left-stat">
                <span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></span>
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
            <div className="auth-form-icon"></div>
            <h1>{t('register.title')}</h1>
            <p>{t('register.sub')}</p>
          </div>

          {error && (
            <div className="auth-error-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:'middle',marginRight:6}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={submit} className="auth-form">
            <div className="auth-form-row">
              <div className="auth-field">
                <label>{t('register.name')}</label>
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
                <label>{t('register.phone')}</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.22 1.18 2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.29 6.29l1.28-1.28a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                  </span>
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
              <label>{t('register.email')}</label>
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
              <label>{t('register.password')}</label>
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
                  {showPass
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label>{t('register.role')}</label>
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

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? <span className="auth-spinner" /> : null}
              {loading ? t('register.creating') : t('register.submit')}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <p className="auth-switch">
            {t('register.have_account')} <Link to="/login">{t('register.sign_in')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
