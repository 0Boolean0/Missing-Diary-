import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import logoGif from '../assets/output-onlinegiftools.gif';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLang();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar">
      {/* Brand — left */}
      <Link to="/" className="brand">
        <div className="brand-logo">
          <img src={logoGif} alt="Missing Diary" className="brand-gif" />
        </div>
      </Link>

      {/* Center nav links */}
      <nav style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px' }}>
        <Link to="/" style={isActive('/') ? { color: 'var(--text)' } : {}}>{t('nav.home')}</Link>
        <Link to="/cases" style={isActive('/cases') ? { color: 'var(--text)' } : {}}>{t('nav.cases')}</Link>
        <Link to="/sightings" style={isActive('/sightings') ? { color: 'var(--text)' } : {}}>{t('nav.sightings')}</Link>
      </nav>

      {/* Right side — auth + language */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
        {user ? (
          <>
            <Link
              to="/dashboard"
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: isActive('/dashboard') ? 'var(--text)' : 'var(--muted)',
                textDecoration: 'none',
              }}
            >
              {t('nav.dashboard')}
            </Link>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{user.name}</span>
            <button className="btn small outline" onClick={logout}>{t('nav.logout')}</button>
          </>
        ) : (
          <Link className="btn small" to="/login" style={{ background: 'var(--green)' }}>
            {t('nav.login')}
          </Link>
        )}

        {/* Language toggle */}
        <button
          className="btn small outline"
          onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
          style={{ minWidth: 48 }}
          aria-label="Toggle language"
        >
          {lang === 'en' ? 'বাং' : 'EN'}
        </button>
      </div>
    </header>
  );
}
