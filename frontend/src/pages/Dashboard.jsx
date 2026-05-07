import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import ActionButtons from '../components/ActionButtons';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { api } from '../api/client';
import { useLanguage } from '../context/LanguageContext';

export default function Dashboard() {
  const { user } = useAuth();
<<<<<<< Updated upstream
  const { t } = useLang();
=======
  const { t } = useLanguage();
>>>>>>> Stashed changes
  const [cases, setCases] = useState([]);
  const [pendingCases, setPendingCases] = useState([]);
  const [sightings, setSightings] = useState([]);
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('cases');
  const [actionError, setActionError] = useState('');

  // Task 19.1 — Request Info inline state
  const [requestInfoCaseId, setRequestInfoCaseId] = useState(null);
  const [requestInfoNote, setRequestInfoNote] = useState('');

  // Task 19.3 — Audit history state
  const [auditHistory, setAuditHistory] = useState({});
  const [expandedAudit, setExpandedAudit] = useState({});

  // Fix #9: guard against user being null before accessing .role
  if (!user) return null;

  useEffect(() => {
    const endpoint = ['admin', 'police'].includes(user.role) ? '/cases' : '/cases/mine';
<<<<<<< Updated upstream
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
=======
    api.get(endpoint).then(r => setCases(r.data)).catch(() => {});

    // 4.2.2 — fetch pending cases for admin
    if (user.role === 'admin') {
      api.get('/cases?status=pending').then(r => setPendingCases(r.data)).catch(() => {});
    }

    if (['admin', 'police'].includes(user.role)) {
      api.get('/sightings').then(r => setSightings(r.data)).catch(() => {});
    }
    if (user.role === 'admin') {
      api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
    }

    // 4.6.2 — fetch notifications for guardian
    api.get('/admin/notifications').then(r => setNotifications(r.data)).catch(() => {});
>>>>>>> Stashed changes
  }, [user.role]);

  // Keep existing updateCase for non-pending cases (admin can still change status of active/verified/found cases)
  async function updateCase(id, status) {
<<<<<<< Updated upstream
    setActionError('');
    try {
      await api.patch(`/cases/${id}/status`, { status });
      setCases(cases.map(c => c.id === id ? { ...c, status } : c));
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to update case status.');
    }
=======
    await api.patch(`/cases/${id}/status`, { status });
    setCases(cases.map(c => c.id === id ? { ...c, status } : c));
    setPendingCases(pendingCases.filter(c => c.id !== id));
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
  // Task 19.1 — Dedicated pending-case action handlers
  async function approveCase(id) {
    setActionError('');
    try {
      await api.post(`/cases/${id}/approve`);
      setCases(cases.map(c => c.id === id ? { ...c, status: 'verified' } : c));
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to approve case.');
    }
  }

  async function rejectCase(id) {
    setActionError('');
    try {
      await api.post(`/cases/${id}/reject`);
      setCases(cases.map(c => c.id === id ? { ...c, status: 'rejected' } : c));
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to reject case.');
    }
  }

  async function sendRequestInfo(id) {
    setActionError('');
    try {
      await api.post(`/cases/${id}/request-info`, { notes: requestInfoNote });
      // Status stays pending; just close the inline input
      setRequestInfoCaseId(null);
      setRequestInfoNote('');
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to send request info.');
    }
  }

  // Task 19.2 — Sighting action handlers
  async function approveSighting(id) {
    setActionError('');
    try {
      await api.post(`/sightings/${id}/approve`);
      setSightings(sightings.map(s => s.id === id ? { ...s, status: 'verified' } : s));
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to approve sighting.');
    }
  }

  async function rejectSighting(id) {
    setActionError('');
    try {
      await api.post(`/sightings/${id}/reject`);
      setSightings(sightings.map(s => s.id === id ? { ...s, status: 'rejected' } : s));
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to reject sighting.');
    }
  }

  // Keep existing updateSighting for non-pending sightings
  async function updateSighting(id, status) {
    setActionError('');
    try {
      await api.patch(`/sightings/${id}/status`, { status });
      setSightings(sightings.map(s => s.id === id ? { ...s, status } : s));
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to update sighting status.');
    }
  }

  // Task 19.3 — Audit history toggle/fetch
  async function toggleAudit(entityType, id) {
    const isExpanding = !expandedAudit[id];
    setExpandedAudit(prev => ({ ...prev, [id]: isExpanding }));

    if (isExpanding && !auditHistory[id]) {
      try {
        const endpoint = entityType === 'case'
          ? `/cases/${id}/audit`
          : `/sightings/${id}/audit`;
        const r = await api.get(endpoint);
        setAuditHistory(prev => ({ ...prev, [id]: r.data }));
      } catch (err) {
        console.error('Failed to load audit history:', err);
        setAuditHistory(prev => ({ ...prev, [id]: [] }));
      }
    }
  }

  function formatDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
=======
  // 4.4.2 — handle onAction callback
  function handleCaseAction(id, newStatus) {
    setCases(cases.map(c => c.id === id ? { ...c, status: newStatus } : c));
    setPendingCases(pendingCases.filter(c => c.id !== id));
  }

  function handleSightingAction(id, newStatus) {
    setSightings(sightings.map(s => s.id === id ? { ...s, status: newStatus } : s));
>>>>>>> Stashed changes
  }

  const markers = cases.map(c => ({ lat: c.last_seen_lat, lng: c.last_seen_lng, title: c.name, description: c.status }));
  const totalCases = cases.length;
  const activeCases = cases.filter(c => ['active', 'verified'].includes(c.status)).length;
  const pendingCount = cases.filter(c => c.status === 'pending').length;
  const foundCases = cases.filter(c => c.status === 'found').length;

<<<<<<< Updated upstream
  const isAdminOrPolice = ['admin', 'police'].includes(user.role);
=======
  const pendingSightings = sightings.filter(s => s.status === 'pending');
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
            <button className={`db-nav-item ${activeTab === 'cases' ? 'active' : ''}`} onClick={() => setActiveTab('cases')}>
              📋 {t('dash.cases')}
            </button>
            {isAdminOrPolice && (
              <button className={`db-nav-item ${activeTab === 'sightings' ? 'active' : ''}`} onClick={() => setActiveTab('sightings')}>
                👁️ {t('dash.sightings')}
              </button>
            )}
            {isAdminOrPolice && (
              <button className={`db-nav-item ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
                🗺️ {t('dash.map')}
              </button>
            )}
          </nav>
          <div className="db-sidebar-stats">
            <div className="db-stat-row"><span>Total</span><b>{totalCases}</b></div>
            <div className="db-stat-row"><span>Active</span><b className="green">{activeCases}</b></div>
            <div className="db-stat-row"><span>Pending</span><b className="yellow">{pendingCases}</b></div>
            <div className="db-stat-row"><span>Found</span><b className="green">{foundCases}</b></div>
=======
            <button className={`db-nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              <span>📊</span> {t('db_overview')}
            </button>
            <button className={`db-nav-item ${activeTab === 'cases' ? 'active' : ''}`} onClick={() => setActiveTab('cases')}>
              <span>📋</span> {t('db_my_cases')}
            </button>
            <button className={`db-nav-item ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
              <span>🗺️</span> Map View
            </button>
            {/* 4.2.1 — Pending Approval tab for admin */}
            {user.role === 'admin' && (
              <button className={`db-nav-item ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
                <span>⏳</span> {t('db_pending_approval')}
                {pendingCases.length > 0 && (
                  <span style={{ marginLeft: 'auto', background: 'var(--danger)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                    {pendingCases.length}
                  </span>
                )}
              </button>
            )}
            {['admin', 'police'].includes(user.role) && (
              <button className={`db-nav-item ${activeTab === 'sightings' ? 'active' : ''}`} onClick={() => setActiveTab('sightings')}>
                <span>👁️</span> {t('db_sightings')}
              </button>
            )}
          </nav>
          <div className="db-sidebar-actions">
            <Link to="/report" className="db-action-btn primary">+ {t('db_report_new')}</Link>
            <Link to="/sighting" className="db-action-btn ghost">Submit Sighting</Link>
>>>>>>> Stashed changes
          </div>
          {user.role === 'admin' && stats && (
            <div className="db-admin-stats">
              <div className="db-stat-row"><span>Total Users</span><b>{stats.totalUsers}</b></div>
            </div>
          )}
          <Link className="btn full" to="/report" style={{ marginTop: 'auto' }}>+ {t('dash.report_btn')}</Link>
        </aside>

        {/* Main content */}
        <main className="db-main">
<<<<<<< Updated upstream
          {actionError && (
            <div className="rc-error" style={{ marginBottom: 16 }}>
              ⚠️ {actionError}
=======
          {/* Header */}
          <div className="db-header">
            <div>
              <h1 className="db-title">Welcome back, {user.name.split(' ')[0]} 👋</h1>
              <p className="db-subtitle">Here's what's happening with missing cases today.</p>
            </div>
            <Link to="/report" className="db-action-btn primary">+ New Report</Link>
          </div>

          {/* 4.6.2 — Notification banner for guardian */}
          {notifications.length > 0 && (
            <div style={{
              background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 10,
              padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10
            }}>
              <span style={{ fontSize: 20 }}>🔔</span>
              <div>
                <strong>You have {notifications.length} notification{notifications.length > 1 ? 's' : ''}</strong>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#92400e' }}>
                  {notifications[0].message}
                </p>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="db-stats-grid">
            <div className="db-stat-card">
              <div className="db-stat-icon" style={{ background: '#dbeafe' }}>📋</div>
              <div>
                <div className="db-stat-num">{totalCases}</div>
                <div className="db-stat-label">{t('db_total_cases')}</div>
              </div>
            </div>
            <div className="db-stat-card">
              <div className="db-stat-icon" style={{ background: '#fef3c7' }}>⏳</div>
              <div>
                <div className="db-stat-num">{pendingCount}</div>
                <div className="db-stat-label">{t('db_pending')}</div>
              </div>
            </div>
            <div className="db-stat-card">
              <div className="db-stat-icon" style={{ background: '#dcfce7' }}>✅</div>
              <div>
                <div className="db-stat-num">{activeCases}</div>
                <div className="db-stat-label">{t('db_verified')}</div>
              </div>
            </div>
            <div className="db-stat-card">
              <div className="db-stat-icon" style={{ background: '#f0fdf4' }}>🏠</div>
              <div>
                <div className="db-stat-num">{foundCases}</div>
                <div className="db-stat-label">{t('db_found')}</div>
              </div>
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="db-section">
              <h2 className="db-section-title">{t('db_overview')}</h2>
              <MapView markers={markers} height={320} />
              {stats && (
                <div className="db-json-box">
                  <h3>Admin Stats</h3>
                  <pre>{JSON.stringify(stats, null, 2)}</pre>
                </div>
              )}
>>>>>>> Stashed changes
            </div>
          )}

          {/* ── Cases Tab ── */}
          {activeTab === 'cases' && (
<<<<<<< Updated upstream
            <>
              <h2>{t('dash.cases')}</h2>
              {cases.length === 0 ? (
                <div className="db-empty">
                  <div className="db-empty-icon">📭</div>
                  <p>{t('dash.no_cases')}</p>
                  <Link className="btn" to="/report">{t('dash.report_btn')}</Link>
=======
            <div className="db-section">
              <div className="db-section-header">
                <h2 className="db-section-title">{t('db_my_cases')}</h2>
                <span className="db-count-badge">{cases.length} total</span>
              </div>
              {cases.length === 0 ? (
                <div className="db-empty">
                  <div className="db-empty-icon">📭</div>
                  <p>{t('db_no_cases')}</p>
                  <Link to="/report" className="db-action-btn primary">Report a Case</Link>
>>>>>>> Stashed changes
                </div>
              ) : (
                <div className="db-table-wrap">
                  <table className="db-table">
                    <thead>
                      <tr>
<<<<<<< Updated upstream
                        <th>{t('dash.name')}</th>
                        <th>{t('dash.status')}</th>
                        <th>🤖 AI Score</th>
                        <th>{t('dash.last_seen')}</th>
                        <th>{t('dash.actions')}</th>
=======
                        <th>{t('db_name')}</th>
                        <th>Location</th>
                        {/* 4.6.1 — status badge always shown */}
                        <th>{t('db_status')}</th>
                        <th>{t('db_actions')}</th>
>>>>>>> Stashed changes
                      </tr>
                    </thead>
                    <tbody>
                      {cases.map(c => (
<<<<<<< Updated upstream
                        <>
                          <tr key={c.id}>
                            <td><Link to={`/cases/${c.id}`}>{c.name}</Link></td>
                            <td><span className={`badge ${c.status}`}>{c.status}</span></td>
                            <td>
                              {c.ai_verification_score != null ? (
                                <div className="ai-score-cell">
                                  <span
                                    className={`ai-score-badge ${
                                      c.ai_verification_score >= 80 ? 'ai-score-high'
                                      : c.ai_verification_score >= 50 ? 'ai-score-mid'
                                      : 'ai-score-low'
                                    }`}
                                    title={c.ai_flags || 'No flags'}
                                  >
                                    {c.ai_verification_score}/100
                                  </span>
                                  {c.ai_flags && (
                                    <span className="ai-flags-tip" title={c.ai_flags}>⚠️</span>
                                  )}
                                </div>
                              ) : (
                                <span className="muted" style={{ fontSize: '0.8rem' }}>—</span>
                              )}
                            </td>
                            <td>{c.last_seen_location}</td>
                            <td className="db-actions">
                              {isAdminOrPolice && c.status === 'pending' ? (
                                /* Task 19.1 — Pending case: show Approve / Reject / Request Info buttons */
                                <div className="db-btn-group">
                                  <button
                                    className="db-mini-btn verify"
                                    onClick={() => approveCase(c.id)}
                                    title="Approve case"
                                  >
                                    ✅ Approve
                                  </button>
                                  <button
                                    className="db-mini-btn reject"
                                    onClick={() => rejectCase(c.id)}
                                    title="Reject case"
                                  >
                                    ❌ Reject
                                  </button>
                                  <button
                                    className="db-mini-btn pending"
                                    onClick={() => {
                                      setRequestInfoCaseId(c.id);
                                      setRequestInfoNote('');
                                    }}
                                    title="Request more information"
                                  >
                                    ℹ️ Request Info
                                  </button>
                                  {isAdminOrPolice && (
                                    <button
                                      className="db-mini-btn"
                                      style={{ background: '#f0f4ff', color: '#3b5bdb' }}
                                      onClick={() => toggleAudit('case', c.id)}
                                      title="View audit history"
                                    >
                                      📋 Audit
                                    </button>
                                  )}
                                  {user.role === 'admin' && (
                                    <button className="btn small danger" onClick={() => deleteCase(c.id)}>{t('dash.delete')}</button>
                                  )}
                                </div>
                              ) : isAdminOrPolice ? (
                                /* Non-pending case: keep existing select dropdown */
                                <div className="db-btn-group">
                                  <select
                                    value={c.status}
                                    onChange={e => updateCase(c.id, e.target.value)}
                                    className="db-status-select"
                                  >
                                    {['pending', 'verified', 'active', 'found', 'closed', 'rejected'].map(s => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                  <button
                                    className="db-mini-btn"
                                    style={{ background: '#f0f4ff', color: '#3b5bdb' }}
                                    onClick={() => toggleAudit('case', c.id)}
                                    title="View audit history"
                                  >
                                    📋 Audit
                                  </button>
                                  {user.role === 'admin' && (
                                    <button className="btn small danger" onClick={() => deleteCase(c.id)}>{t('dash.delete')}</button>
                                  )}
                                </div>
                              ) : (
                                /* Guardian/local: no status controls */
                                null
=======
                        <tr key={c.id}>
                          <td><Link to={`/cases/${c.id}`} className="db-link">{c.name}</Link></td>
                          <td className="db-muted">{c.last_seen_location}</td>
                          {/* 4.6.1 — status badge for all roles */}
                          <td><span className={`badge ${c.status}`}>{c.status}</span></td>
                          <td>
                            <div className="db-btn-group">
                              <Link to={`/cases/${c.id}`} className="db-mini-btn verify">View</Link>
                              {user.role === 'police' && (
                                <button className="db-mini-btn found" onClick={() => updateCase(c.id, 'found')}>Found</button>
                              )}
                              {/* 4.4.1 — use ActionButtons for admin */}
                              {user.role === 'admin' && (
                                <>
                                  <ActionButtons
                                    type="case"
                                    id={c.id}
                                    currentStatus={c.status}
                                    onAction={handleCaseAction}
                                  />
                                  <button className="db-mini-btn delete" onClick={() => deleteCase(c.id)}>🗑️</button>
                                </>
>>>>>>> Stashed changes
                              )}
                            </td>
                          </tr>

                          {/* Task 19.1 — Request Info inline input row */}
                          {requestInfoCaseId === c.id && (
                            <tr key={`${c.id}-request-info`} className="db-inline-row">
                              <td colSpan={4}>
                                <div className="db-request-info-box">
                                  <label className="db-request-info-label">
                                    ℹ️ Enter a note for the reporter:
                                  </label>
                                  <div className="db-request-info-controls">
                                    <input
                                      type="text"
                                      className="db-request-info-input"
                                      placeholder="Describe what additional information is needed…"
                                      value={requestInfoNote}
                                      onChange={e => setRequestInfoNote(e.target.value)}
                                      autoFocus
                                    />
                                    <button
                                      className="btn small"
                                      onClick={() => sendRequestInfo(c.id)}
                                      disabled={!requestInfoNote.trim()}
                                    >
                                      Send
                                    </button>
                                    <button
                                      className="btn small outline"
                                      onClick={() => {
                                        setRequestInfoCaseId(null);
                                        setRequestInfoNote('');
                                      }}
                                    >
                                      ×
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* Task 19.3 — Audit history panel row for cases */}
                          {expandedAudit[c.id] && (
                            <tr key={`${c.id}-audit`} className="db-inline-row">
                              <td colSpan={4}>
                                <div className="db-audit-panel">
                                  <div className="db-audit-header">📋 Audit History</div>
                                  {!auditHistory[c.id] ? (
                                    <p className="muted" style={{ margin: '8px 0' }}>Loading…</p>
                                  ) : auditHistory[c.id].length === 0 ? (
                                    <p className="muted" style={{ margin: '8px 0' }}>No audit records yet.</p>
                                  ) : (
                                    <ul className="db-audit-list">
                                      {auditHistory[c.id].map((entry, i) => (
                                        <li key={i} className="db-audit-entry">
                                          <div className="db-audit-meta">
                                            <span className="db-audit-actor">{entry.actor_name}</span>
                                            <span className="db-audit-action">{entry.action}</span>
                                            <span className="db-audit-time muted">{formatDate(entry.created_at)}</span>
                                          </div>
                                          {entry.notes && (
                                            <div className="db-audit-notes muted">{entry.notes}</div>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

<<<<<<< Updated upstream
          {/* ── Sightings Tab ── */}
          {activeTab === 'sightings' && (
            <>
              <h2>{t('dash.sightings')}</h2>
=======
          {/* 4.2.3 — Pending Approval Tab */}
          {activeTab === 'pending' && user.role === 'admin' && (
            <div className="db-section">
              <div className="db-section-header">
                <h2 className="db-section-title">{t('db_pending_approval')}</h2>
                <span className="db-count-badge">{pendingCases.length} pending</span>
              </div>
              {pendingCases.length === 0 ? (
                <div className="db-empty">
                  <div className="db-empty-icon">✅</div>
                  <p>No pending cases — all caught up!</p>
                </div>
              ) : (
                <div className="db-table-wrap">
                  <table className="db-table">
                    <thead>
                      <tr>
                        <th>{t('db_name')}</th>
                        <th>Location</th>
                        <th>{t('db_date')}</th>
                        <th>{t('db_actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingCases.map(c => (
                        <tr key={c.id}>
                          <td><Link to={`/cases/${c.id}`} className="db-link">{c.name}</Link></td>
                          <td className="db-muted">{c.last_seen_location}</td>
                          <td className="db-muted">{new Date(c.created_at).toLocaleDateString()}</td>
                          <td>
                            <ActionButtons
                              type="case"
                              id={c.id}
                              currentStatus={c.status}
                              onAction={handleCaseAction}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Sightings Tab — admin & police only */}
          {activeTab === 'sightings' && ['admin', 'police'].includes(user.role) && (
            <div className="db-section">
              <div className="db-section-header">
                <h2 className="db-section-title">{t('db_sightings')}</h2>
                <span className="db-count-badge">{sightings.length} total</span>
              </div>

              {/* 10.3.1 — Pending Sightings sub-section */}
              {pendingSightings.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
                    ⏳ {t('db_pending_sightings')} ({pendingSightings.length})
                  </h3>
                  <div className="db-table-wrap">
                    <table className="db-table">
                      <thead>
                        <tr>
                          <th>Person</th>
                          <th>Location</th>
                          <th>Confidence</th>
                          <th>{t('db_actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingSightings.map(s => (
                          <tr key={s.id}>
                            <td>{s.person_name}</td>
                            <td className="db-muted">{s.location_text}</td>
                            <td><span className={`badge ${s.confidence_level}`}>{s.confidence_level}</span></td>
                            <td>
                              {/* 10.3.2 — ActionButtons with Verify/Reject/Flag */}
                              <ActionButtons
                                type="sighting"
                                id={s.id}
                                currentStatus={s.status}
                                onAction={handleSightingAction}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

>>>>>>> Stashed changes
              {sightings.length === 0 ? (
                <div className="db-empty">
                  <div className="db-empty-icon">👁️</div>
                  <p>{t('dash.no_sightings')}</p>
                </div>
              ) : (
                <div className="db-table-wrap">
                  <table className="db-table">
                    <thead>
                      <tr>
<<<<<<< Updated upstream
                        <th>{t('dash.person')}</th>
                        <th>{t('dash.description')}</th>
                        <th>{t('dash.status')}</th>
                        <th>{t('dash.confidence')}</th>
                        <th>{t('dash.actions')}</th>
=======
                        <th>Person</th>
                        <th>Location</th>
                        <th>Confidence</th>
                        <th>{t('db_status')}</th>
                        <th>{t('db_actions')}</th>
>>>>>>> Stashed changes
                      </tr>
                    </thead>
                    <tbody>
                      {sightings.map(s => (
<<<<<<< Updated upstream
                        <>
                          <tr key={s.id}>
                            <td>{s.person_name || '—'}</td>
                            <td>{s.description?.slice(0, 60)}…</td>
                            <td><span className={`badge ${s.status}`}>{s.status}</span></td>
                            <td>{s.confidence_level}</td>
                            <td className="db-actions">
                              {s.status === 'pending' ? (
                                /* Task 19.2 — Pending sighting: show Approve / Reject buttons */
                                <div className="db-btn-group">
                                  <button
                                    className="db-mini-btn verify"
                                    onClick={() => approveSighting(s.id)}
                                    title="Approve sighting"
                                  >
                                    ✅ Approve
                                  </button>
                                  <button
                                    className="db-mini-btn reject"
                                    onClick={() => rejectSighting(s.id)}
                                    title="Reject sighting"
                                  >
                                    ❌ Reject
                                  </button>
                                  <button
                                    className="db-mini-btn"
                                    style={{ background: '#f0f4ff', color: '#3b5bdb' }}
                                    onClick={() => toggleAudit('sighting', s.id)}
                                    title="View audit history"
                                  >
                                    📋 Audit
                                  </button>
                                </div>
                              ) : (
                                /* Non-pending sighting: keep existing select dropdown */
                                <div className="db-btn-group">
                                  <select
                                    value={s.status}
                                    onChange={e => updateSighting(s.id, e.target.value)}
                                    className="db-status-select"
                                  >
                                    {['pending', 'verified', 'rejected'].map(st => (
                                      <option key={st} value={st}>{st}</option>
                                    ))}
                                  </select>
                                  <button
                                    className="db-mini-btn"
                                    style={{ background: '#f0f4ff', color: '#3b5bdb' }}
                                    onClick={() => toggleAudit('sighting', s.id)}
                                    title="View audit history"
                                  >
                                    📋 Audit
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>

                          {/* Task 19.3 — Audit history panel row for sightings */}
                          {expandedAudit[s.id] && (
                            <tr key={`${s.id}-audit`} className="db-inline-row">
                              <td colSpan={5}>
                                <div className="db-audit-panel">
                                  <div className="db-audit-header">📋 Audit History</div>
                                  {!auditHistory[s.id] ? (
                                    <p className="muted" style={{ margin: '8px 0' }}>Loading…</p>
                                  ) : auditHistory[s.id].length === 0 ? (
                                    <p className="muted" style={{ margin: '8px 0' }}>No audit records yet.</p>
                                  ) : (
                                    <ul className="db-audit-list">
                                      {auditHistory[s.id].map((entry, i) => (
                                        <li key={i} className="db-audit-entry">
                                          <div className="db-audit-meta">
                                            <span className="db-audit-actor">{entry.actor_name}</span>
                                            <span className="db-audit-action">{entry.action}</span>
                                            <span className="db-audit-time muted">{formatDate(entry.created_at)}</span>
                                          </div>
                                          {entry.notes && (
                                            <div className="db-audit-notes muted">{entry.notes}</div>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
=======
                        <tr key={s.id}>
                          <td>{s.person_name}</td>
                          <td className="db-muted">{s.location_text}</td>
                          <td><span className={`badge ${s.confidence_level}`}>{s.confidence_level}</span></td>
                          <td><span className={`badge ${s.status}`}>{s.status}</span></td>
                          <td>
                            <ActionButtons
                              type="sighting"
                              id={s.id}
                              currentStatus={s.status}
                              onAction={handleSightingAction}
                            />
                          </td>
                        </tr>
>>>>>>> Stashed changes
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── Map Tab ── */}
          {activeTab === 'map' && (
            <>
              <h2>{t('dash.cases_map')}</h2>
              <MapView markers={markers} height={520} />
            </>
          )}
        </main>
      </div>
    </>
  );
}
