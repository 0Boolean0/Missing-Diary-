import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { api } from '../api/client';
import PoliceDashboard from '../pages/PoliceDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const [cases, setCases] = useState([]);
  const [sightings, setSightings] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('cases');
  const [actionError, setActionError] = useState('');
  const [auditHistory, setAuditHistory] = useState({});
  const [expandedAudit, setExpandedAudit] = useState({});
  const [scanImage, setScanImage] = useState(null);
  const [scanResults, setScanResults] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');
  // pending edits per card: { [caseId]: { review: 'approve'|'reject'|'', found: 'found'|'not_found' } }
  const [pendingEdits, setPendingEdits] = useState({});
  const [savingId, setSavingId] = useState(null);

  if (!user) return null;
  if (user.role === 'police') return <PoliceDashboard />;

  useEffect(() => {
    api.get('/cases').then(r => setCases(r.data)).catch(() => {});
    api.get('/sightings').then(r => setSightings(r.data)).catch(() => {});
    api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

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
    if (!window.confirm('Delete this case? This cannot be undone.')) return;
    setActionError('');
    try {
      await api.delete(`/cases/${id}`);
      setCases(cases.filter(c => c.id !== id));
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to delete case.');
    }
  }

  async function approveCase(id) {
    setActionError('');
    try {
      await api.post(`/cases/${id}/approve`);
      setCases(cases.map(c => c.id === id ? { ...c, status: 'active' } : c));
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

  async function updateSighting(id, status) {
    setActionError('');
    try {
      await api.patch(`/sightings/${id}/status`, { status });
      setSightings(sightings.map(s => s.id === id ? { ...s, status } : s));
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to update sighting status.');
    }
  }

  async function toggleHistory(caseId) {
    const isExpanding = !expandedAudit[caseId];
    setExpandedAudit(prev => ({ ...prev, [caseId]: isExpanding }));
    if (isExpanding && !auditHistory[caseId]) {
      try {
        const r = await api.get(`/cases/${caseId}`);
        setAuditHistory(prev => ({ ...prev, [caseId]: r.data.sightings || [] }));
      } catch {
        setAuditHistory(prev => ({ ...prev, [caseId]: [] }));
      }
    }
  }

  async function toggleSightingAudit(id) {
    const isExpanding = !expandedAudit[id];
    setExpandedAudit(prev => ({ ...prev, [id]: isExpanding }));
    if (isExpanding && !auditHistory[id]) {
      try {
        const r = await api.get(`/sightings/${id}/audit`);
        setAuditHistory(prev => ({ ...prev, [id]: r.data }));
      } catch {
        setAuditHistory(prev => ({ ...prev, [id]: [] }));
      }
    }
  }

  // Get the current pending edit for a case, with defaults based on current status
  function getEdit(c) {
    return pendingEdits[c.id] ?? {
      review: '',
      found: c.status === 'found' ? 'found' : 'not_found',
    };
  }

  function setEdit(id, patch) {
    const current = cases.find(c => c.id === id);
    setPendingEdits(prev => ({
      ...prev,
      [id]: {
        review: '',
        found: current?.status === 'found' ? 'found' : 'not_found',
        ...(prev[id] ?? {}),
        ...patch,
      },
    }));
  }

  async function saveCard(c) {
    setActionError('');
    setSavingId(c.id);
    try {
      const edit = getEdit(c);

      // Step 1: approve / reject if selected
      if (edit.review === 'approve') {
        await api.post(`/cases/${c.id}/approve`);
      } else if (edit.review === 'reject') {
        await api.post(`/cases/${c.id}/reject`);
      }

      // Step 2: found / not_found (skip if rejecting)
      if (edit.review !== 'reject') {
        const baseStatus = edit.review === 'approve' ? 'active' : c.status;
        const targetStatus = edit.found === 'found' ? 'found' : baseStatus;
        if (targetStatus !== baseStatus || edit.found === 'found') {
          await api.patch(`/cases/${c.id}/status`, { status: targetStatus });
        }
      }

      // Refresh this card from server
      const updated = await api.get(`/cases/${c.id}`);
      setCases(prev => prev.map(x => x.id === c.id ? { ...x, ...updated.data } : x));
      // Clear pending edit for this card
      setPendingEdits(prev => { const n = { ...prev }; delete n[c.id]; return n; });
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to save changes.');
    }
    setSavingId(null);
  }

  function handleCaseReview(caseId, action) {
    if (action === 'approve') {
      approveCase(caseId);
    }
    if (action === 'reject') {
      rejectCase(caseId);
    }
  }

  async function handleFaceScan(e) {
    e.preventDefault();
    if (!scanImage) { setScanError('Please upload a photo to scan.'); return; }
    setScanError(''); setScanLoading(true); setScanResults(null);
    try {
      const fd = new FormData();
      fd.append('image', scanImage);
      const r = await api.post('/admin/scan-face', fd);
      setScanResults(r.data?.matches || []);
    } catch (err) {
      setScanError(err.response?.data?.message || 'Failed to scan photo.');
      setScanResults([]);
    }
    setScanLoading(false);
  }

  function formatDate(ts) {
    if (!ts) return '--';
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
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              {t('dash.cases')}
            </button>
            {user.role === 'admin' && (
              <button className={`db-nav-item ${activeTab === 'scan' ? 'active' : ''}`} onClick={() => setActiveTab('scan')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>
                {t('dash.scan')}
              </button>
            )}
            <button className={`db-nav-item ${activeTab === 'sightings' ? 'active' : ''}`} onClick={() => setActiveTab('sightings')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              {t('dash.sightings')}
            </button>
            <button className={`db-nav-item ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
              {t('dash.map')}
            </button>
          </nav>
          <div className="db-sidebar-stats">
            <div className="db-stat-row"><span>Total</span><b>{totalCases}</b></div>
            <div className="db-stat-row"><span>Active</span><b className="green">{activeCases}</b></div>
            <div className="db-stat-row"><span>Pending</span><b className="yellow">{pendingCases}</b></div>
            <div className="db-stat-row"><span>Found</span><b className="green">{foundCases}</b></div>
          </div>
          {stats && (
            <div className="db-admin-stats">
              <div className="db-stat-row"><span>Total Users</span><b>{stats.totalUsers}</b></div>
            </div>
          )}
          <Link className="btn full" to="/report" style={{ marginTop: 'auto' }}>+ {t('dash.report_btn')}</Link>
        </aside>

        {/* Main */}
        <main className="db-main">
          {actionError && (
            <div className="rc-error" style={{ marginBottom: 16 }}>{actionError}</div>
          )}

          {/* Cases Tab */}
          {activeTab === 'cases' && (
            <>
              <h2>{t('dash.cases')}</h2>
              {cases.length === 0 ? (
                <div className="db-empty">
                  <div className="db-empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <p>{t('dash.no_cases')}</p>
                  <Link className="btn" to="/report">{t('dash.report_btn')}</Link>
                </div>
              ) : (
                <div className="dc-card-grid">
                  {cases.map(c => (
                    <div key={c.id} className="dc-case-card-wrap">
                      <div className="dc-case-card">

                        {/* Photo */}
                        <div className="dc-card-photo">
                          <img src={c.images?.[0] || 'https://placehold.co/80x80?text=?'} alt={c.name} />
                        </div>

                        {/* Name + details */}
                        <div className="dc-card-header">
                          <Link to={`/cases/${c.id}`} className="dc-card-name">{c.name}</Link>
                          <span className={`badge ${c.status}`}>{c.status}</span>
                          <div className="dc-card-meta">
                            {c.age && <span>Age: <b>{c.age}</b></span>}
                            {c.gender && <span>{c.gender}</span>}
                            {c.height && <span>{c.height}</span>}
                          </div>
                          {c.description && (
                            <p className="dc-card-desc">{c.description.slice(0, 80)}{c.description.length > 80 ? '...' : ''}</p>
                          )}
                          {c.clothing && (
                            <p className="dc-card-desc" style={{ color: '#6b7280' }}>
                              Clothing: {c.clothing.slice(0, 60)}{c.clothing.length > 60 ? '...' : ''}
                            </p>
                          )}
                        </div>

                        {/* Info */}
                        <div className="dc-card-info">
                          <div className="dc-card-row">
                            <span className="dc-card-label">Last Seen</span>
                            <span className="dc-card-value">{c.last_seen_location || '--'}</span>
                          </div>
                          {c.last_seen_time && (
                            <div className="dc-card-row">
                              <span className="dc-card-label">When</span>
                              <span className="dc-card-value">{formatDate(c.last_seen_time)}</span>
                            </div>
                          )}
                          <div className="dc-card-row">
                            <span className="dc-card-label">Reporter</span>
                            <span className="dc-card-value">
                              {c.reporter_name || '--'}
                              {c.reporter_phone && <span className="muted"> · {c.reporter_phone}</span>}
                              {c.reporter_relation && <span className="muted"> ({c.reporter_relation})</span>}
                            </span>
                          </div>
                          {c.ai_verification_score != null && (
                            <div className="dc-card-row">
                              <span className="dc-card-label">AI Score</span>
                              <span className="dc-card-value">
                                <span className={`ai-score-badge ${c.ai_verification_score >= 80 ? 'ai-score-high' : c.ai_verification_score >= 50 ? 'ai-score-mid' : 'ai-score-low'}`}>
                                  {c.ai_verification_score}/100
                                </span>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="dc-card-actions">
                          {/* Approve / Reject dropdown — hide only for rejected/closed */}
                          {!['rejected', 'closed'].includes((c.status || '').toLowerCase()) && (
                            <select
                              value={getEdit(c).review}
                              onChange={e => setEdit(c.id, { review: e.target.value })}
                              className="db-status-select"
                              aria-label="Approve or reject"
                            >
                              <option value="">Approve / Reject</option>
                              <option value="approve">Approve</option>
                              <option value="reject">Reject</option>
                            </select>
                          )}
                          {/* Found / Not Found dropdown */}
                          <select
                            value={getEdit(c).found}
                            onChange={e => setEdit(c.id, { found: e.target.value })}
                            className="db-status-select"
                            aria-label="Found status"
                          >
                            <option value="found">Found</option>
                            <option value="not_found">Not Found</option>
                          </select>
                          {/* Save button */}
                          <button
                            className="btn small"
                            style={{ background: '#16a34a', color: '#fff', minWidth: 56 }}
                            onClick={() => saveCard(c)}
                            disabled={savingId === c.id}
                          >
                            {savingId === c.id ? '...' : 'Save'}
                          </button>
                          <button
                            className="db-mini-btn"
                            style={{ background: expandedAudit[c.id] ? '#e0f2fe' : '#f0f9ff', color: '#0369a1' }}
                            onClick={() => toggleHistory(c.id)}
                          >
                            History
                          </button>
                          {user.role === 'admin' && (
                            <button className="btn small danger" onClick={() => deleteCase(c.id)}>Delete</button>
                          )}
                        </div>
                      </div>

                      {/* Sighting History expand */}
                      {expandedAudit[c.id] && (
                        <div className="dc-history-panel">
                          <div className="dc-history-title">Sighting History — where this person was spotted</div>
                          {!auditHistory[c.id] ? (
                            <p className="muted" style={{ margin: '10px 0' }}>Loading...</p>
                          ) : auditHistory[c.id].length === 0 ? (
                            <p className="muted" style={{ margin: '10px 0' }}>No sightings reported yet for this person.</p>
                          ) : (
                            <div className="dc-history-list">
                              {auditHistory[c.id].map((s, i) => (
                                <div key={s.id || i} className="dc-history-item">
                                  {s.image_url && (
                                    <img src={s.image_url} alt="sighting" className="dc-history-img" />
                                  )}
                                  <div className="dc-history-body">
                                    <div className="dc-history-row">
                                      <span className={`badge ${s.status}`}>{s.status}</span>
                                      <span className="dc-history-conf">
                                        {s.confidence_level === 'sure' ? 'Sure' : s.confidence_level === 'maybe' ? 'Maybe' : 'Not sure'}
                                      </span>
                                      <span className="muted" style={{ fontSize: 12 }}>{formatDate(s.created_at)}</span>
                                    </div>
                                    <div className="dc-history-location">Location: {s.location_text || 'Not specified'}</div>
                                    <div className="dc-history-desc">{s.description}</div>
                                    {(s.reporter_name || s.reporter_phone) && (
                                      <div className="muted" style={{ fontSize: 12 }}>
                                        Witness: {s.reporter_name || 'Anonymous'}{s.reporter_phone ? ` · ${s.reporter_phone}` : ''}
                                      </div>
                                    )}
                                    {s.status === 'pending' && (
                                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                        <button className="db-mini-btn verify" onClick={() => approveSighting(s.id)}>Approve</button>
                                        <button className="db-mini-btn reject" onClick={() => rejectSighting(s.id)}>Reject</button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Sightings Tab */}
          {activeTab === 'sightings' && (
            <>
              <h2>{t('dash.sightings')}</h2>
              {sightings.length === 0 ? (
                <div className="db-empty">
                  <div className="db-empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </div>
                  <p>{t('dash.no_sightings')}</p>
                </div>
              ) : (
                <div className="dc-card-grid">
                  {sightings.map(s => (
                    <div key={s.id} className="dc-case-card-wrap">
                      <div className="dc-case-card">
                        {s.image_url && (
                          <div className="dc-card-photo">
                            <img src={s.image_url} alt="sighting" />
                          </div>
                        )}
                        <div className="dc-card-header">
                          <span className="dc-card-name" style={{ cursor: 'default' }}>{s.person_name || '--'}</span>
                          <span className={`badge ${s.status}`}>{s.status}</span>
                          <div className="dc-card-meta">
                            <span>{s.confidence_level === 'sure' ? 'Sure' : s.confidence_level === 'maybe' ? 'Maybe' : 'Not sure'}</span>
                          </div>
                          <p className="dc-card-desc">{s.description?.slice(0, 100)}{s.description?.length > 100 ? '...' : ''}</p>
                        </div>
                        <div className="dc-card-info">
                          <div className="dc-card-row">
                            <span className="dc-card-label">Location</span>
                            <span className="dc-card-value">{s.location_text || '--'}</span>
                          </div>
                          <div className="dc-card-row">
                            <span className="dc-card-label">Witness</span>
                            <span className="dc-card-value">
                              {s.reporter_name || 'Anonymous'}
                              {s.reporter_phone && <span className="muted"> · {s.reporter_phone}</span>}
                            </span>
                          </div>
                          <div className="dc-card-row">
                            <span className="dc-card-label">Submitted</span>
                            <span className="dc-card-value">{formatDate(s.created_at)}</span>
                          </div>
                        </div>
                        <div className="dc-card-actions">
                          {s.status === 'pending' ? (
                            <>
                              <button className="db-mini-btn verify" onClick={() => approveSighting(s.id)}>Approve</button>
                              <button className="db-mini-btn reject" onClick={() => rejectSighting(s.id)}>Reject</button>
                            </>
                          ) : (
                            <select value={s.status} onChange={e => updateSighting(s.id, e.target.value)} className="db-status-select">
                              {['pending', 'verified', 'rejected'].map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          )}
                          <button
                            className="db-mini-btn"
                            style={{ background: '#f0f4ff', color: '#3b5bdb' }}
                            onClick={() => toggleSightingAudit(s.id)}
                          >
                            Audit
                          </button>
                        </div>
                      </div>

                      {expandedAudit[s.id] && (
                        <div className="dc-history-panel">
                          <div className="dc-history-title">Audit History</div>
                          {!auditHistory[s.id] ? (
                            <p className="muted" style={{ margin: '8px 0' }}>Loading...</p>
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
                                  {entry.notes && <div className="db-audit-notes muted">{entry.notes}</div>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Scan Tab */}
          {activeTab === 'scan' && user.role === 'admin' && (
            <>
              <h2>{t('dash.scan')}</h2>
              <p className="muted" style={{ marginTop: -6, marginBottom: 18 }}>{t('dash.scan_sub')}</p>
              <section className="panel" style={{ marginBottom: 20 }}>
                <form className="form-grid" onSubmit={handleFaceScan}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>{t('dash.scan_upload')}</label>
                    <input type="file" accept="image/*" onChange={e => setScanImage(e.target.files?.[0] || null)} />
                  </div>
                  {scanError && <div className="rc-error" style={{ marginTop: 0 }}>{scanError}</div>}
                  <button type="submit" className="btn" disabled={scanLoading} style={{ width: 'fit-content' }}>
                    {scanLoading ? t('dash.scan_scanning') : t('dash.scan_submit')}
                  </button>
                </form>
              </section>
              {scanResults !== null && (
                <section className="panel">
                  <div className="row between" style={{ marginBottom: 12, alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>{t('dash.scan_results')}</h3>
                    <span className="muted" style={{ fontSize: 13 }}>{scanResults.length} matches</span>
                  </div>
                  {scanResults.length === 0 ? (
                    <p className="muted" style={{ margin: 0 }}>{t('dash.scan_no_results')}</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                      {scanResults.map(result => (
                        <div key={result.case_id} className="case-card">
                          <img src={result.image_url} alt={result.name} />
                          <div className="case-body">
                            <div className="row between" style={{ marginBottom: 8 }}>
                              <h3 style={{ margin: 0 }}>{result.name}</h3>
                              <span className={`badge ${result.status}`}>{result.score}%</span>
                            </div>
                            <p style={{ margin: '0 0 6px' }}><b>Age:</b> {result.age || '--'}</p>
                            <p style={{ margin: '0 0 6px' }}><b>Gender:</b> {result.gender || '--'}</p>
                            <p style={{ margin: 0 }}><b>Last seen:</b> {result.last_seen_location || '--'}</p>
                            <div style={{ marginTop: 14 }}>
                              <Link className="btn outline" to={`/cases/${result.case_id}`} style={{ display: 'block', textAlign: 'center' }}>
                                View Case
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          {/* Map Tab */}
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
