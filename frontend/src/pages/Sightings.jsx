import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import { api } from '../api/client';
import { useLang } from '../context/LangContext';

export default function Sightings() {
  // Support both /sightings and /sighting/:id routes
  const { id: paramId } = useParams();
  const { t } = useLang();

  const [cases, setCases] = useState([]);
  const [casesError, setCasesError] = useState('');
  const [image, setImage] = useState(null);
  const [pos, setPos] = useState({ lat: 23.8103, lng: 90.4125 });
  const [anonymous, setAnonymous] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [imageError, setImageError] = useState('');
  const [form, setForm] = useState({
    missing_person_id: paramId || '',
    location_text: '',
    description: '',
    confidence_level: 'maybe',
    reporter_name: '',
    reporter_phone: '',
  });

  useEffect(() => {
    api.get('/cases')
      .then(r => setCases(r.data))
      .catch(() => setCasesError('Could not load cases list. Please refresh and try again.'));
  }, []);

  // If a case id comes from the URL param, pre-select it
  useEffect(() => {
    if (paramId) setForm(f => ({ ...f, missing_person_id: paramId }));
  }, [paramId]);

  async function handleMapPick(latlng) {
    setPos(latlng);
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
        setForm(f => ({ ...f, location_text: parts.length ? parts.join(', ') : data.display_name }));
      }
    } catch { /* silently fail */ }
  }

  async function submit(e) {
    e.preventDefault();
    setImageError('');
    if (!image) {
      setImageError('A photo is required to submit a sighting.');
      return;
    }
    setSubmitting(true);
    setMsg('');
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
    fd.append('lat', pos.lat);
    fd.append('lng', pos.lng);
    fd.append('image', image);
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
            <div className="db-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#27AE60" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2>Sighting Submitted!</h2>
            <p className="muted">Thank you. Your report has been received and will be reviewed by our team.</p>
            <div className="row gap" style={{ justifyContent: 'center', marginTop: 16 }}>
              <button className="btn" onClick={() => {
                setSubmitted(false);
                setForm({ missing_person_id: '', location_text: '', description: '', confidence_level: 'maybe', reporter_name: '', reporter_phone: '' });
                setImage(null);
              }}>
                Submit Another
              </button>
              <a className="btn outline" href="/cases">View Missing Cases</a>
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
          <h1>{t('sighting.title')}</h1>
          <p className="muted">{t('sighting.sub')}</p>
        </div>

        {/* Anonymous / With Contact toggle */}
        <div className="anon-toggle">
          <div className={`anon-option ${anonymous ? 'active' : ''}`} onClick={() => setAnonymous(true)}>
            <span>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>
            </span>
            <div>
              <b>{t('sighting.anonymous')}</b>
              <p>Submit without revealing your identity</p>
            </div>
          </div>
          <div className={`anon-option ${!anonymous ? 'active' : ''}`} onClick={() => setAnonymous(false)}>
            <span>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </span>
            <div>
              <b>{t('sighting.with_contact')}</b>
              <p>Provide name &amp; phone for follow-up</p>
            </div>
          </div>
        </div>

        {casesError && <p className="error">{casesError}</p>}
        {msg && <p className="error">{msg}</p>}

        <form
          onSubmit={submit}
          onKeyDown={e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault(); }}
          className="form-grid"
        >
          {/* Select missing person */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
              Select Missing Person <span style={{ color: 'var(--red)' }}>*</span>
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

          {/* Contact info (only when not anonymous) */}
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

          {/* Location text */}
          <input
            value={form.location_text}
            onChange={e => setForm({ ...form, location_text: e.target.value })}
            placeholder="Location name (e.g. Mirpur 10, Dhaka)"
          />

          {/* Description */}
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Describe what you saw — clothing, direction, who they were with..."
            required
          />

          {/* Confidence level */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>Confidence Level</label>
            <select
              value={form.confidence_level}
              onChange={e => setForm({ ...form, confidence_level: e.target.value })}
            >
              <option value="sure"> Sure — I'm confident it's them</option>
              <option value="maybe">Maybe — Could be them</option>
              <option value="not_sure">Not sure — Just reporting</option>
            </select>
          </div>

          {/* Photo upload — required */}
          <div className="file-upload-box" style={imageError ? { border: '1px solid red' } : {}}>
            <label>Attach a photo (required)</label>
            <input type="file" accept="image/*" onChange={e => { setImage(e.target.files[0]); setImageError(''); }} />
          </div>
          {imageError && <p className="error" style={{ color: 'red', marginTop: 4 }}>{imageError}</p>}

          {/* Map pin */}
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
              Pin the location on the map
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
               You are submitting anonymously. Your identity will not be recorded.
            </div>
          )}

          <button type="submit" className="btn full danger" disabled={submitting}>
            {submitting ? t('sighting.submitting') : `${t('sighting.submit')}`}
          </button>
        </form>
      </main>
    </>
  );
}


