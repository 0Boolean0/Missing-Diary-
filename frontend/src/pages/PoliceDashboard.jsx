import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import PoliceCaseCard from '../components/PoliceCaseCard';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const IconClipboard = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

const IconAlert = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const IconInbox = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
    <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
  </svg>
);

export default function PoliceDashboard() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    api.get('/cases')
      .then(r => setCases(r.data))
      .catch(err => console.error('Failed to load cases:', err));
  }, []);

  async function handleStatusUpdate(id, status) {
    setActionError('');
    try {
      await api.patch(`/cases/${id}/status`, { status });
      setCases(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to update status');
    }
  }

  return (
    <>
      <Navbar />
      <div className="db-wrapper">
        {/* Sidebar — police-only */}
        <aside className="db-sidebar">
          <div className="db-sidebar-header">
            <div className="db-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div>
              <div className="db-username">{user?.name}</div>
              <div className="db-role-badge">{user?.role}</div>
            </div>
          </div>
          <nav className="db-nav">
            <div className="db-nav-item active">
              <IconClipboard /> Cases
            </div>
          </nav>
          <div className="db-sidebar-stats">
            <div className="db-stat-row">
              <span>Active Cases</span>
              <b className="green">{cases.length}</b>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="db-main">
          <div className="db-header">
            <div>
              <h1 className="db-title">Active Cases</h1>
              <p className="db-subtitle">Missing persons under active investigation</p>
            </div>
          </div>

          {actionError && (
            <div
              role="alert"
              style={{
                background: 'var(--red-light)',
                border: '1px solid var(--red)',
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                color: 'var(--red-dark)',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconAlert /> {actionError}
              </span>
              <button
                onClick={() => setActionError('')}
                aria-label="Dismiss error"
                style={{ background: 'transparent', border: 'none', color: 'var(--red-dark)', cursor: 'pointer', fontSize: 18, padding: '0 4px', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>
          )}

          {cases.length === 0 ? (
            <div className="db-empty">
              <div className="db-empty-icon"><IconInbox /></div>
              <p>No active cases assigned</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {cases.map(item => (
                <PoliceCaseCard
                  key={item.id}
                  item={item}
                  onStatusUpdate={handleStatusUpdate}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
