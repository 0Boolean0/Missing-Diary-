import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import ActionButtons from '../components/ActionButtons';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { api } from '../api/client';
<<<<<<< HEAD
import PoliceDashboard from '../pages/PoliceDashboard';
=======
import { useLanguage } from '../context/LanguageContext';
>>>>>>> d090232e24ad7bf8a46350024742f09d0479363e

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
<<<<<<< HEAD
    api.get('/cases').then(r => setCases(r.data)).catch(() => {});
    api.get('/sightings').then(r => setSightings(r.data)).catch(() => {});
    api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);
=======
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
>>>>>>> d090232e24ad7bf8a46350024742f09d0479363e

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
    if (!window.confirm('Delete this case? This cannot be undone.')) return;
    setActionError('');
    try {
      await api.delete(`/cases/${id}`);
      setCases(cases.filter(c => c.id !== id));
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to delete case.');
    }
  }

<<<<<<< HEAD
=======
<<<<<<< Updated upstream
  // Task 19.1 — Dedicated pending-case action handlers
>>>>>>> d090232e24ad7bf8a46350024742f09d0479363e
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

<<<<<<< HEAD
=======
<<<<<<< Updated upstream
  const isAdminOrPolice = ['admin', 'police'].includes(user.role);
=======
  const pendingSightings = sightings.filter(s => s.status === 'pending');
>>>>>>> Stashed changes

>>>>>>> d090232e24ad7bf8a46350024742f09d0479363e
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
          {stats && (
            <div className="db-admin-stats">
              <div className="db-stat-row"><span>Total Users</span><b>{stats.totalUsers}</b></div>
            </div>
          )}
          <Link className="btn full" to="/report" style={{ marginTop: 'auto' }}>+ {t('dash.report_btn')}</Link>
        </aside>

        {/* Main */}
        <main className="db-main">
<<<<<<< Updated upstream
          {actionError && (
<<<<<<< HEAD
            <div className="rc-error" style={{ marginBottom: 16 }}>{actionError}</div>
=======
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
>>>>>>> d090232e24ad7bf8a46350024742f09d0479363e
          )}

          {/* Cases Tab */}
          {activeTab === 'cases' && (
<<<<<<< Updated upstream
            <>
              <h2>{t('dash.cases')}</h2>
              {cases.length === 0 ? (
                <div className="db-empty">
                  <div className="db-empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
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
<<<<<<< HEAD
                <div className="dc-card-grid">
                  {cases.map(c => (
                    <div key={c.id} className="dc-case-card-wrap">
                      <div className="dc-case-card">
=======
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
>>>>>>> d090232e24ad7bf8a46350024742f09d0479363e

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

<<<<<<< HEAD
          {/* Sightings Tab */}
=======
<<<<<<< Updated upstream
          {/* ── Sightings Tab ── */}
>>>>>>> d090232e24ad7bf8a46350024742f09d0479363e
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
                  <div className="db-empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </div>
                  <p>{t('dash.no_sightings')}</p>
                </div>
              ) : (
<<<<<<< HEAD
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
=======
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
>>>>>>> d090232e24ad7bf8a46350024742f09d0479363e
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
