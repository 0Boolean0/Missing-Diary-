import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function Dashboard() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [sightings, setSightings] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('cases');

  useEffect(() => {
    api.get(user.role === 'guardian' ? '/cases/mine' : '/cases').then(r => setCases(r.data)).catch(() => {});
    if (['admin', 'police'].includes(user.role)) api.get('/sightings').then(r => setSightings(r.data)).catch(() => {});
    if (user.role === 'admin') api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
  }, [user.role]);

  async function updateCase(id, status) {
    await api.patch(`/cases/${id}/status`, { status });
    setCases(cases.map(c => c.id === id ? { ...c, status } : c));
  }
  async function updateSighting(id, status) {
    await api.patch(`/sightings/${id}/status`, { status });
    setSightings(sightings.map(s => s.id === id ? { ...s, status } : s));
  }

  const markers = cases.map(c => ({ lat: c.last_seen_lat, lng: c.last_seen_lng, title: c.name, description: c.status }));
  const totalCases = cases.length;
  const activeCases = cases.filter(c => ['active', 'verified'].includes(c.status)).length;
  const pendingCases = cases.filter(c => c.status === 'pending').length;
  const foundCases = cases.filter(c => c.status === 'found').length;

  return (
    <>
      <Navbar />
      <div className="db-wrapper">
        {/* Sidebar */}
        <aside className="db-sidebar">
          <div className="db-sidebar-header">
            <div className="db-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div>
              <div className="db-username">{user.name}</div>
              <span className="db-role-badge">{user.role.toUpperCase()}</span>
            </div>
          </div>
          <nav className="db-nav">
            <button className={`db-nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              <span>📊</span> Overview
            </button>
            <button className={`db-nav-item ${activeTab === 'cases' ? 'active' : ''}`} onClick={() => setActiveTab('cases')}>
              <span>📋</span> Cases
            </button>
            <button className={`db-nav-item ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
              <span>🗺️</span> Map View
            </button>
            {['admin', 'police'].includes(user.role) && (
              <button className={`db-nav-item ${activeTab === 'sightings' ? 'active' : ''}`} onClick={() => setActiveTab('sightings')}>
                <span>👁️</span> Sightings
              </button>
            )}
          </nav>
          <div className="db-sidebar-actions">
            <Link to="/report" className="db-action-btn primary">+ Report Case</Link>
            <Link to="/sighting" className="db-action-btn ghost">Submit Sighting</Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="db-main">
          {/* Header */}
          <div className="db-header">
            <div>
              <h1 className="db-title">Welcome back, {user.name.split(' ')[0]} 👋</h1>
              <p className="db-subtitle">Here's what's happening with missing cases today.</p>
            </div>
            <Link to="/report" className="db-action-btn primary">+ New Report</Link>
          </div>

          {/* Stats Cards */}
          <div className="db-stats-grid">
            <div className="db-stat-card">
              <div className="db-stat-icon" style={{ background: '#dbeafe' }}>📋</div>
              <div>
                <div className="db-stat-num">{totalCases}</div>
                <div className="db-stat-label">Total Cases</div>
              </div>
            </div>
            <div className="db-stat-card">
              <div className="db-stat-icon" style={{ background: '#fef3c7' }}>⏳</div>
              <div>
                <div className="db-stat-num">{pendingCases}</div>
                <div className="db-stat-label">Pending</div>
              </div>
            </div>
            <div className="db-stat-card">
              <div className="db-stat-icon" style={{ background: '#dcfce7' }}>✅</div>
              <div>
                <div className="db-stat-num">{activeCases}</div>
                <div className="db-stat-label">Active</div>
              </div>
            </div>
            <div className="db-stat-card">
              <div className="db-stat-icon" style={{ background: '#f0fdf4' }}>🏠</div>
              <div>
                <div className="db-stat-num">{foundCases}</div>
                <div className="db-stat-label">Found</div>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="db-section">
              <h2 className="db-section-title">Overview</h2>
              <MapView markers={markers} height={320} />
              {stats && (
                <div className="db-json-box">
                  <h3>Admin Stats</h3>
                  <pre>{JSON.stringify(stats, null, 2)}</pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'map' && (
            <div className="db-section">
              <h2 className="db-section-title">Live Map</h2>
              <MapView markers={markers} height={480} />
            </div>
          )}

          {activeTab === 'cases' && (
            <div className="db-section">
              <div className="db-section-header">
                <h2 className="db-section-title">Cases</h2>
                <span className="db-count-badge">{cases.length} total</span>
              </div>
              {cases.length === 0 ? (
                <div className="db-empty">
                  <div className="db-empty-icon">📭</div>
                  <p>No cases found</p>
                  <Link to="/report" className="db-action-btn primary">Report a Case</Link>
                </div>
              ) : (
                <div className="db-table-wrap">
                  <table className="db-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cases.map(c => (
                        <tr key={c.id}>
                          <td><Link to={`/cases/${c.id}`} className="db-link">{c.name}</Link></td>
                          <td className="db-muted">{c.last_seen_location}</td>
                          <td><span className={`badge ${c.status}`}>{c.status}</span></td>
                          <td>
                            {['admin', 'police'].includes(user.role) ? (
                              <div className="db-btn-group">
                                <button className="db-mini-btn verify" onClick={() => updateCase(c.id, 'verified')}>Verify</button>
                                <button className="db-mini-btn found" onClick={() => updateCase(c.id, 'found')}>Found</button>
                                <button className="db-mini-btn reject" onClick={() => updateCase(c.id, 'rejected')}>Reject</button>
                              </div>
                            ) : (
                              <Link to={`/cases/${c.id}`} className="db-mini-btn verify">View</Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sightings' && ['admin', 'police'].includes(user.role) && (
            <div className="db-section">
              <div className="db-section-header">
                <h2 className="db-section-title">Sightings</h2>
                <span className="db-count-badge">{sightings.length} total</span>
              </div>
              {sightings.length === 0 ? (
                <div className="db-empty">
                  <div className="db-empty-icon">👁️</div>
                  <p>No sightings reported yet</p>
                </div>
              ) : (
                <div className="db-table-wrap">
                  <table className="db-table">
                    <thead>
                      <tr>
                        <th>Person</th>
                        <th>Location</th>
                        <th>Confidence</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sightings.map(s => (
                        <tr key={s.id}>
                          <td>{s.person_name}</td>
                          <td className="db-muted">{s.location_text}</td>
                          <td><span className={`badge ${s.confidence_level}`}>{s.confidence_level}</span></td>
                          <td><span className={`badge ${s.status}`}>{s.status}</span></td>
                          <td>
                            <div className="db-btn-group">
                              <button className="db-mini-btn verify" onClick={() => updateSighting(s.id, 'verified')}>Verify</button>
                              <button className="db-mini-btn reject" onClick={() => updateSighting(s.id, 'rejected')}>Reject</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
