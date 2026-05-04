import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import { api } from '../api/client';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { startTracking, stopTracking } from '../utils/locationTracker';

const TIMELINE_ENTRY_FORM_INITIAL = { entry_time: '', location_text: '', lat: '', lng: '', notes: '' };

export default function CaseDetails() {
  const { id } = useParams();
  const { t } = useLang();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const [matches, setMatches] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [locationTrail, setLocationTrail] = useState([]);
  // Task 18.1: timeline entries state
  const [timelineEntries, setTimelineEntries] = useState([]);
  // Task 18.2: add timeline entry form state
  const [timelineForm, setTimelineForm] = useState(TIMELINE_ENTRY_FORM_INITIAL);
  const [timelineFormError, setTimelineFormError] = useState('');
  const [timelineFormSubmitting, setTimelineFormSubmitting] = useState(false);

  // Fix #10: handle load errors instead of staying on "Loading..." forever
  useEffect(() => {
    api.get(`/cases/${id}`)
      .then(r => setItem(r.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load case. You may not have permission to view it.'));
  }, [id]);

  // Stop tracking when the component unmounts to prevent memory leaks
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  // Task 18.1: Fetch case timeline entries on mount
  useEffect(() => {
    api.get(`/cases/${id}/timeline`)
      .then(r => setTimelineEntries(r.data || []))
      .catch(() => {
        // Silently ignore errors (e.g. unauthenticated)
      });
  }, [id]);

  // Task 17.1 + 17.2: Fetch 24-hour location trail for admin/police users and poll every 30s
  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'police') return;

    async function fetchTrail() {
      try {
        const r = await api.get(`/cases/${id}/trail`);
        const trail = (r.data || []).map(point => [Number(point.lat), Number(point.lng)]);
        setLocationTrail(trail);
      } catch {
        // Silently ignore trail fetch errors
      }
    }

    fetchTrail();
    const intervalId = setInterval(fetchTrail, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [id, user]);

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

  function handleTrackingToggle() {
    if (isTracking) {
      stopTracking();
      setIsTracking(false);
    } else {
      startTracking(id, (coord) => api.post(`/cases/${id}/location`, coord));
      setIsTracking(true);
    }
  }

  // Task 18.2: Submit a new timeline entry
  async function handleTimelineSubmit(e) {
    e.preventDefault();
    setTimelineFormError('');
    setTimelineFormSubmitting(true);
    try {
      const payload = {
        entry_time: timelineForm.entry_time,
        location_text: timelineForm.location_text,
        notes: timelineForm.notes || undefined,
        lat: timelineForm.lat !== '' ? Number(timelineForm.lat) : undefined,
        lng: timelineForm.lng !== '' ? Number(timelineForm.lng) : undefined,
      };
      const r = await api.post(`/cases/${id}/timeline`, payload);
      setTimelineEntries(prev => [...prev, r.data]);
      setTimelineForm(TIMELINE_ENTRY_FORM_INITIAL);
    } catch (err) {
      setTimelineFormError(err.response?.data?.message || 'Failed to add timeline entry.');
    }
    setTimelineFormSubmitting(false);
  }

  if (error) return (
    <>
      <Navbar />
      <main className="container">
        <div className="db-empty" style={{ paddingTop: 60 }}>
          <div className="db-empty-icon">⚠️</div>
          <p>{error}</p>
          <Link className="btn" to="/cases">{t('case.back')}</Link>
        </div>
      </main>
    </>
  );

  if (!item) return <><Navbar /><main className="container">{t('case.loading')}</main></>;

  const image = item.images?.[0] || 'https://placehold.co/600x420?text=Missing+Person';
  const caseUrl = window.location.href;

  // Tracking toggle is visible to the case owner or any guardian
  const isOwnerOrGuardian =
    user && (
      user.role === 'guardian' ||
      user.id === item.reported_by ||
      user.id === item.user_id
    );

  const markers = [
    { lat: item.last_seen_lat, lng: item.last_seen_lng, title: 'Last seen', description: item.last_seen_location },
    ...(item.sightings || []).filter(s => s.status === 'verified').map(s => ({
      lat: s.lat, lng: s.lng, title: 'Verified sighting', description: s.description
    })),
    // Task 18.1: add timeline entry markers for entries that have coordinates
    ...timelineEntries.filter(e => e.lat != null && e.lng != null).map(e => ({
      lat: e.lat, lng: e.lng,
      title: `Timeline: ${e.location_text}`,
      description: e.notes || e.location_text
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
                  <div className="qr-title">{t('case.qr_title')}</div>
                  <div className="qr-id">ID: {item.id.slice(0, 8).toUpperCase()}</div>
                </div>
                <button className="btn outline small" onClick={() => setShowQR(!showQR)}>
                  {showQR ? t('case.hide_qr') : t('case.show_qr')}
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
                  }}>{t('case.download_qr')}</button>
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
              <Link className="btn danger" to={`/sighting/${item.id}`}>{t('case.saw_person')}</Link>
              <button className="btn outline" onClick={() => navigator.share?.({ title: item.name, url: caseUrl })}>{t('case.share')}</button>
              <button className="btn outline" onClick={runAIMatch} disabled={loadingMatch}>
                {loadingMatch ? t('case.ai_matching') : t('case.ai_match')}
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
        {isOwnerOrGuardian && (
          <div className="live-tracking-section">
            <button
              className={isTracking ? 'btn danger small' : 'btn small'}
              onClick={handleTrackingToggle}
            >
              {isTracking ? 'Disable Live Tracking' : 'Enable Live Tracking'}
            </button>
            {isTracking && (
              <span className="live-tracking-indicator">
                🔴 Live tracking active
              </span>
            )}
          </div>
        )}
        <MapView center={[item.last_seen_lat, item.last_seen_lng]} markers={markers} polyline={locationTrail} />

        <h2>{t('case.timeline_title')}</h2>
        {/* Task 18.1: Display case timeline entries from the API */}
        <div className="timeline">
          {timelineEntries.length === 0 && (
            <p className="muted">No timeline entries yet.</p>
          )}
          {timelineEntries.map(entry => (
            <div className="timeline-item" key={entry.id}>
              <div className="row between" style={{ flexWrap: 'wrap', gap: 6 }}>
                <b>{new Date(entry.entry_time).toLocaleString()}</b>
                <span className="muted" style={{ fontSize: 13 }}>📍 {entry.location_text}</span>
              </div>
              {entry.notes && <p style={{ margin: '6px 0 0', fontSize: 14 }}>{entry.notes}</p>}
            </div>
          ))}
        </div>

        {/* Task 18.2: Add Timeline Entry form — visible to authenticated users only */}
        {user && (
          <section className="timeline-entry-form" style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 14 }}>Add Timeline Entry</h3>
            <form className="form-grid" onSubmit={handleTimelineSubmit}>
              <div className="form-row-2">
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                    Date &amp; Time <span style={{ color: 'var(--red)' }}>*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={timelineForm.entry_time}
                    onChange={e => setTimelineForm(f => ({ ...f, entry_time: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                    Location <span style={{ color: 'var(--red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dhaka, Mirpur-10"
                    value={timelineForm.location_text}
                    onChange={e => setTimelineForm(f => ({ ...f, location_text: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-row-2">
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                    Latitude (optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 23.8103"
                    value={timelineForm.lat}
                    onChange={e => setTimelineForm(f => ({ ...f, lat: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                    Longitude (optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 90.4125"
                    value={timelineForm.lng}
                    onChange={e => setTimelineForm(f => ({ ...f, lng: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                  Notes (optional)
                </label>
                <textarea
                  placeholder="Additional details about this timeline entry..."
                  value={timelineForm.notes}
                  onChange={e => setTimelineForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              {timelineFormError && (
                <p className="error" style={{ margin: 0 }}>{timelineFormError}</p>
              )}
              <div>
                <button type="submit" className="btn" disabled={timelineFormSubmitting}>
                  {timelineFormSubmitting ? 'Adding...' : '+ Add Entry'}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    </>
  );
}
