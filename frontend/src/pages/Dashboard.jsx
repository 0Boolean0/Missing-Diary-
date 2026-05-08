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
  const [auditHistory, setAuditHistory] = useState({});
  const [expandedAudit, setExpandedAudit] = useState({});
  const [scanImage, setScanImage] = useState(null);
  const [scanResults, setScanResults] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');
  const [pendingEdits, setPendingEdits] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [editingIds, setEditingIds] = useState({});
  // Req 4: found-photo upload state — keyed by case id
  const [foundUploadOpen, setFoundUploadOpen] = useState({});
  const [foundUploadFile, setFoundUploadFile] = useState({});
  const [foundUploadError, setFoundUploadError] = useState({});
  const [foundUploading, setFoundUploading] = useState({});
  // Req 2.3: notification banner
  const [notifications, setNotifications] = useState([]);

  if (!user) return null;

  useEffect(() => {
    const endpoint = ['admin', 'police'].includes(user.role) ? '/cases' : '/cases?mine=true';
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
    // Req 2.2: fetch notifications for the current user
    api.get('/notifications')
      .then(r => setNotifications(r.data || []))
      .catch(() => {});
  }, [user.role]);

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

  function getEdit(c) {
    return pendingEdits[c.id] ?? {
      review: '',
      found: c.status === 'found' ? 'found' : c.status === 'closed' ? 'closed' : 'not_found',
      closeReason: '',
    };
  }

  function setEdit(id, patch) {
    const current = cases.find(c => c.id === id);
    setPendingEdits(prev => ({
      ...prev,
      [id]: {
        review: '',
        found: current?.status === 'found' ? 'found' : 'not_found',
        closeReason: '',
        ...(prev[id] ?? {}),
        ...patch,
      },
    }));
  }

  async function saveCard(c) {
    setActionError('');

    const edit = getEdit(c);

    // Enforce close reason
    if (edit.found === 'closed' && !edit.closeReason?.trim()) {
      setActionError('Please provide a reason for closing this case.');
      return;
    }

    setSavingId(c.id);
    try {
      let newStatus = c.status;

      if (edit.review === 'approve') {
        await api.post(`/cases/${c.id}/approve`);
        newStatus = 'active';
        if (edit.found === 'found') {
          await api.patch(`/cases/${c.id}/status`, { status: 'found' });
          newStatus = 'found';
        } else if (edit.found === 'closed') {
          await api.patch(`/cases/${c.id}/status`, { status: 'closed', notes: edit.closeReason });
          newStatus = 'closed';
        }
      } else if (edit.review === 'reject') {
        await api.post(`/cases/${c.id}/reject`);
        newStatus = 'rejected';
      } else {
        const targetStatus = edit.found === 'found' ? 'found' : edit.found === 'closed' ? 'closed' : c.status;
        if (targetStatus !== c.status) {
          await api.patch(`/cases/${c.id}/status`, {
            status: targetStatus,
            ...(targetStatus === 'closed' ? { notes: edit.closeReason } : {}),
          });
          newStatus = targetStatus;
        }
      }

      setCases(prev => prev.map(x => x.id === c.id ? { ...x, status: newStatus } : x));
      setPendingEdits(prev => { const n = { ...prev }; delete n[c.id]; return n; });
      setEditingIds(prev => { const n = { ...prev }; delete n[c.id]; return n; });
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to save changes.');
    }
    setSavingId(null);
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

  // Req 4.3 / 4.4 / 4.5: submit found-person photo for a case
  async function submitFoundPhoto(caseId) {
    const file = foundUploadFile[caseId];
    if (!file) {
      setFoundUploadError(prev => ({ ...prev, [caseId]: 'Please select a photo before submitting' }));
      return;
    }
    setFoundUploadError(prev => ({ ...prev, [caseId]: '' }));
    setFoundUploading(prev => ({ ...prev, [caseId]: true }));
    try {
      const fd = new FormData();
      fd.append('image', file);
      await api.post(`/cases/${caseId}/found-photo`, fd);
      // Update local state: mark case as found, close upload form
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, status: 'found' } : c));
      setFoundUploadOpen(prev => ({ ...prev, [caseId]: false }));
      setFoundUploadFile(prev => { const n = { ...prev }; delete n[caseId]; return n; });
    } catch (err) {
      setFoundUploadError(prev => ({
        ...prev,
        [caseId]: err.response?.data?.message || 'Failed to upload photo.',
      }));
    }
    setFoundUploading(prev => ({ ...prev, [caseId]: false }));
  }

  // Req 2.3: dismiss a notification banner
  async function dismissNotification(notifId) {
    try {
      await api.patch(`/notifications/${notifId}/read`);
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    } catch {
      // silently ignore
    }
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
  const pendingCount = cases.filter(c => c.status === 'pending').length;
  const foundCases = cases.filter(c => c.status === 'found').length;
  const isAdminOrPolice = ['admin', 'police'].includes(user.role);

  return (
    <>
      <Navbar />
      <div className="db-wrapper">
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
              {t('dash.cases')}
            </button>
            {user.role === 'admin' && (
              <button className={`db-nav-item ${activeTab === 'scan' ? 'active' : ''}`} onClick={() => setActiveTab('scan')}>
                {t('dash.scan')}
              </button>
            )}
            {isAdminOrPolice && (
              <button className={`db-nav-item ${activeTab === 'sightings' ? 'active' : ''}`} onClick={() => setActiveTab('sightings')}>
                {t('dash.sightings')}
              </button>
            )}
            <button className={`db-nav-item ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
              {t('dash.map')}
            </button>
          </nav>
          <div className="db-sidebar-stats">
            <div className="db-stat-row"><span>Total</span><b>{totalCases}</b></div>
            <div className="db-stat-row"><span>Active</span><b className="green">{activeCases}</b></div>
            <div className="db-stat-row"><span>Pending</span><b className="yellow">{pendingCount}</b></div>
            <div className="db-stat-row"><span>Found</span><b className="green">{foundCases}</b></div>
          </div>
          {stats && (
            <div className="db-admin-stats">
              <div className="db-stat-row"><span>Total Users</span><b>{stats.totalUsers}</b></div>
            </div>
          )}
          <Link className="btn full" to="/report" style={{ marginTop: 'auto' }}>+ {t('dash.report_btn')}</Link>
        </aside>

        <main className="db-main">
          {actionError && (
            <div className="rc-error" style={{ marginBottom: 16 }}>{actionError}</div>
          )}

          {/* Req 2.3: notification banner for unread found_person_photo notifications */}
          {notifications.filter(n => !n.read && n.type === 'found_person_photo').map(n => (
            <div
              key={n.id}
              className="panel"
              style={{
                marginBottom: 12,
                padding: '14px 18px',
                background: '#fef9c3',
                border: '1.5px solid #fbbf24',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: '#92400e' }}>
                📷 {n.message}
                {n.case_id && (
                  <Link
                    to={`/cases/${n.case_id}`}
                    style={{ marginLeft: 10, color: '#b45309', textDecoration: 'underline' }}
                  >
                    View Case →
                  </Link>
                )}
              </span>
              <button
                className="db-mini-btn"
                style={{ flexShrink: 0, background: '#fde68a', color: '#78350f', border: 'none' }}
                onClick={() => dismissNotification(n.id)}
              >
                Dismiss
              </button>
            </div>
          ))}

          {activeTab === 'cases' && (
            <>
              <h2>{t('dash.cases')}</h2>
              {cases.length === 0 ? (
                <div className="db-empty">
                  <p>{t('dash.no_cases')}</p>
                  <Link className="btn" to="/report">{t('dash.report_btn')}</Link>
                </div>
              ) : (
                <div className="dc-card-grid">
                  {cases.map(c => (
                    <div key={c.id} className="dc-case-card-wrap">
                      <div className="dc-case-card">
                        <div className="dc-card-photo">
                          <img src={c.images?.[0] || 'https://placehold.co/80x80?text=?'} alt={c.name} />
                        </div>
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
                        </div>
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
                        {isAdminOrPolice && (
                          <div className="dc-card-actions">
                            {editingIds[c.id] ? (
                              <>
                                {/* Dropdown 1: Approve / Reject — admin only */}
                                {user.role === 'admin' && (
                                  <select
                                    value={getEdit(c).review}
                                    onChange={e => setEdit(c.id, { review: e.target.value })}
                                    className="db-status-select"
                                    aria-label="Approve or reject"
                                  >
                                    <option value="">Approve / Reject</option>
                                    <option value="approve">✓ Approve</option>
                                    <option value="reject">✗ Reject</option>
                                  </select>
                                )}

                                {/* Dropdown 2: Found status — admin & police */}
                                <select
                                  value={getEdit(c).found}
                                  onChange={e => setEdit(c.id, { found: e.target.value })}
                                  className="db-status-select"
                                  aria-label="Found status"
                                >
                                  <option value="not_found">Not Found</option>
                                  <option value="found">Found</option>
                                  <option value="closed">Closed</option>
                                </select>

                                {/* Close reason — required when "closed" is selected */}
                                {getEdit(c).found === 'closed' && (
                                  <textarea
                                    value={getEdit(c).closeReason || ''}
                                    onChange={e => setEdit(c.id, { closeReason: e.target.value })}
                                    className="db-status-select"
                                    placeholder="Reason for closing (required)..."
                                    rows={3}
                                    style={{ resize: 'vertical', fontSize: 13 }}
                                    required
                                  />
                                )}

                                <div className="dc-card-actions-btns">
                                  <button
                                    className="btn small"
                                    style={{ background: '#16a34a', color: '#fff', borderRadius: 999, padding: '8px 18px' }}
                                    onClick={() => saveCard(c)}
                                    disabled={savingId === c.id}
                                  >
                                    {savingId === c.id ? '...' : 'Save'}
                                  </button>
                                  <button
                                    className="db-mini-btn"
                                    style={{ background: '#f3f4f6', color: '#374151' }}
                                    onClick={() => {
                                      setEditingIds(prev => { const n = { ...prev }; delete n[c.id]; return n; });
                                      setPendingEdits(prev => { const n = { ...prev }; delete n[c.id]; return n; });
                                    }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    className="db-mini-btn"
                                    style={{ background: expandedAudit[c.id] ? '#e0f2fe' : '#f0f9ff', color: '#0369a1' }}
                                    onClick={() => toggleHistory(c.id)}
                                  >
                                    History
                                  </button>
                                  {user.role === 'admin' && (
                                    <button className="btn small danger" style={{ borderRadius: 999, padding: '8px 18px' }} onClick={() => deleteCase(c.id)}>Delete</button>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="dc-card-actions-btns">
                                <button
                                  className="db-mini-btn"
                                  style={{ background: '#eff6ff', color: '#1d4ed8' }}
                                  onClick={() => setEditingIds(prev => ({ ...prev, [c.id]: true }))}
                                >
                                  ✎ Edit
                                </button>
                                <button
                                  className="db-mini-btn"
                                  style={{ background: expandedAudit[c.id] ? '#e0f2fe' : '#f0f9ff', color: '#0369a1' }}
                                  onClick={() => toggleHistory(c.id)}
                                >
                                  History
                                </button>
                                {/* Req 4.1 / 4.6: Mark as Found button or View Found Photo link */}
                                {c.status !== 'found' ? (
                                  <button
                                    className="db-mini-btn"
                                    style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700 }}
                                    onClick={() => setFoundUploadOpen(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                                  >
                                    📷 Mark as Found
                                  </button>
                                ) : (
                                  <Link
                                    to={`/cases/${c.id}`}
                                    className="db-mini-btn"
                                    style={{ background: '#f0fdf4', color: '#16a34a', textDecoration: 'none', display: 'inline-block' }}
                                  >
                                    🔍 View Found Photo
                                  </Link>
                                )}
                                {user.role === 'admin' && (
                                  <button className="btn small danger" style={{ borderRadius: 999, padding: '8px 18px' }} onClick={() => deleteCase(c.id)}>Delete</button>
                                )}
                              </div>
                            )}
                            {/* Req 4.2 / 4.3 / 4.4 / 4.5: inline upload form */}
                            {foundUploadOpen[c.id] && c.status !== 'found' && (
                              <div style={{ marginTop: 12, padding: '14px 16px', background: '#f0fdf4', borderRadius: 10, border: '1.5px solid #86efac' }}>
                                <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 14, color: '#15803d' }}>
                                  Upload Found-Person Photo
                                </p>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  style={{ display: 'block', marginBottom: 8 }}
                                  onChange={e => {
                                    setFoundUploadFile(prev => ({ ...prev, [c.id]: e.target.files?.[0] || null }));
                                    setFoundUploadError(prev => ({ ...prev, [c.id]: '' }));
                                  }}
                                />
                                {foundUploadError[c.id] && (
                                  <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 8px' }}>
                                    {foundUploadError[c.id]}
                                  </p>
                                )}
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button
                                    className="btn small"
                                    style={{ background: '#16a34a', color: '#fff', borderRadius: 999, padding: '7px 16px' }}
                                    disabled={foundUploading[c.id]}
                                    onClick={() => submitFoundPhoto(c.id)}
                                  >
                                    {foundUploading[c.id] ? 'Uploading...' : 'Submit'}
                                  </button>
                                  <button
                                    className="db-mini-btn"
                                    style={{ background: '#f3f4f6', color: '#374151' }}
                                    onClick={() => {
                                      setFoundUploadOpen(prev => ({ ...prev, [c.id]: false }));
                                      setFoundUploadError(prev => ({ ...prev, [c.id]: '' }));
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {expandedAudit[c.id] && (
                        <div className="dc-history-panel">
                          <div className="dc-history-title">Sighting History</div>
                          {!auditHistory[c.id] ? (
                            <p className="muted">Loading...</p>
                          ) : auditHistory[c.id].length === 0 ? (
                            <p className="muted">No sightings reported yet.</p>
                          ) : (
                            <div className="dc-history-list">
                              {auditHistory[c.id].map((s, i) => (
                                <div key={s.id || i} className="dc-history-item">
                                  {s.image_url && <img src={s.image_url} alt="sighting" className="dc-history-img" />}
                                  <div className="dc-history-body">
                                    <div className="dc-history-row">
                                      <span className={`badge ${s.status}`}>{s.status}</span>
                                      <span className="muted" style={{ fontSize: 12 }}>{formatDate(s.created_at)}</span>
                                    </div>
                                    <div className="dc-history-location">Location: {s.location_text || 'Not specified'}</div>
                                    <div className="dc-history-desc">{s.description}</div>
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

          {activeTab === 'sightings' && isAdminOrPolice && (
            <>
              <h2>{t('dash.sightings')}</h2>
              {sightings.length === 0 ? (
                <div className="db-empty">
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
                            <p className="muted">Loading...</p>
                          ) : auditHistory[s.id].length === 0 ? (
                            <p className="muted">No audit records yet.</p>
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
