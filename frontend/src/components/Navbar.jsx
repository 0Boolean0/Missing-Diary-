import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import logoGif from '../assets/output-onlinegiftools.gif';
import { getAll as getOfflineQueue } from '../utils/offlineQueue';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLang();
  const [reportOpen, setReportOpen] = useState(false);
<<<<<<< Updated upstream
  const [queueCount, setQueueCount] = useState(getOfflineQueue().length);
=======
  const [mobileOpen, setMobileOpen] = useState(false);
>>>>>>> Stashed changes
  const dropRef = useRef(null);
  const nav = useNavigate();
  const location = useLocation();

  const isAdmin = user?.role === 'admin' || user?.role === 'police';

  useEffect(() => {
    function handler(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setReportOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

<<<<<<< Updated upstream
  // 14.5: Keep queue count in sync
  useEffect(() => {
    function handleQueueUpdate() {
      setQueueCount(getOfflineQueue().length);
    }
    window.addEventListener('offlineQueueUpdated', handleQueueUpdate);
    // Also update on storage changes from other tabs
    window.addEventListener('storage', handleQueueUpdate);
    return () => {
      window.removeEventListener('offlineQueueUpdated', handleQueueUpdate);
      window.removeEventListener('storage', handleQueueUpdate);
    };
=======
  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
>>>>>>> Stashed changes
  }, []);

  function handleReportClick(path) {
    setReportOpen(false);
<<<<<<< Updated upstream
    nav(user ? path : `/login?redirect=${encodeURIComponent(path)}`);
=======
    setMobileOpen(false);
    if (user) {
      nav(path);
    } else {
      nav(`/login?redirect=${encodeURIComponent(path)}`);
    }
>>>>>>> Stashed changes
  }

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar">
      {/* Brand */}
      <Link to="/" className="brand">
<<<<<<< Updated upstream
        <div className="brand-logo">
          <img src={logoGif} alt="Missing Diary" className="brand-gif" />
          <div className="brand-text">
            <span className="brand-main">Missing Diary</span>
            <span className="brand-sub">Alert System</span>
          </div>
=======
        <img src={logoGif} alt="Missing Diary" className="brand-gif" />
      </Link>

      {/* Desktop nav */}
      <nav>
        <Link to="/">Home</Link>
        <Link to="/cases">Missing Cases</Link>
        <Link to="/sightings">Sightings</Link>

        {/* Report Dropdown */}
        <div className="nav-dropdown" ref={dropRef}>
          <button className="btn small danger" onClick={() => setReportOpen(o => !o)}>
            Report ▾
          </button>
          {reportOpen && (
            <div className="nav-dropdown-menu">
              <div className="nav-dropdown-item" onClick={() => handleReportClick('/report')}>
                <span>🚨</span>
                <div>
                  <b>Report Missing Person</b>
                  <p>Submit a new missing person case</p>
                </div>
                {!user && <span className="nav-lock">🔒</span>}
              </div>
              <div className="nav-dropdown-item" onClick={() => handleReportClick('/sighting')}>
                <span>👁️</span>
                <div>
                  <b>Submit a Sighting</b>
                  <p>I saw someone who may be missing</p>
                </div>
                {!user && <span className="nav-lock">🔒</span>}
              </div>
              {!user && (
                <div className="nav-dropdown-footer">
                  <Link to="/login" onClick={() => setReportOpen(false)}>Login to submit a report →</Link>
                </div>
              )}
            </div>
          )}
>>>>>>> Stashed changes
        </div>
      </Link>

<<<<<<< Updated upstream
      <nav>
        <Link to="/" style={isActive('/') ? { color: 'var(--text)' } : {}}>{t('nav.home')}</Link>
        {!isAdmin && (
          <Link to="/cases" style={isActive('/cases') ? { color: 'var(--text)' } : {}}>{t('nav.cases')}</Link>
        )}
        {!isAdmin && (
          <Link to="/sightings" style={isActive('/sightings') ? { color: 'var(--text)' } : {}}>{t('nav.sightings')}</Link>
        )}

        {/* Report Dropdown — hidden for admin/police */}
        {!isAdmin && (
          <div className="nav-dropdown" ref={dropRef}>
            <button
              className="btn small danger"
              onClick={() => setReportOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span>⚠</span> {t('nav.report')} ▾
            </button>
            {reportOpen && (
              <div className="nav-dropdown-menu">
                <div className="nav-dropdown-item" onClick={() => handleReportClick('/report')}>
                  <span>🚨</span>
                  <div>
                    <b>{t('nav.report_missing')}</b>
                    <p>Submit a new missing person case</p>
                  </div>
                  {!user && <span className="nav-lock">🔒</span>}
                </div>
                <div className="nav-dropdown-item" onClick={() => handleReportClick('/sighting')}>
                  <span>👁️</span>
                  <div>
                    <b>{t('nav.submit_sighting')}</b>
                    <p>I saw someone who may be missing</p>
                  </div>
                  {!user && <span className="nav-lock">🔒</span>}
                </div>
                {!user && (
                  <div className="nav-dropdown-footer">
                    <Link to="/login" onClick={() => setReportOpen(false)}>{t('nav.login_to_submit')}</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {user ? (
          <>
            <Link to="/dashboard" style={isActive('/dashboard') ? { color: 'var(--text)' } : {}}>
              {t('nav.dashboard')}
            </Link>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{user.name}</span>
            <button className="btn small outline" onClick={logout}>{t('nav.logout')}</button>
          </>
        ) : (
          <Link
            className="btn small"
            to="/login"
            style={{ background: 'var(--green)', marginLeft: 4 }}
          >
            {t('nav.login')}
          </Link>
        )}

        {/* Language toggle */}
        <button
          className="btn small outline"
          onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
          style={{ marginLeft: 4, minWidth: 48 }}
          aria-label="Toggle language"
        >
          {lang === 'en' ? 'বাং' : 'EN'}
        </button>

        {/* 14.5: Offline queue badge */}
        {queueCount > 0 && (
          <span
            title={`${queueCount} report${queueCount !== 1 ? 's' : ''} pending submission`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: '#f59e0b',
              color: '#fff',
              borderRadius: 20,
              padding: '3px 10px',
              fontSize: 12,
              fontWeight: 700,
              marginLeft: 4,
              cursor: 'default',
            }}
          >
            📋 {queueCount}
          </span>
        )}
=======
        {/* Language toggle placeholder — will be wired in Phase 5 */}
        <button className="lang-toggle" type="button" title="Switch language (coming soon)">
          EN | বাংলা
        </button>

        {user
          ? <><Link to="/dashboard">Dashboard</Link><button className="ghost" onClick={logout}>Logout</button></>
          : <Link className="btn small" to="/login">Login</Link>
        }
>>>>>>> Stashed changes
      </nav>

      {/* Mobile hamburger */}
      <button
        className="navbar-hamburger"
        aria-label="Toggle menu"
        onClick={() => setMobileOpen(o => !o)}
      >
        {mobileOpen ? '✕' : '☰'}
      </button>

      {/* Mobile menu */}
      <div className={`navbar-mobile-menu${mobileOpen ? ' open' : ''}`}>
        <Link to="/" onClick={() => setMobileOpen(false)}>Home</Link>
        <Link to="/cases" onClick={() => setMobileOpen(false)}>Missing Cases</Link>
        <Link to="/sightings" onClick={() => setMobileOpen(false)}>Sightings</Link>
        <button onClick={() => handleReportClick('/report')}>🚨 Report Missing Person</button>
        <button onClick={() => handleReportClick('/sighting')}>👁️ Submit a Sighting</button>
        <button className="lang-toggle" type="button" style={{ textAlign: 'left', background: 'none', border: 'none', color: 'rgba(255,255,255,.85)', padding: '10px 0', fontSize: 15, fontWeight: 600, cursor: 'default' }}>
          EN | বাংলা
        </button>
        {user
          ? <>
              <Link to="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              <button onClick={() => { logout(); setMobileOpen(false); }}>Logout</button>
            </>
          : <Link to="/login" onClick={() => setMobileOpen(false)}>Login</Link>
        }
      </div>
    </header>
  );
}
