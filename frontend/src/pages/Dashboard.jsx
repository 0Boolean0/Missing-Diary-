import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { api } from '../api/client';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const [cases, setCases] = useState([]);
  const [sightings, setSightings] = useState([]);
  const [stats, setStats] = useState(null);
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

  // Keep existing updateCase for non-pending cases (admin can still change status of active/verified/found cases)
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
  }

  const markers = cases.map(c => ({ lat: c.last_seen_lat, lng: c.last_seen_lng, title: c.name, description: c.status }));
  const totalCases = cases.length;
  const activeCases = cases.filter(c => ['active', 'verified'].includes(c.status)).length;
  const pendingCases = cases.filter(c => c.status === 'pending').length;
  const foundCases = cases.filter(c => c.status === 'found').length;

  const isAdminOrPolice = ['admin', 'police'].includes(user.role);

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
          {actionError && (
            <div className="rc-error" style={{ marginBottom: 16 }}>
              ⚠️ {actionError}
            </div>
          )}

          {/* ── Cases Tab ── */}
          {activeTab === 'cases' && (
            <>
              <h2>{t('dash.cases')}</h2>
              {cases.length === 0 ? (
                <div className="db-empty">
                  <div className="db-empty-icon">📭</div>
                  <p>{t('dash.no_cases')}</p>
                  <Link className="btn" to="/report">{t('dash.report_btn')}</Link>
                </div>
              ) : (
                <div className="db-table-wrap">
                  <table className="db-table">
                    <thead>
                      <tr>
                        <th>{t('dash.name')}</th>
                        <th>{t('dash.status')}</th>
                        <th>🤖 AI Score</th>
                        <th>{t('dash.last_seen')}</th>
                        <th>{t('dash.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cases.map(c => (
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

          {/* ── Sightings Tab ── */}
          {activeTab === 'sightings' && (
            <>
              <h2>{t('dash.sightings')}</h2>
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
                        <th>{t('dash.person')}</th>
                        <th>{t('dash.description')}</th>
                        <th>{t('dash.status')}</th>
                        <th>{t('dash.confidence')}</th>
                        <th>{t('dash.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sightings.map(s => (
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
