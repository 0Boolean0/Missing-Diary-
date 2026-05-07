import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function Sightings() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [cases, setCases] = useState([]);
  const [image, setImage] = useState(null);
  const [pos, setPos] = useState({ lat: 23.8103, lng: 90.4125 });
  const [geocoding, setGeocoding] = useState(false);
  const [anonymous, setAnonymous] = useState(!user);
  const [submitted, setSubmitted] = useState(false);
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    missing_person_id: '',
    location_text: '',
    description: '',
    confidence_level: 'maybe',
    reporter_name: '',
    reporter_phone: '',
  });

  useEffect(() => {
    api.get('/cases').then(r => setCases(r.data)).catch(() => {});
  }, []);

  async function handleMapPick(latlng) {
    setPos(latlng);
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json&accept-language=en`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data?.display_name) {
        const a = data.address || {};
        const parts = [
          a.road || a.neighbourhood || a.suburb,
          a.city_district || a.suburb || a.town || a.village,
          a.city || a.county,
          a.state,
        ].filter(Boolean);
        const short = parts.length ? parts.join(', ') : data.display_name;
        setForm(f => ({ ...f, location_text: short }));
      }
    } catch {
      // silently fail
    } finally {
      setGeocoding(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
    fd.append('lat', pos.lat);
    fd.append('lng', pos.lng);
    if (image) fd.append('image', image);
    try {
      await api.post('/sightings', fd);
      setSubmitted(true);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to submit sighting');
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <>
        <Navbar />
        <main className="container narrow">
          <div className="db-empty" style={{ paddingTop: 80 }}>
            <div className="db-empty-icon">✅</div>
            <h2 style={{ color: 'var(--success)', margin: '0 0 8px' }}>Sighting Submitted!</h2>
            <p className="muted">Thank you. Your report has been received and will be reviewed.</p>
            <div className="row gap" style={{ justifyContent: 'center', marginTop: 20 }}>
              <button className="btn" onClick={() => {
                setSubmitted(false);
                setForm({ missing_person_id: '', location_text: '', description: '', confidence_level: 'maybe', reporter_name: '', reporter_phone: '' });
                setImage(null);
              }}>
                Submit Another
              </button>
              <button className="btn outline" onClick={() => nav('/cases')}>View Missing Cases</button>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container narrow" style={{ paddingBottom: 60 }}>
        <div className="sighting-page-header">
          <h1>👁️ Submit a Sighting</h1>
          <p className="muted">Saw someone who might be missing? Your information can help bring them home.</p>
        </div>

        {/* Anonymous toggle */}
        <div className="anon-toggle">
          <div className={`anon-option ${anonymous ? 'active' : ''}`} onClick={() => setAnonymous(true)}>
            <span>🕵️</span>
            <div>
              <b>Anonymous</b>
              <p>Submit without revealing your identity</p>
            </div>
          </div>
          <div className={`anon-option ${!anonymous ? 'active' : ''}`} onClick={() => setAnonymous(false)}>
            <span>👤</span>
            <div>
              <b>With Contact Info</b>
              <p>Provide name &amp; phone for follow-up</p>
            </div>
          </div>
        </div>

        {msg && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#991b1b', fontSize: 14 }}>
            ⚠️ {msg}
          </div>
        )}

        <form onSubmit={submit} className="form-grid">
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
              Select Missing Person <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <select
              value={form.missing_person_id}
              onChange={e => setForm({ ...form, missing_person_id: e.target.value })}
              required
            >
              <option value="">— Choose a case —</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.last_seen_location}</option>
              ))}
            </select>
          </div>

          {!anonymous && (
            <div className="form-row-2">
              <input
                value={form.reporter_name}
                onChange={e => setForm({ ...form, reporter_name: e.target.value })}
                placeholder="Your name (optional)"
              />
              <input
                value={form.reporter_phone}
                onChange={e => setForm({ ...form, reporter_phone: e.target.value })}
                placeholder="Your phone (optional)"
              />
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <input
              value={form.location_text}
              onChange={e => setForm({ ...form, location_text: e.target.value })}
              placeholder="📍 Location name (e.g. Mirpur 10, Dhaka)"
              style={{ paddingRight: geocoding ? 36 : undefined }}
            />
            {geocoding && (
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--primary)' }}>⏳</span>
            )}
          </div>

          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Describe what you saw — clothing, direction, who they were with..."
            required
          />

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>Confidence Level</label>
            <select
              value={form.confidence_level}
              onChange={e => setForm({ ...form, confidence_level: e.target.value })}
            >
              <option value="sure">✅ Sure — I'm confident it's them</option>
              <option value="maybe">🤔 Maybe — Could be them</option>
              <option value="not_sure">❓ Not sure — Just reporting</option>
            </select>
          </div>

          <div className="file-upload-box">
            <label>📷 Attach a photo (optional)</label>
            <input type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
              📍 Pin the location on the map
              <span style={{ color: 'var(--muted)', fontWeight: 400 }}> (click to auto-fill address)</span>
            </label>
            <MapView
              center={[pos.lat, pos.lng]}
              markers={[{ lat: pos.lat, lng: pos.lng, title: 'Sighting location' }]}
              onPick={handleMapPick}
            />
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 0' }}>
              📍 {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
            </p>
          </div>

          {anonymous && (
            <div className="anon-notice">
              🕵️ You are submitting anonymously. Your identity will not be recorded.
            </div>
          )}

          <button className="btn full danger" disabled={submitting} style={{ padding: '14px', fontSize: 15, fontWeight: 800, borderRadius: 10 }}>
            {submitting ? '⏳ Submitting...' : '📤 Submit Sighting'}
          </button>
        </form>
      </main>
    </>
  );
}
