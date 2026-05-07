import { Link } from 'react-router-dom';

// Inline SVG icons — no emoji
const IconPin = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconClock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconDownload = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

export default function CaseCard({ item }) {
  const img = item.images?.[0] || 'https://placehold.co/400x500?text=No+Photo';

  const dateStr = item.created_at
    ? new Date(item.created_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
      })
    : null;

  const caseId = item.case_id || (item.id ? `CASE-${String(item.id).slice(0, 8).toUpperCase()}` : null);

  const genderLabel = item.gender
    ? item.gender.charAt(0).toUpperCase() + item.gender.slice(1).toLowerCase()
    : null;

  return (
    <div className="mun-card">
      <Link to={`/cases/${item.id}`} className="mun-card-photo-wrap" aria-label={`View ${item.name}`}>
        <img src={img} alt={item.name} className="mun-card-photo" />
        {caseId && <span className="mun-card-id">{caseId}</span>}
      </Link>

      <div className="mun-card-body">
        <Link to={`/cases/${item.id}`} className="mun-card-name-link">
          <h3 className="mun-card-name">{item.name}</h3>
        </Link>

        {(item.age != null || genderLabel) && (
          <p className="mun-card-age-gender">
            {item.age != null ? `${item.age} years old` : ''}
            {item.age != null && genderLabel ? ' • ' : ''}
            {genderLabel || ''}
          </p>
        )}

        {item.last_seen_location && (
          <p className="mun-card-location">
            <span className="mun-card-loc-icon"><IconPin /></span>
            <span>{item.last_seen_location}</span>
          </p>
        )}

        {dateStr && (
          <p className="mun-card-date">
            <span className="mun-card-loc-icon"><IconClock /></span>
            <span>{dateStr}</span>
          </p>
        )}

        <Link to={`/cases/${item.id}`} className="mun-card-poster-btn">
          <IconDownload /> Download Poster
        </Link>
      </div>
    </div>
  );
}
