import { Link } from 'react-router-dom';

export default function CaseCard({ item }) {
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
        </div>
      </div>
    </div>
  );
}
