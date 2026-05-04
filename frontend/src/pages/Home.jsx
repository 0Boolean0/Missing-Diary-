import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CaseCard from '../components/CaseCard';
import { api } from '../api/client';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import heroBg from '../assets/202507asia_bangladesh_enforced_disappearances.webp';
import logoGif from '../assets/output-onlinegiftools.gif';

export default function Home() {
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState({ total: 0, found: 0, active: 0 });
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { t } = useLang();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin' || user?.role === 'police';

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
    navigate(search.trim() ? `/cases?q=${encodeURIComponent(search.trim())}` : '/cases');
  }

  return (
    <div className="home-page">
      <Navbar />

      {/* ── HERO ── */}
      <section className="home-hero" style={{ backgroundImage: `url(${heroBg})` }}>
        <div className="home-hero-overlay" />
        <div className="home-hero-content">
          <div className="home-hero-badge">
            {t('home.hero_badge')}
          </div>
          <h1 className="home-hero-title">
            {t('home.hero_title')}<br />
            <span className="home-hero-accent">{t('home.hero_accent')}</span>
          </h1>
          <p className="home-hero-sub">
            {t('home.hero_sub')}
          </p>

          {/* Search */}
          <form className="home-search-bar" onSubmit={handleSearch}>
            <span className="home-search-icon">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('home.search_placeholder')}
            />
            <button type="submit">{t('home.search_btn')}</button>
          </form>

          {/* CTAs — red for emergency report, outline for sighting */}
          {!isAdmin && (
            <div className="home-hero-btns">
              <Link className="home-btn-primary" to="/report">
                {t('home.report_btn')}
              </Link>
              <Link className="home-btn-outline" to="/sighting">
                {t('home.sighting_btn')}
              </Link>
            </div>
          )}
          {isAdmin && (
            <div className="home-hero-btns">
              <Link className="home-btn-outline" to="/dashboard">
                📋 Go to Dashboard
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="home-stats-bar">
        <div className="home-stats-inner">
          <div className="home-stat">
            <span className="home-stat-num">{stats.total}</span>
            <span className="home-stat-label">{t('home.stat_reported')}</span>
          </div>
          <div className="home-stat-divider" />
          <div className="home-stat">
            <span className="home-stat-num home-stat-green">{stats.found}</span>
            <span className="home-stat-label">{t('home.stat_found')}</span>
          </div>
          <div className="home-stat-divider" />
          <div className="home-stat">
            <span className="home-stat-num">{stats.active}</span>
            <span className="home-stat-label">{t('home.stat_active')}</span>
          </div>
          <div className="home-stat-divider" />
          <div className="home-stat">
            <span className="home-stat-num home-stat-green">24/7</span>
            <span className="home-stat-label">{t('home.stat_available')}</span>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="home-section home-how">
        <div className="home-section-inner">
          <div className="home-section-label">{t('home.how_label')}</div>
          <h2 className="home-section-title">{t('home.how_title')}</h2>
          <p className="home-section-sub">{t('home.how_sub')}</p>
          <div className="home-steps">
            {[
              { icon: '📋', step: '01', title: 'Submit a Report', desc: 'File a missing person report with photo, description, and last seen location.' },
              { icon: '🔔', step: '02', title: 'Instant Alert', desc: 'Our system creates a unique Case ID and shareable poster immediately.' },
              { icon: '🤝', step: '03', title: 'Community Response', desc: 'Citizens submit sightings. Smart matching connects found persons to cases.' },
              { icon: '🏠', step: '04', title: 'Safe Reunion', desc: 'Guardian verification, documentation, and post-reunion support.' },
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
      {!isAdmin && (
      <section className="home-section home-alerts-section">
        <div className="home-section-inner">
          <div className="home-section-label">{t('home.recent_label')}</div>
          <div className="home-alerts-header">
            <div>
              <h2 className="home-section-title" style={{ marginBottom: 4 }}>{t('home.recent_title')}</h2>
              <p className="home-section-sub" style={{ marginTop: 0, marginBottom: 0 }}>
                {t('home.recent_sub')}
              </p>
            </div>
            <Link className="home-btn-secondary" to="/cases">{t('home.view_all')}</Link>
          </div>

          {recent.length === 0 ? (
            <div className="home-empty">
              <span>📭</span>
              <p>{t('home.no_cases')}</p>
              <Link className="home-btn-primary" to="/report">Report a Missing Person</Link>
            </div>
          ) : (
            <div className="home-cards-grid">
              {recent.map(c => <CaseCard item={c} key={c.id} />)}
            </div>
          )}
        </div>
      </section>
      )}

      {/* ── FEATURES ── */}
      <section className="home-section home-features-section">
        <div className="home-section-inner">
          <div className="home-section-label">{t('home.features_label')}</div>
          <h2 className="home-section-title">{t('home.features_title')}</h2>
          <p className="home-section-sub">Built for speed, privacy, and coordination across agencies.</p>
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
          <div className="home-section-label">{t('home.join_label')}</div>
          <h2 className="home-section-title">{t('home.join_title')}</h2>
          <p className="home-section-sub">Play your role in protecting children and missing persons across Bangladesh.</p>
          <div className="home-join-cards">
            <div className="home-join-card">
              <div className="home-join-icon">🙋</div>
              <h3>Volunteer</h3>
              <p>Give your time and skills to help find missing persons.</p>
              <Link className="home-btn-outline-white" to="/register">Get Started</Link>
            </div>
            {/* Featured card — hidden for admin/police */}
            {!isAdmin && (
              <div className="home-join-card home-join-card-featured">
                <div className="home-join-icon">🚨</div>
                <h3>Report a Case</h3>
                <p>Know someone missing? File a report immediately.</p>
                <Link className="home-btn-primary" to="/report">Report Now</Link>
              </div>
            )}
            {isAdmin && (
              <div className="home-join-card home-join-card-featured">
                <div className="home-join-icon">🛡️</div>
                <h3>Manage Cases</h3>
                <p>Review pending reports, approve or reject submissions.</p>
                <Link className="home-btn-primary" to="/dashboard">Open Dashboard</Link>
              </div>
            )}
            <div className="home-join-card">
              <div className="home-join-icon">👁️</div>
              <h3>Submit Sighting</h3>
              <p>Saw someone who might be missing? Let us know.</p>
              <Link className="home-btn-green" to="/sighting">Submit Info</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="home-footer">
        <div className="home-footer-inner">
          <div className="home-footer-brand">
            <span className="home-footer-logo">
              <img src={logoGif} alt="Missing Diary" style={{ width: 160, height: 64, objectFit: 'contain', mixBlendMode: 'screen', filter: 'brightness(1.2)' }} />
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
          <p>{t('home.footer_copyright')}</p>
        </div>
      </footer>
    </div>
  );
}
