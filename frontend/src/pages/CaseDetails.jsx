import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import { api } from '../api/client';

export default function CaseDetails() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [matches, setMatches] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [loadingMatch, setLoadingMatch] = useState(false);

  useEffect(() => {
    api.get(`/cases/${id}`).then(r => setItem(r.data));
  }, [id]);

  async function runAIMatch() {
    setLoadingMatch(true);
    try {
      const r = await api.get(`/sightings/match/${id}`);
      setMatches(r.data.matches);
    } catch {
      setMatches([]);
    }
    setLoadingMatch(false);
  }

  if (!item) return <><Navbar /><main className="container">Loading...</main></>;

  const image = item.images?.[0] || 'https://placehold.co/600x420?text=Missing+Person';
  const caseUrl = window.location.href;
  const markers = [
    { lat: item.last_seen_lat, lng: item.last_seen_lng, title: 'Last seen', description: item.last_seen_location },
    ...(item.sightings || []).filter(s => s.status === 'verified').map(s => ({
      lat: s.lat, lng: s.lng, title: 'Verified sighting', description: s.description
    }))
  ];

  return (
    <>
      <Navbar />
      <main className="container">
        <div className="details-grid">
          {/* Left — Photo */}
          <section>
            <img className="big-photo" src={image} alt={item.name} />
            <div className="thumbs">
              {item.images?.map((src, i) => <img key={i} src={src} alt="" />)}
            </div>

            {/* QR Code */}
            <div className="qr-box">
              <div className="qr-header">
                <div>
                  <div className="qr-title">Case QR Code</div>
                  <div className="qr-id">ID: {item.id.slice(0, 8).toUpperCase()}</div>
                </div>
                <button className="btn outline small" onClick={() => setShowQR(!showQR)}>
                  {showQR ? 'Hide QR' : 'Show QR'}
                </button>
              </div>
              {showQR && (
                <div className="qr-code-wrap">
                  <QRCodeSVG value={caseUrl} size={160} level="H" includeMargin />
                  <p className="qr-hint">Scan to open this case on any device</p>
                  <button className="btn small" onClick={() => {
                    const svg = document.querySelector('.qr-code-wrap svg');
                    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `case-${item.id.slice(0,8)}.svg`;
                    a.click();
                  }}>⬇ Download QR</button>
                </div>
              )}
            </div>
          </section>

          {/* Right — Details */}
          <section className="panel">
            <div className="row between">
              <h1>{item.name}</h1>
              <span className={`badge ${item.status}`}>{item.status}</span>
            </div>
            <p><b>Age:</b> {item.age}</p>
            <p><b>Gender:</b> {item.gender}</p>
            <p><b>Height:</b> {item.height}</p>
            <p><b>Last Seen:</b> {item.last_seen_location}</p>
            <p><b>Clothing:</b> {item.clothing}</p>
            <p><b>Medical:</b> {item.medical_info || 'None'}</p>
            <p>{item.description}</p>
            <div className="row gap" style={{ flexWrap: 'wrap' }}>
              <Link className="btn danger" to={`/sighting/${item.id}`}>I Saw This Person</Link>
              <button className="btn outline" onClick={() => navigator.share?.({ title: item.name, url: caseUrl })}>Share Case</button>
              <button className="btn outline" onClick={runAIMatch} disabled={loadingMatch}>
                {loadingMatch ? '🔍 Matching...' : '🤖 AI Match Sightings'}
              </button>
            </div>
          </section>
        </div>

        {/* AI Match Results */}
        {matches !== null && (
          <div className="ai-match-box">
            <h2>🤖 AI Matching Results</h2>
            <p className="muted">Sightings ranked by keyword similarity with case details.</p>
            {matches.length === 0 ? (
              <p className="muted">No sightings found for this case yet.</p>
            ) : (
              <div className="ai-match-list">
                {matches.map(m => (
                  <div key={m.id} className="ai-match-item">
                    <div className="ai-match-header">
                      <div className="ai-score-bar">
                        <div className="ai-score-fill" style={{ width: `${m.ai_match_score}%`, background: m.ai_match_score > 50 ? '#16a34a' : m.ai_match_score > 20 ? '#f59e0b' : '#e11d2e' }} />
                      </div>
                      <span className="ai-score-num">{m.ai_match_score}% match</span>
                      <span className={`badge ${m.status}`}>{m.status}</span>
                    </div>
                    <p className="ai-match-desc">{m.description}</p>
                    <div className="ai-match-meta">
                      <span>📍 {m.location_text || 'Unknown location'}</span>
                      <span>🕐 {new Date(m.created_at).toLocaleString()}</span>
                      {m.ai_matched_keywords.length > 0 && (
                        <span>🔑 Keywords: <b>{m.ai_matched_keywords.join(', ')}</b></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <h2>Last Seen Location & Verified Sightings</h2>
        <MapView center={[item.last_seen_lat, item.last_seen_lng]} markers={markers} />

        <h2>Timeline / Sightings</h2>
        <div className="timeline">
          {(item.sightings || []).map(s => (
            <div className="timeline-item" key={s.id}>
              <b>{s.status}</b> sighting: {s.description}
              <br /><small>{new Date(s.created_at).toLocaleString()}</small>
            </div>
          ))}
          {(item.sightings || []).length === 0 && <p className="muted">No sightings yet.</p>}
        </div>
      </main>
    </>
  );
}
