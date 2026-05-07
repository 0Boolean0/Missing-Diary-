import { Link } from 'react-router-dom';

const STATUS_ICONS = {
  pending: '⏳',
  verified: '✅',
  active: '🔴',
  found: '🏠',
  closed: '📁',
  rejected: '❌',
};

export default function CaseCard({ item }) {
<<<<<<< Updated upstream
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
        <div className="row gap" style={{ marginTop: 14 }}>
          <Link
            className="btn"
            to={`/cases/${item.id}`}
            style={{ flex: 1, textAlign: 'center', background: 'var(--green)', fontSize: 13, padding: '8px 12px' }}
          >
            View Details
          </Link>
          <Link
            className="btn outline"
            to={`/sighting/${item.id}`}
            style={{ flex: 1, textAlign: 'center', fontSize: 13, padding: '8px 12px' }}
          >
            I Saw Them
          </Link>
=======
  const img = item.images?.[0] || 'https://placehold.co/400x300?text=Missing+Person';
  const icon = STATUS_ICONS[item.status] || '📋';

  return (
    <div className="case-card">
      <div className="case-card-img-wrap">
        <img src={img} alt={item.name} loading="lazy" />
        <span className={`badge ${item.status} case-card-badge`}>
          {icon} {item.status}
        </span>
      </div>
      <div className="case-body">
        <h3>{item.name}</h3>
        <p className="case-meta">
          <span>🎂 Age: {item.age || 'Unknown'}</span>
          {item.gender && <span> · {item.gender}</span>}
        </p>
        <p className="case-location">📍 {item.last_seen_location || 'Location unknown'}</p>
        <div className="case-card-actions">
          <Link className="btn small" to={`/cases/${item.id}`}>View Details</Link>
          <Link className="btn small outline" to={`/sighting/${item.id}`}>I Saw Them</Link>
>>>>>>> Stashed changes
        </div>
      </div>
    </div>
  );
}
