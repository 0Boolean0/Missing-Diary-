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
            <h2>Sighting Submitted!</h2>
            <p className="muted">Thank you. Your report has been received and will be reviewed.</p>
            <div className="row gap" style={{ justifyContent: 'center', marginTop: 16 }}>
              <button className="btn" onClick={() => { setSubmitted(false); setForm({ missing_person_id: '', location_text: '', description: '', confidence_level: 'maybe', reporter_name: '', reporter_phone: '' }); setImage(null); }}>
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
      <main className="container narrow">
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
              <p>Provide name & phone for follow-up</p>
            </div>
          </div>
        </div>

        {msg && <p className="error">{msg}</p>}

        <form onSubmit={submit} className="form-grid">
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Select Missing Person *</label>
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

          <input
            value={form.location_text}
            onChange={e => setForm({ ...form, location_text: e.target.value })}
            placeholder="📍 Location name (e.g. Mirpur 10, Dhaka)"
          />

          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Describe what you saw — clothing, direction, who they were with..."
            required
          />

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Confidence Level</label>
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
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>📍 Pin the location on the map</label>
            <MapView
              center={[pos.lat, pos.lng]}
              markers={[{ lat: pos.lat, lng: pos.lng, title: 'Sighting location' }]}
              onPick={latlng => setPos(latlng)}
            />
          </div>

          {anonymous && (
            <div className="anon-notice">
              🕵️ You are submitting anonymously. Your identity will not be recorded.
            </div>
          )}

          <button className="btn full danger" disabled={submitting}>
            {submitting ? 'Submitting...' : '📤 Submit Sighting'}
          </button>
        </form>
      </main>
    </>
  );
}
