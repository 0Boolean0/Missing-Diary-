import { Link } from 'react-router-dom';

const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconEye = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

export default function PoliceCaseCard({ item, onStatusUpdate }) {
  const img = item.images?.[0] || 'https://placehold.co/300x240?text=No+Photo';
  const statusLabel = item.status === 'active' ? 'Active' : item.status === 'found' ? 'Found' : item.status;

  return (
    <div className="case-card">
      <img src={img} alt={item.name} />
      <div className="case-body">
        <div className="row between" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>{item.name}</h3>
          <span className={`badge ${item.status}`}>{statusLabel}</span>
        </div>
        <p>Age: {item.age || 'Unknown'}</p>
        <p>Last seen: {item.last_seen_location}</p>
        <div className="row gap" style={{ marginTop: 14, flexWrap: 'wrap' }}>
          <button
            onClick={() => onStatusUpdate(item.id, 'found')}
            style={{ flex: 1, fontSize: 13, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <IconCheck /> Found
          </button>
          <button
            className="btn outline"
            onClick={() => onStatusUpdate(item.id, 'active')}
            style={{ flex: 1, fontSize: 13, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <IconSearch /> Not Found
          </button>
        </div>
        <div style={{ marginTop: 8 }}>
          <Link
            className="btn"
            to={`/cases/${item.id}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--green)', fontSize: 13, padding: '8px 12px' }}
          >
            <IconEye /> View Details
          </Link>
        </div>
      </div>
    </div>
  );
}
