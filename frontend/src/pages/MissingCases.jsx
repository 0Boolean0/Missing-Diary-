import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CaseCard from '../components/CaseCard';
import MapView from '../components/MapView';
import { api } from '../api/client';
import { useLang } from '../context/LangContext';

const STATUSES = ['all', 'active', 'verified', 'pending', 'found', 'closed'];
const GENDERS  = ['All Genders', 'Male', 'Female'];

// Derive unique districts from cases
function getDistricts(cases) {
  const set = new Set();
  cases.forEach(c => {
    if (c.last_seen_location) {
      // take last comma-separated segment as a rough district label
      const parts = c.last_seen_location.split(',');
      const last = parts[parts.length - 1]?.trim();
      if (last) set.add(last);
    }
  });
  return ['All Districts', ...Array.from(set).sort()];
}

export default function MissingCases() {
  const [cases, setCases]           = useState([]);
  const [searchParams]              = useSearchParams();
  const [search, setSearch]         = useState(searchParams.get('q') || '');
  const [status, setStatus]         = useState('all');
  const [gender, setGender]         = useState('All Genders');
  const [district, setDistrict]     = useState('All Districts');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView]             = useState('grid');
  const { t } = useLang();

  useEffect(() => {
    api.get('/cases').then(r => setCases(r.data)).catch(() => setCases([]));
  }, []);

  const districts = getDistricts(cases);

  const filtered = cases.filter(c => {
    const matchSearch = [c.name, c.last_seen_location, c.gender, String(c.age || ''), c.case_id || '']
      .join(' ').toLowerCase().includes(search.toLowerCase());
    const matchStatus   = status === 'all' || c.status === status;
    const matchGender   = gender === 'All Genders' || c.gender?.toLowerCase() === gender.toLowerCase();
    const matchDistrict = district === 'All Districts' ||
      c.last_seen_location?.toLowerCase().includes(district.toLowerCase());
    return matchSearch && matchStatus && matchGender && matchDistrict;
  });

  const markers = filtered.map(c => ({
    lat: c.last_seen_lat, lng: c.last_seen_lng,
    title: c.name, description: c.last_seen_location
  }));

  return (
    <>
      <Navbar />
      <main className="container">

        {/* ── Header ── */}
        <div className="mc-header">
          <div>
            <h1 className="mc-title">{t('cases.title')}</h1>
            <p className="mc-subtitle">
              Search through <strong>{cases.length}</strong> active cases. Submit sightings to help reunite families.
            </p>
          </div>
          {/* View toggle */}
          <div className="mc-view-toggle">
            <button
              className={`mc-view-btn ${view === 'grid' ? 'active' : ''}`}
              onClick={() => setView('grid')}
              aria-label="Grid view"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
                <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
                <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor"/>
                <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor"/>
              </svg>
              Grid
            </button>
            <button
              className={`mc-view-btn ${view === 'map' ? 'active' : ''}`}
              onClick={() => setView('map')}
              aria-label="Map view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-10l6-3m0 13l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 10m0 3V7"/>
              </svg>
              Map
            </button>
          </div>
        </div>

        {/* ── Search bar ── */}
        <div className="mc-search-wrap">
          <div className="mc-search-box">
            <svg className="mc-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              className="mc-search-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, case ID, or location..."
            />
            {search && (
              <button className="mc-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
          <button
            className={`mc-filter-btn ${filtersOpen ? 'active' : ''}`}
            onClick={() => setFiltersOpen(o => !o)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filters
            {(status !== 'all' || gender !== 'All Genders' || district !== 'All Districts') && (
              <span className="mc-filter-dot" />
            )}
          </button>
        </div>

        {/* ── Expanded filter dropdowns ── */}
        {filtersOpen && (
          <div className="mc-filter-row">
            <select
              className="mc-select"
              value={district}
              onChange={e => setDistrict(e.target.value)}
            >
              {districts.map(d => <option key={d}>{d}</option>)}
            </select>

            <select
              className="mc-select"
              value={status === 'all' ? 'All Status' : status}
              onChange={e => setStatus(e.target.value === 'All Status' ? 'all' : e.target.value)}
            >
              <option>All Status</option>
              {STATUSES.filter(s => s !== 'all').map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>

            <select
              className="mc-select"
              value={gender}
              onChange={e => setGender(e.target.value)}
            >
              {GENDERS.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
        )}

        {/* ── Count ── */}
        <p className="mc-count">Showing {filtered.length} of {cases.length} cases</p>

        {/* ── Grid ── */}
        {view === 'grid' && (
          filtered.length === 0
            ? <div className="db-empty"><div className="db-empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg></div><p>{t('cases.no_cases')}</p></div>
            : <div className="mun-cards-grid">{filtered.map(c => <CaseCard item={c} key={c.id} />)}</div>
        )}

        {/* ── Map ── */}
        {view === 'map' && <MapView markers={markers} height={520} />}

      </main>
    </>
  );
}
