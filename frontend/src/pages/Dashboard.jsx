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
  const [actionError, setActionError] = useState('');

  // Fix #9: guard against user being null before accessing .role
  if (!user) return null;

  useEffect(() => {
    const endpoint = ['admin', 'police'].includes(user.role) ? '/cases' : '/cases/mine';
    // Fix #16: show errors instead of silently swallowing them
    api.get(endpoint)
      .then(r => setCases(r.data))
      .catch(err => console.error('Failed to load cases:', err));
    if (['admin', 'police'].includes(user.role)) {
      api.get('/sightings')
        .then(r => setSightings(r.data))
        .catch(err => console.error('Failed to load sightings:', err));
    }
    if (user.role === 'admin') {
      api.get('/admin/stats')
        .then(r => setStats(r.data))
        .catch(err => console.error('Failed to load stats:', err));
    }
  }, [user.role]);

  // Fix #17: wrap mutations in try/catch and surface errors to the user
  async function updateCase(id, status) {
    setActionError('');
    try {
      await api.patch(`/cases/${id}/status`, { status });
      setCases(cases.map(c => c.id === id ? { ...c, status } : c));
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to update case status.');
    }
  }

  async function deleteCase(id) {
    if (!window.confirm('Are you sure you want to delete this case? This cannot be undone.')) return;
    setActionError('');
    try {
      await api.delete(`/cases/${id}`);
      setCases(cases.filter(c => c.id !== id));
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to delete case.');
    }
  }

  async function updateSighting(id, status) {
    setActionError('');
    try {
      await api.patch(`/sightings/${id}/status`, { status });
      setSightings(sightings.map(s => s.id === id ? { ...s, status } : s));
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to update sighting status.');
    }
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
            <div className="db-avatar">{user.name?.[0]?.toUpperCase()}</div>
            <div>
              <div className="db-username">{user.name}</div>
              <div className="db-role">{user.role}</div>
            </div>
          </div>
          <nav className="db-nav">
            <button className={`db-nav-item ${activeTab === 'cases' ? 'active' : ''}`} onClick={() => setActiveTab('cases')}>
              📋 Cases
            </button>
            {['admin', 'police'].includes(user.role) && (
              <button className={`db-nav-item ${activeTab === 'sightings' ? 'active' : ''}`} onClick={() => setActiveTab('sightings')}>
                👁️ Sightings
              </button>
            )}
            {['admin', 'police'].includes(user.role) && (
              <button className={`db-nav-item ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
                🗺️ Map
              </button>
            )}
          </nav>
          <div className="db-sidebar-stats">
            <div className="db-stat-row"><span>Total</span><b>{totalCases}</b></div>
            <div className="db-stat-row"><span>Active</span><b className="green">{activeCases}</b></div>
            <div className="db-stat-row"><span>Pending</span><b className="yellow">{pendingCases}</b></div>
            <div className="db-stat-row"><span>Found</span><b className="green">{foundCases}</b></div>
          </div>
          {user.role === 'admin' && stats && (
            <div className="db-admin-stats">
              <div className="db-stat-row"><span>Total Users</span><b>{stats.totalUsers}</b></div>
            </div>
          )}
          <Link className="btn full" to="/report" style={{ marginTop: 'auto' }}>+ Report Case</Link>
        </aside>

        {/* Main content */}
        <main className="db-main">
          {actionError && (
            <div className="rc-error" style={{ marginBottom: 16 }}>
              ⚠️ {actionError}
            </div>
          )}

          {activeTab === 'cases' && (
            <>
              <h2>Cases</h2>
              {cases.length === 0 ? (
                <div className="db-empty">
                  <div className="db-empty-icon">📭</div>
                  <p>No cases yet.</p>
                  <Link className="btn" to="/report">Report a Missing Person</Link>
                </div>
              ) : (
                <div className="db-table-wrap">
                  <table className="db-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Last Seen</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cases.map(c => (
                        <tr key={c.id}>
                          <td><Link to={`/cases/${c.id}`}>{c.name}</Link></td>
                          <td><span className={`badge ${c.status}`}>{c.status}</span></td>
                          <td>{c.last_seen_location}</td>
                          <td className="db-actions">
                            {['admin', 'police'].includes(user.role) && (
                              <select
                                value={c.status}
                                onChange={e => updateCase(c.id, e.target.value)}
                                className="db-status-select"
                              >
                                {['pending','verified','active','found','closed','rejected'].map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            )}
                            {user.role === 'admin' && (
                              <button className="btn small danger" onClick={() => deleteCase(c.id)}>Delete</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'sightings' && (
            <>
              <h2>Sightings</h2>
              {sightings.length === 0 ? (
                <div className="db-empty">
                  <div className="db-empty-icon">👁️</div>
                  <p>No sightings yet.</p>
                </div>
              ) : (
                <div className="db-table-wrap">
                  <table className="db-table">
                    <thead>
                      <tr>
                        <th>Person</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th>Confidence</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sightings.map(s => (
                        <tr key={s.id}>
                          <td>{s.person_name || '—'}</td>
                          <td>{s.description?.slice(0, 60)}…</td>
                          <td><span className={`badge ${s.status}`}>{s.status}</span></td>
                          <td>{s.confidence_level}</td>
                          <td className="db-actions">
                            <select
                              value={s.status}
                              onChange={e => updateSighting(s.id, e.target.value)}
                              className="db-status-select"
                            >
                              {['pending','verified','rejected'].map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'map' && (
            <>
              <h2>Cases Map</h2>
              <MapView markers={markers} height={520} />
            </>
          )}
        </main>
      </div>
    </>
  );
}
