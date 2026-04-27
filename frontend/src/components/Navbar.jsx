import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoGif from '../assets/output-onlinegiftools.gif';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const dropRef = useRef(null);
  const nav = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) { if (dropRef.current && !dropRef.current.contains(e.target)) setReportOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleReportClick(path) {
    setReportOpen(false);
    if (user) {
      nav(path);
    } else {
      nav(`/login?redirect=${encodeURIComponent(path)}`);
    }
  }

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        <img src={logoGif} alt="Missing Diary" className="brand-gif" />
      </Link>
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
        </div>

        {user
          ? <><Link to="/dashboard">Dashboard</Link><button className="ghost" onClick={logout}>Logout</button></>
          : <Link className="btn small" to="/login">Login</Link>
        }
      </nav>
    </header>
  );
}
