import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function SubmitSighting() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [image, setImage] = useState(null);
  const [pos, setPos] = useState({ lat: 23.8103, lng: 90.4125 });
  const [anonymous, setAnonymous] = useState(!user);
  const [form, setForm] = useState({
    missing_person_id: id || '',
    location_text: '',
    description: '',
    confidence_level: 'maybe',
    reporter_name: '',
    reporter_phone: '',
  });
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/cases').then(r => setCases(r.data));
  }, []);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
    fd.append('lat', pos.lat);
    fd.append('lng', pos.lng);
    if (image) fd.append('image', image);
    try {
      await api.post('/sightings', fd);
      nav(`/cases/${form.missing_person_id}`);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to submit sighting');
    }
    setSubmitting(false);
  }

  return (
    <>
      <Navbar />
      <main className="container narrow">
        <h1>Submit a Sighting</h1>
        <p className="muted">Your information can help bring someone home.</p>

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
          <select
            value={form.missing_person_id}
            onChange={e => setForm({ ...form, missing_person_id: e.target.value })}
            required
          >
            <option value="">Select missing person</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>{c.name} — {c.last_seen_location}</option>
            ))}
          </select>

          {!anonymous && (
            <>
              <input
                value={form.reporter_name}
                onChange={e => setForm({ ...form, reporter_name: e.target.value })}
                placeholder="Your name (optional)"
              />
              <input
                value={form.reporter_phone}
                onChange={e => setForm({ ...form, reporter_phone: e.target.value })}
                placeholder="Your phone number (optional)"
              />
            </>
          )}

          <input
            value={form.location_text}
            onChange={e => setForm({ ...form, location_text: e.target.value })}
            placeholder="Location name (e.g. Mirpur 10, Dhaka)"
          />

          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Describe what you saw — clothing, direction, who they were with..."
            required
          />

          <select
            value={form.confidence_level}
            onChange={e => setForm({ ...form, confidence_level: e.target.value })}
          >
            <option value="sure">✅ Sure — I'm confident it's them</option>
            <option value="maybe">🤔 Maybe — Could be them</option>
            <option value="not_sure">❓ Not sure — Just reporting</option>
          </select>

          <div className="file-upload-box">
            <label>📷 Attach a photo (optional)</label>
            <input type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
              📍 Pin the location on the map
            </label>
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
            {submitting ? 'Submitting...' : 'Submit Sighting'}
          </button>
        </form>
      </main>
    </>
  );
}
