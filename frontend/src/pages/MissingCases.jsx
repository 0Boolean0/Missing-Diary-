import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CaseCard from '../components/CaseCard';
import MapView from '../components/MapView';
import { api } from '../api/client';

const STATUSES = ['all', 'active', 'verified', 'pending', 'found', 'closed'];

export default function MissingCases() {
  const [cases, setCases] = useState([]);
  const [searchParams] = useSearchParams();
  // Fix #23: read ?q= param passed from the Home page search bar
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState('all');
  const [view, setView] = useState('grid'); // grid | map

  useEffect(() => {
    api.get('/cases').then(r => setCases(r.data)).catch(() => setCases([]));
  }, []);

  const filtered = cases.filter(c => {
    const matchSearch = [c.name, c.last_seen_location, c.gender, String(c.age || '')]
      .join(' ').toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === 'all' || c.status === status;
    return matchSearch && matchStatus;
  });

  const markers = filtered.map(c => ({
    lat: c.last_seen_lat, lng: c.last_seen_lng,
    title: c.name, description: c.last_seen_location
  }));

  return (
    <>
      <Navbar />
      <main className="container">
        {/* Header */}
        <div className="cases-header">
          <div>
            <h1>Missing Cases</h1>
            <p className="muted">Search through {cases.length} active cases. Submit sightings to help reunite families.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="cases-filters">
          <input
            className="cases-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search by name, age, location..."
          />
          <div className="cases-status-tabs">
            {STATUSES.map(s => (
              <button
                key={s}
                className={`status-tab ${status === s ? 'active' : ''}`}
                onClick={() => setStatus(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="cases-view-toggle">
            <button className={`view-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}>⊞ Grid</button>
            <button className={`view-btn ${view === 'map' ? 'active' : ''}`} onClick={() => setView('map')}>🗺 Map</button>
          </div>
        </div>

        <div className="cases-count">Showing {filtered.length} of {cases.length} cases</div>

        {/* Grid View */}
        {view === 'grid' && (
          filtered.length === 0
            ? <div className="db-empty"><div className="db-empty-icon">📭</div><p>No cases found</p></div>
            : <div className="grid cards">{filtered.map(c => <CaseCard item={c} key={c.id} />)}</div>
        )}

        {/* Map View */}
        {view === 'map' && (
          <MapView markers={markers} height={520} />
        )}
      </main>
    </>
  );
}
