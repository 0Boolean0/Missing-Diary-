import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CaseCard from '../components/CaseCard';
import { api } from '../api/client';
import heroBg from '../assets/202507asia_bangladesh_enforced_disappearances.webp';
import logoGif from '../assets/output-onlinegiftools.gif';

export default function Home() {
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState({ total: 0, found: 0, sightings: 0 });
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/cases').then(r => {
      const data = r.data || [];
      setCases(data);
      setStats({
        total: data.length,
        found: data.filter(c => c.status === 'found').length,
        active: data.filter(c => c.status === 'active' || c.status === 'verified').length,
      });
    }).catch(() => setCases([]));
  }, []);

  const recent = cases.slice(0, 6);

  function handleSearch(e) {
    e.preventDefault();
    if (search.trim()) navigate(`/cases?q=${encodeURIComponent(search.trim())}`);
    else navigate('/cases');
  }

  return (
    <div className="home-page">
      <Navbar />

      {/* ── HERO ── */}
      <section className="home-hero" style={{ backgroundImage: `url(${heroBg})` }}>
        <div className="home-hero-overlay" />
        <div className="home-hero-content">
          <div className="home-hero-badge">Bangladesh's Missing Persons Alert System</div>
          <h1 className="home-hero-title">
            Help to bring them home,<br />
            <span className="home-hero-accent">Reunite them with loved ones.</span>
          </h1>
          <p className="home-hero-sub">
            Report missing persons instantly, share information, connect with authorities.<br />
            Every share increases hope and every verified update can save time.
          </p>
          <form className="home-search-bar" onSubmit={handleSearch}>
            <span className="home-search-icon">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, location, age..."
            />
            <button type="submit">Search</button>
          </form>
          <div className="home-hero-btns">
            <Link className="home-btn-primary" to="/report">🚨 Report Missing Person</Link>
            <Link className="home-btn-outline" to="/sighting">👁️ Submit a Sighting</Link>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="home-stats-bar">
        <div className="home-stats-inner">
          <div className="home-stat">
            <span className="home-stat-num">{stats.total}</span>
            <span className="home-stat-label">Total Cases Reported</span>
          </div>
          <div className="home-stat-divider" />
          <div className="home-stat">
            <span className="home-stat-num home-stat-green">{stats.found}</span>
            <span className="home-stat-label">Successfully Found</span>
          </div>
          <div className="home-stat-divider" />
          <div className="home-stat">
            <span className="home-stat-num home-stat-blue">{stats.active}</span>
            <span className="home-stat-label">Active Alerts</span>
          </div>
          <div className="home-stat-divider" />
          <div className="home-stat">
            <span className="home-stat-num home-stat-yellow">24/7</span>
            <span className="home-stat-label">Always Available</span>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="home-section home-how">
        <div className="home-section-inner">
          <div className="home-section-label">Simple Process</div>
          <h2 className="home-section-title">How Missing Diary Works</h2>
          <p className="home-section-sub">A streamlined process to find missing persons quickly</p>
          <div className="home-steps">
            {[
              { icon: '📋', step: '01', title: 'Submit a Report', desc: 'File a missing person report with photo, description, and last seen location.' },
              { icon: '🔔', step: '02', title: 'Instant Alert', desc: 'Our system creates a unique Case ID and shareable poster immediately.' },
              { icon: '🤝', step: '03', title: 'Community Response', desc: 'Citizens submit sightings. Smart matching connects found persons to cases.' },
              { icon: '🏠', step: '04', title: 'Safe Reunion', desc: 'Guardian verification, documentation and post-reunion support.' },
            ].map(s => (
              <div className="home-step" key={s.step}>
                <div className="home-step-icon">{s.icon}</div>
                <div className="home-step-num">{s.step}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RECENT ALERTS ── */}
      <section className="home-section home-alerts-section">
        <div className="home-section-inner">
          <div className="home-section-label">Urgent</div>
          <div className="home-alerts-header">
            <div>
              <h2 className="home-section-title" style={{ marginBottom: 4 }}>Recent Missing Alerts</h2>
              <p className="home-section-sub" style={{ marginTop: 0 }}>Help find these people. Every piece of information matters.</p>
            </div>
            <Link className="home-btn-secondary" to="/cases">View All Cases →</Link>
          </div>
          {recent.length === 0 ? (
            <div className="home-empty">
              <span>📭</span>
              <p>No cases reported yet. Be the first to help.</p>
              <Link className="home-btn-primary" to="/report">Report a Missing Person</Link>
            </div>
          ) : (
            <div className="home-cards-grid">
              {recent.map(c => <CaseCard item={c} key={c.id} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="home-section home-features-section">
        <div className="home-section-inner">
          <div className="home-section-label">Built for Speed & Safety</div>
          <h2 className="home-section-title">Every Feature Designed to Save Lives</h2>
          <div className="home-features-grid">
            {[
              { icon: '⚡', title: 'No Waiting Time', desc: 'Report instantly. Every second counts when finding missing persons.' },
              { icon: '📍', title: 'GPS Location Tracking', desc: 'Map-based reporting with precise location marking for last seen spot.' },
              { icon: '🕵️', title: 'Anonymous Reporting', desc: 'Submit information anonymously. Your identity stays protected.' },
              { icon: '🔒', title: 'Privacy First', desc: 'Found persons\' identities are protected until verified reunion.' },
              { icon: '🏛️', title: 'Multi-Agency Coordination', desc: 'Police, NGOs, hospitals and shelters work together seamlessly.' },
              { icon: '📱', title: 'QR Code Case Tracking', desc: 'Unique Case IDs with QR codes for easy sharing and tracking.' },
            ].map(f => (
              <div className="home-feature-card" key={f.title}>
                <div className="home-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── JOIN US ── */}
      <section className="home-join-section">
        <div className="home-section-inner">
          <div className="home-section-label" style={{ color: '#93c5fd' }}>Get Involved</div>
          <h2 className="home-section-title" style={{ color: 'white' }}>Join Us in Protecting Lives</h2>
          <p className="home-section-sub" style={{ color: '#bfdbfe' }}>Play your role in protecting children and missing persons</p>
          <div className="home-join-cards">
            <div className="home-join-card">
              <div className="home-join-icon">🙋</div>
              <h3>Volunteer</h3>
              <p>Give your time and skills to help find missing persons.</p>
              <Link className="home-btn-outline-white" to="/register">Get Started</Link>
            </div>
            <div className="home-join-card home-join-card-featured">
              <div className="home-join-icon">🚨</div>
              <h3>Report a Case</h3>
              <p>Know someone missing? File a report immediately.</p>
              <Link className="home-btn-primary" to="/report">Report Now</Link>
            </div>
            <div className="home-join-card">
              <div className="home-join-icon">👁️</div>
              <h3>Submit Sighting</h3>
              <p>Saw someone who might be missing? Let us know.</p>
              <Link className="home-btn-outline-white" to="/sighting">Submit Info</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="home-footer">
        <div className="home-footer-inner">
          <div className="home-footer-brand">
            <span className="home-footer-logo">
              <img src={logoGif} alt="Missing Diary" className="brand-gif" />
            </span>
            <p>Bangladesh's platform for reporting and finding missing persons. Every second matters. Together, we bring them home.</p>
          </div>
          <div className="home-footer-links">
            <h4>Quick Links</h4>
            <Link to="/report">Report Missing Person</Link>
            <Link to="/sighting">Submit a Sighting</Link>
            <Link to="/cases">Active Cases</Link>
            <Link to="/register">Join Us</Link>
          </div>
          <div className="home-footer-contact">
            <h4>Emergency Contact</h4>
            <p>📞 National Helpline: <strong>999</strong></p>
            <p>📧 support@missingdiary.com</p>
          </div>
        </div>
        <div className="home-footer-bottom">
          <p>© 2026 Missing Diary. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
