import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoGif from '../assets/output-onlinegiftools.gif';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const dropRef = useRef(null);
  const nav = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function handler(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setReportOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleReportClick(path) {
    setReportOpen(false);
    nav(user ? path : `/login?redirect=${encodeURIComponent(path)}`);
  }

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar">
      {/* Brand */}
      <Link to="/" className="brand">
        <div className="brand-logo">
          <img src={logoGif} alt="Missing Diary" className="brand-gif" />
          <div className="brand-text">
            <span className="brand-main">Missing Diary</span>
            <span className="brand-sub">Alert System</span>
          </div>
        </div>
      </Link>

      <nav>
        <Link to="/" style={isActive('/') ? { color: 'var(--text)' } : {}}>Home</Link>
        <Link to="/cases" style={isActive('/cases') ? { color: 'var(--text)' } : {}}>Missing Cases</Link>
        <Link to="/sightings" style={isActive('/sightings') ? { color: 'var(--text)' } : {}}>Sightings</Link>

        {/* Report Dropdown */}
        <div className="nav-dropdown" ref={dropRef}>
          <button
            className="btn small danger"
            onClick={() => setReportOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>⚠</span> Report ▾
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
        </div>

        {user ? (
          <>
            <Link to="/dashboard" style={isActive('/dashboard') ? { color: 'var(--text)' } : {}}>
              Dashboard
            </Link>
            <button
              className="btn small outline"
              onClick={logout}
              style={{ marginLeft: 4 }}
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            className="btn small"
            to="/login"
            style={{ background: 'var(--green)', marginLeft: 4 }}
          >
            Login
          </Link>
        )}
      </nav>
    </header>
  );
}
