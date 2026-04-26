import { Link } from 'react-router-dom';

export default function CaseCard({ item }) {
  const img = item.images?.[0] || 'https://placehold.co/300x240?text=Missing+Person';
  return <div className="case-card">
    <img src={img} alt={item.name} />
    <div className="case-body">
      <div className="row between"><h3>{item.name}</h3><span className={`badge ${item.status}`}>{item.status}</span></div>
      <p>Age: {item.age || 'Unknown'}</p>
      <p>Last seen: {item.last_seen_location}</p>
      <div className="row gap"><Link className="btn" to={`/cases/${item.id}`}>View Details</Link><Link className="btn outline" to={`/sighting/${item.id}`}>I Saw Them</Link></div>
    </div>
  </div>
}
