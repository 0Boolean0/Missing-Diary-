import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { api } from '../api/client';

export default function SubmitSighting() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { t } = useLang();
  const [cases, setCases] = useState([]);
  const [casesError, setCasesError] = useState('');
  const [image, setImage] = useState(null);
  const [pos, setPos] = useState({ lat: 23.8103, lng: 90.4125 });
  const [geocoding, setGeocoding] = useState(false);
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

  // Fix #11: handle error when cases list fails to load
  useEffect(() => {
    api.get('/cases')
      .then(r => setCases(r.data))
      .catch(() => setCasesError('Could not load cases list. Please refresh and try again.'));
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
<<<<<<< Updated upstream
      <main className="container narrow">
        <h1>{t('sighting.title')}</h1>
        <p className="muted">{t('sighting.sub')}</p>
=======
      <main className="container narrow" style={{ paddingBottom: 60 }}>
        <div className="sighting-page-header">
          <h1>👁️ Submit a Sighting</h1>
          <p className="muted">Your information can help bring someone home.</p>
        </div>
>>>>>>> Stashed changes

        {/* Anonymous toggle */}
        <div className="anon-toggle">
          <div className={`anon-option ${anonymous ? 'active' : ''}`} onClick={() => setAnonymous(true)}>
            <span>🕵️</span>
            <div>
              <b>{t('sighting.anonymous')}</b>
              <p>Submit without revealing your identity</p>
            </div>
          </div>
          <div className={`anon-option ${!anonymous ? 'active' : ''}`} onClick={() => setAnonymous(false)}>
            <span>👤</span>
            <div>
<<<<<<< Updated upstream
              <b>{t('sighting.with_contact')}</b>
=======
              <b>With Contact Info</b>
>>>>>>> Stashed changes
              <p>Provide name &amp; phone for follow-up</p>
            </div>
          </div>
        </div>

<<<<<<< Updated upstream
        {casesError && <p className="error">{casesError}</p>}
        {msg && <p className="error">{msg}</p>}
=======
        {msg && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#991b1b', fontSize: 14 }}>
            ⚠️ {msg}
          </div>
        )}
>>>>>>> Stashed changes

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
              <option value="">Select missing person</option>
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
                placeholder="Your phone number (optional)"
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

<<<<<<< Updated upstream
          <button className="btn full danger" disabled={submitting}>
            {submitting ? t('sighting.submitting') : t('sighting.submit')}
=======
          <button className="btn full danger" disabled={submitting} style={{ padding: '14px', fontSize: 15, fontWeight: 800, borderRadius: 10 }}>
            {submitting ? '⏳ Submitting...' : '📤 Submit Sighting'}
>>>>>>> Stashed changes
          </button>
        </form>
      </main>
    </>
  );
}
