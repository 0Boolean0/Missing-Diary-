import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import { useLang } from '../context/LangContext';
import { api } from '../api/client';

export default function SubmitSighting() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useLang();
  const [cases, setCases] = useState([]);
  const [casesError, setCasesError] = useState('');
  const [image, setImage] = useState(null);
  const [pos, setPos] = useState({ lat: 23.8103, lng: 90.4125 });
  const [geocoding, setGeocoding] = useState(false);
  const [form, setForm] = useState({
    missing_person_id: id || '',
    location_text: '',
    description: '',
    confidence_level: 'maybe',
    reporter_name: '',
    reporter_phone: '',
  });
  const [anonymous, setAnonymous] = useState(true);
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
        setForm(f => ({ ...f, location_text: parts.length ? parts.join(', ') : data.display_name }));
      }
    } catch { /* silently fail */ } finally { setGeocoding(false); }
  }

  async function handleLocationText(e) {
    const val = e.target.value;
    setForm(f => ({ ...f, location_text: val }));
    // Try to geocode typed location
    if (val.length > 4) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=1&accept-language=en`
        );
        const data = await res.json();
        if (data?.[0]) {
          setPos({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        }
      } catch { /* silently fail */ }
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
      setMsg(err.response?.data?.message || 'Failed to submit sighting. Please try again.');
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <>
        <Navbar />
        <main className="container narrow" style={{ textAlign: 'center', paddingTop: 60 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#eafaf1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#27AE60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800 }}>Sighting Submitted!</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 28 }}>
            Thank you for helping. Your report has been received and will be reviewed by our team.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="btn" to="/cases">View All Cases</Link>
            <button className="btn outline" onClick={() => { setSubmitted(false); setForm({ missing_person_id: '', location_text: '', description: '', confidence_level: 'maybe', reporter_name: '', reporter_phone: '' }); setImage(null); setAnonymous(true); }}>
              Submit Another
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container narrow">

        {/* Header */}
        <div style={{ margin: '28px 0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eafaf1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#27AE60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Report a Sighting</h1>
          </div>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>
            Did you see someone who might be missing? Share what you know — every detail helps reunite families.
            No account needed.
          </p>
        </div>

        {/* Identity toggle */}
        <div className="anon-toggle" style={{ marginBottom: 20 }}>
          <div className={`anon-option ${anonymous ? 'active' : ''}`} onClick={() => setAnonymous(true)}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </span>
            <div>
              <b>Stay Anonymous</b>
              <p>Submit without revealing your identity</p>
            </div>
          </div>
          <div className={`anon-option ${!anonymous ? 'active' : ''}`} onClick={() => setAnonymous(false)}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </span>
            <div>
              <b>Share Contact</b>
              <p>Provide name &amp; phone for follow-up</p>
            </div>
          </div>
        </div>

        {casesError && <p className="error">{casesError}</p>}
        {msg && <p className="error" style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px' }}>{msg}</p>}

        <form onSubmit={submit} className="form-grid">

          {/* Select person */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
              Who did you see? <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <select
              value={form.missing_person_id}
              onChange={e => setForm({ ...form, missing_person_id: e.target.value })}
              required
            >
              <option value="">Select a missing person...</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.last_seen_location}</option>
              ))}
            </select>
          </div>

          {/* Contact info (optional) */}
          {!anonymous && (
            <div className="form-row-2">
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Your Name (optional)</label>
                <input
                  value={form.reporter_name}
                  onChange={e => setForm({ ...form, reporter_name: e.target.value })}
                  placeholder="e.g. Rahim Uddin"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Phone Number (optional)</label>
                <input
                  value={form.reporter_phone}
                  onChange={e => setForm({ ...form, reporter_phone: e.target.value })}
                  placeholder="+880 1XXX-XXXXXX"
                />
              </div>
            </div>
          )}

          {/* Location */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
              Where did you see them? <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                value={form.location_text}
                onChange={handleLocationText}
                placeholder="Type a location (e.g. Mirpur 10, Dhaka) or pin on map below"
                style={{ paddingRight: geocoding ? 36 : undefined }}
                required
              />
              {geocoding && (
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 8px' }}>
              Or click on the map to pin the exact location
            </p>
            <MapView
              center={[pos.lat, pos.lng]}
              markers={[{ lat: pos.lat, lng: pos.lng, title: 'Sighting location' }]}
              onPick={handleMapPick}
            />
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
            </p>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
              What did you observe? <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Describe what you saw — clothing, direction they were heading, who they were with, their condition..."
              required
            />
          </div>

          {/* Confidence */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>How confident are you?</label>
            <select
              value={form.confidence_level}
              onChange={e => setForm({ ...form, confidence_level: e.target.value })}
            >
              <option value="sure">Very confident — I'm sure it's them</option>
              <option value="maybe">Somewhat confident — Could be them</option>
              <option value="not_sure">Not sure — Just reporting what I saw</option>
            </select>
          </div>

          {/* Photo */}
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
              Attach a photo
              <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: 6 }}>(required — helps verify the sighting)</span>
            </label>
            <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '16px 20px', background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <div style={{ flex: 1 }}>
                <input type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} style={{ width: '100%' }} />
                {image && <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>{image.name}</p>}
              </div>
            </div>
          </div>

          {anonymous && (
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              You are submitting anonymously. Your identity will not be recorded.
            </div>
          )}

          <button className="btn full" style={{ background: 'var(--green)', fontSize: 15, padding: '13px' }} disabled={submitting}>
            {submitting ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
                Submitting...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Submit Sighting Report
              </span>
            )}
          </button>
        </form>
      </main>
    </>
  );
}
