import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, MapPin, Eye, Phone, CheckCircle, HelpCircle, AlertCircle, Camera, EyeOff, UserCheck, HeartHandshake, CheckCheck } from 'lucide-react';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import { api } from '../api/client';
import { useLang } from '../context/LangContext';

const STEPS = [
  { id: 1, labelKey: 'sighting.step1_title', Icon: User },
  { id: 2, labelKey: 'sighting.step2_title', Icon: MapPin },
  { id: 3, labelKey: 'sighting.step3_title', Icon: Eye },
  { id: 4, labelKey: 'sighting.step4_title', Icon: Phone },
];

const CONFIDENCE = [
  { value: 'sure',     Icon: CheckCircle,  labelKey: 'sighting.confidence_sure',     descKey: 'sighting.confidence_sure_desc' },
  { value: 'maybe',   Icon: HelpCircle,   labelKey: 'sighting.confidence_maybe',    descKey: 'sighting.confidence_maybe_desc' },
  { value: 'not_sure', Icon: AlertCircle, labelKey: 'sighting.confidence_not_sure', descKey: 'sighting.confidence_not_sure_desc' },
];

export default function SubmitSighting() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useLang();

  const [step, setStep] = useState(1);
  const [cases, setCases] = useState([]);
  const [casesError, setCasesError] = useState('');
  const [pos, setPos] = useState({ lat: 23.8103, lng: 90.4125 });
  const [geocoding, setGeocoding] = useState(false);
<<<<<<< HEAD
  const geocodeTimer = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [anonymous, setAnonymous] = useState(true);

=======
  const [anonymous, setAnonymous] = useState(!user);
>>>>>>> d090232e24ad7bf8a46350024742f09d0479363e
  const [form, setForm] = useState({
    missing_person_id: id || '',
    location_text: '',
    seen_time: '',
    description: '',
    confidence_level: 'maybe',
    reporter_name: '',
    reporter_phone: '',
  });

  useEffect(() => {
    api.get('/cases')
      .then(r => setCases(r.data))
      .catch(() => setCasesError('Could not load cases. Please refresh.'));
  }, []);

<<<<<<< HEAD
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function handleImage(e) {
    const f = e.target.files[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  }

  function handleLocationText(value) {
    set('location_text', value);
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    if (!value.trim() || value.trim().length < 4) return;
    geocodeTimer.current = setTimeout(async () => {
      setGeocoding(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=1&accept-language=en`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        if (data && data[0]) setPos({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
      } catch { /* ignore */ } finally { setGeocoding(false); }
    }, 800);
  }

=======
>>>>>>> d090232e24ad7bf8a46350024742f09d0479363e
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
<<<<<<< HEAD
        set('location_text', parts.length ? parts.join(', ') : data.display_name);
      }
    } catch { /* ignore */ } finally { setGeocoding(false); }
  }

  function nextStep() {
    setError('');
    if (step === 1 && !form.missing_person_id) { setError(t('sighting.error_select_person')); return; }
    if (step === 2 && !form.location_text.trim()) { setError(t('sighting.error_location')); return; }
    if (step === 3 && !form.description.trim()) { setError(t('sighting.error_description')); return; }
    setStep(s => s + 1);
=======
        const short = parts.length ? parts.join(', ') : data.display_name;
        setForm(f => ({ ...f, location_text: short }));
      }
    } catch {
      // silently fail
    } finally {
      setGeocoding(false);
    }
>>>>>>> d090232e24ad7bf8a46350024742f09d0479363e
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('missing_person_id', form.missing_person_id);
      fd.append('location_text', form.location_text);
      fd.append('description', form.description);
      fd.append('confidence_level', form.confidence_level);
      fd.append('lat', pos.lat);
      fd.append('lng', pos.lng);
      if (form.seen_time) fd.append('seen_time', form.seen_time);
      if (!anonymous) {
        if (form.reporter_name) fd.append('reporter_name', form.reporter_name);
        if (form.reporter_phone) fd.append('reporter_phone', form.reporter_phone);
      }
      if (imageFile) fd.append('image', imageFile);
      await api.post('/sightings', fd);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit. Please try again.');
    }
    setSubmitting(false);
  }

  const selectedCase = cases.find(c => c.id === form.missing_person_id);

  if (submitted) {
    return (
      <>
        <Navbar />
        <div style={styles.page}>
          <div style={styles.successBox}>
            <div style={styles.successIcon}>
              <HeartHandshake size={52} color="#27AE60" strokeWidth={1.5} />
            </div>
            <h2 style={styles.successTitle}>{t('sighting.success_title')}</h2>
            <p style={styles.successSub}>{t('sighting.success_sub')}</p>
            {selectedCase && (
              <button style={styles.btnPrimary} onClick={() => nav(`/cases/${selectedCase.id}`)}>
                {t('sighting.success_view_case')}
              </button>
            )}
            <button style={{ ...styles.btnOutline, marginTop: 10 }} onClick={() => nav('/cases')}>
              {t('sighting.success_browse')}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
<<<<<<< HEAD
      <div style={styles.page}>
        <div style={styles.container}>
=======
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
>>>>>>> d090232e24ad7bf8a46350024742f09d0479363e

          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerIcon}>
              <Eye size={40} color="#27AE60" strokeWidth={1.5} />
            </div>
            <h1 style={styles.title}>{t('sighting.title')}</h1>
            <p style={styles.subtitle}>{t('sighting.sub')}</p>
          </div>
<<<<<<< HEAD

          {/* Step indicator */}
          <div style={styles.stepBar}>
            {STEPS.map((s, i) => (
              <div key={s.id} style={styles.stepItem}>
                <div style={{
                  ...styles.stepDot,
                  background: step > s.id ? '#16a34a' : step === s.id ? '#27AE60' : '#e5e7eb',
                  color: step >= s.id ? '#fff' : '#9ca3af',
                  transform: step === s.id ? 'scale(1.15)' : 'scale(1)',
                }}>
                  {step > s.id
                    ? <CheckCheck size={14} />
                    : <s.Icon size={14} />
                  }
                </div>
                <span style={{ ...styles.stepLabel, color: step === s.id ? '#27AE60' : '#9ca3af', fontWeight: step === s.id ? 700 : 400 }}>
                  {t(s.labelKey).replace(/^[^\w\s]*\s*/, '')}
                </span>
                {i < STEPS.length - 1 && (
                  <div style={{ ...styles.stepLine, background: step > s.id ? '#27AE60' : '#e5e7eb' }} />
                )}
              </div>
            ))}
          </div>

          {/* Card */}
          <div style={styles.card}>
            {error && <div style={styles.errorBox}>{error}</div>}
            {casesError && <div style={styles.errorBox}>{casesError}</div>}

            {/* ── Step 1: Who ── */}
            {step === 1 && (
              <div>
                <h2 style={styles.stepTitle}>{t('sighting.step1_title')}</h2>
                <p style={styles.stepSub}>{t('sighting.step1_sub')}</p>
                <div style={styles.caseGrid}>
                  {cases.map(c => (
                    <div key={c.id} onClick={() => set('missing_person_id', c.id)}
                      style={{ ...styles.caseOption, border: form.missing_person_id === c.id ? '2px solid #27AE60' : '2px solid #e5e7eb', background: form.missing_person_id === c.id ? '#f0fdf4' : '#fff' }}>
                      <div style={styles.caseOptionCheck}>{form.missing_person_id === c.id && <CheckCircle size={16} color="#27AE60" />}</div>
                      <div style={styles.caseOptionName}>{c.name}</div>
                      <div style={styles.caseOptionMeta}>{c.age && <span>{c.age} yrs</span>}{c.gender && <span> · {c.gender}</span>}</div>
                      <div style={styles.caseOptionLoc}>Last seen: {c.last_seen_location}</div>
                    </div>
                  ))}
                </div>
                {cases.length === 0 && !casesError && (
                  <p style={{ color: '#9ca3af', textAlign: 'center', padding: '24px 0' }}>{t('sighting.loading_cases')}</p>
                )}
              </div>
            )}

            {/* ── Step 2: Where & When ── */}
            {step === 2 && (
              <div>
                <h2 style={styles.stepTitle}>{t('sighting.step2_title')}</h2>
                <p style={styles.stepSub}>{t('sighting.step2_sub')}</p>
                <div style={styles.field}>
                  <label style={styles.label}>{t('sighting.location_label')} <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input style={styles.input} value={form.location_text} onChange={e => handleLocationText(e.target.value)} placeholder={t('sighting.location_placeholder')} />
                    {geocoding && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#27AE60' }}>⏳</span>}
                  </div>
                  {geocoding && <span style={{ fontSize: 12, color: '#27AE60', marginTop: 4, display: 'block' }}>{t('sighting.locating')}</span>}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <MapView center={[pos.lat, pos.lng]} markers={[{ lat: pos.lat, lng: pos.lng, title: t('sighting.step2_title'), description: form.location_text }]} onPick={handleMapPick} height={260} draggable />
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '6px 0 0' }}>📍 {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</p>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>{t('sighting.when_label')}</label>
                  <input type="datetime-local" style={styles.input} value={form.seen_time} onChange={e => set('seen_time', e.target.value)} />
                </div>
              </div>
            )}

            {/* ── Step 3: What ── */}
            {step === 3 && (
              <div>
                <h2 style={styles.stepTitle}>{t('sighting.step3_title')}</h2>
                <p style={styles.stepSub}>{t('sighting.step3_sub')}</p>
                <div style={styles.field}>
                  <label style={styles.label}>{t('sighting.description_label')} <span style={{ color: '#ef4444' }}>*</span></label>
                  <textarea style={{ ...styles.input, minHeight: 110, resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder={t('sighting.description_placeholder')} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>{t('sighting.confidence_label')}</label>
                  <div style={styles.confidenceRow}>
                    {CONFIDENCE.map(c => (
                      <div key={c.value} onClick={() => set('confidence_level', c.value)}
                        style={{ ...styles.confidenceCard, border: form.confidence_level === c.value ? '2px solid #27AE60' : '2px solid #e5e7eb', background: form.confidence_level === c.value ? '#f0fdf4' : '#fff' }}>
                        <c.Icon size={22} color={form.confidence_level === c.value ? '#27AE60' : '#9ca3af'} />
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{t(c.labelKey)}</span>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>{t(c.descKey)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>{t('sighting.photo_label')}</label>
                  <label style={styles.dropzone} htmlFor="sighting-img">
                    {imagePreview ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <img src={imagePreview} alt="preview" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8 }} />
                        <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={14} color="#16a34a" /> {t('sighting.photo_attached')}
                        </span>
                        <button type="button" style={styles.removeBtn} onClick={e => { e.preventDefault(); setImageFile(null); setImagePreview(null); }}>{t('sighting.photo_remove')}</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '20px 0', color: '#9ca3af' }}>
                        <Camera size={28} color="#9ca3af" strokeWidth={1.5} />
                        <span style={{ fontSize: 13 }}>{t('sighting.photo_tap')}</span>
                        <span style={{ fontSize: 11 }}>jpg, png, webp</span>
                      </div>
                    )}
                  </label>
                  <input id="sighting-img" type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
                </div>
              </div>
            )}

            {/* ── Step 4: Contact ── */}
            {step === 4 && (
              <form onSubmit={submit}>
                <h2 style={styles.stepTitle}>{t('sighting.step4_title')}</h2>
                <p style={styles.stepSub}>{t('sighting.step4_sub')}</p>
                <div style={styles.anonRow}>
                  <div style={{ ...styles.anonCard, border: anonymous ? '2px solid #27AE60' : '2px solid #e5e7eb', background: anonymous ? '#f0fdf4' : '#fff' }} onClick={() => setAnonymous(true)}>
                    <EyeOff size={22} color={anonymous ? '#27AE60' : '#9ca3af'} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{t('sighting.anonymous')}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{t('sighting.anonymous_desc')}</div>
                    </div>
                    {anonymous && <CheckCheck size={18} style={{ marginLeft: 'auto', color: '#27AE60' }} />}
                  </div>
                  <div style={{ ...styles.anonCard, border: !anonymous ? '2px solid #27AE60' : '2px solid #e5e7eb', background: !anonymous ? '#f0fdf4' : '#fff' }} onClick={() => setAnonymous(false)}>
                    <UserCheck size={22} color={!anonymous ? '#27AE60' : '#9ca3af'} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{t('sighting.with_contact')}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{t('sighting.with_contact_desc')}</div>
                    </div>
                    {!anonymous && <CheckCheck size={18} style={{ marginLeft: 'auto', color: '#27AE60' }} />}
                  </div>
                </div>
                {!anonymous && (
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={styles.field}>
                      <label style={styles.label}>{t('sighting.name_label')}</label>
                      <input style={styles.input} value={form.reporter_name} onChange={e => set('reporter_name', e.target.value)} placeholder={t('sighting.name_placeholder')} />
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>{t('sighting.phone_label')}</label>
                      <input style={styles.input} value={form.reporter_phone} onChange={e => set('reporter_phone', e.target.value)} placeholder={t('sighting.phone_placeholder')} />
                    </div>
                  </div>
                )}
                <div style={styles.summary}>
                  <div style={styles.summaryTitle}>{t('sighting.summary_title')}</div>
                  <div style={styles.summaryRow}><span>{t('sighting.summary_person')}</span><b>{selectedCase?.name || '—'}</b></div>
                  <div style={styles.summaryRow}><span>{t('sighting.summary_location')}</span><b>{form.location_text || '—'}</b></div>
                  <div style={styles.summaryRow}><span>{t('sighting.summary_confidence')}</span><b>{t(CONFIDENCE.find(c => c.value === form.confidence_level)?.labelKey || '')}</b></div>
                  {imageFile && <div style={styles.summaryRow}><span>{t('sighting.summary_photo')}</span><b>✔ {t('sighting.photo_attached')}</b></div>}
                </div>
                {error && <div style={styles.errorBox}>{error}</div>}
                <button type="submit" style={styles.btnSubmit} disabled={submitting}>
                  {submitting ? t('sighting.submitting') : t('sighting.submit')}
                </button>
              </form>
            )}

            {/* Navigation */}
            {step < 4 && (
              <div style={styles.navRow}>
                {step > 1 && (
                  <button style={styles.btnBack} onClick={() => { setError(''); setStep(s => s - 1); }}>{t('sighting.back')}</button>
                )}
                <button style={{ ...styles.btnPrimary, marginLeft: 'auto' }} onClick={nextStep}>
                  {step === 3 ? t('sighting.almost_done') : t('sighting.next')}
                </button>
              </div>
            )}
            {step === 4 && (
              <button style={styles.btnBack} onClick={() => { setError(''); setStep(3); }}>{t('sighting.back')}</button>
            )}
          </div>
        </div>
      </div>
=======
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
>>>>>>> d090232e24ad7bf8a46350024742f09d0479363e
    </>
  );
}

const styles = {
  page: { minHeight: '100vh', background: 'linear-gradient(160deg,#eafaf1 0%,#f4fdf7 40%,#f9fafb 100%)', padding: '32px 16px 64px' },
  container: { maxWidth: 640, margin: '0 auto' },
  header: { textAlign: 'center', marginBottom: 28 },
  headerIcon: { fontSize: 40, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: 800, color: '#1e3a5f', margin: '0 0 6px' },
  subtitle: { color: '#64748b', fontSize: 14, margin: 0, lineHeight: 1.6 },
  stepBar: { display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 0, marginBottom: 28, position: 'relative' },
  stepItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', flex: 1 },
  stepDot: { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, transition: 'all .2s', zIndex: 1 },
  stepLabel: { fontSize: 11, marginTop: 6, textAlign: 'center', maxWidth: 70 },
  stepLine: { position: 'absolute', top: 16, left: '50%', width: '100%', height: 2, zIndex: 0 },
  card: { background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '28px 24px', boxShadow: '0 4px 20px rgba(0,0,0,.06)' },
  stepTitle: { fontSize: 18, fontWeight: 800, color: '#1e3a5f', margin: '0 0 4px' },
  stepSub: { color: '#64748b', fontSize: 13, margin: '0 0 20px' },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, color: '#111827', background: '#fff', boxSizing: 'border-box', outline: 'none' },
  caseGrid: { display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' },
  caseOption: { padding: '12px 14px', borderRadius: 10, cursor: 'pointer', transition: 'all .15s', position: 'relative' },
  caseOptionCheck: { position: 'absolute', top: 10, right: 12, fontSize: 16 },
  caseOptionName: { fontWeight: 700, fontSize: 15, color: '#1e3a5f', marginBottom: 2 },
  caseOptionMeta: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  caseOptionLoc: { fontSize: 12, color: '#9ca3af' },
  confidenceRow: { display: 'flex', gap: 10 },
  confidenceCard: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 8px', borderRadius: 10, cursor: 'pointer', transition: 'all .15s', textAlign: 'center' },
  dropzone: { display: 'block', border: '2px dashed #cbd5e1', borderRadius: 10, cursor: 'pointer', overflow: 'hidden', minHeight: 80 },
  removeBtn: { background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 6, padding: '3px 12px', fontSize: 12, cursor: 'pointer' },
  anonRow: { display: 'flex', flexDirection: 'column', gap: 10 },
  anonCard: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, cursor: 'pointer', transition: 'all .15s' },
  summary: { background: '#f8fafc', borderRadius: 10, padding: '14px 16px', margin: '20px 0 16px', border: '1px solid #e2e8f0' },
  summaryTitle: { fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 10 },
  summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginBottom: 6 },
  navRow: { display: 'flex', alignItems: 'center', marginTop: 24 },
  btnPrimary: { background: '#27AE60', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 24px', fontWeight: 700, fontSize: 15, cursor: 'pointer' },
  btnBack: { background: 'none', border: '1px solid #d1d5db', color: '#374151', borderRadius: 8, padding: '10px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  btnOutline: { background: '#fff', border: '1px solid #27AE60', color: '#27AE60', borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'block', width: '100%' },
  btnSubmit: { width: '100%', padding: '13px', background: '#27AE60', color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 8 },
  errorBox: { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#991b1b', fontSize: 13, marginBottom: 14 },
  successBox: { background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '48px 32px', textAlign: 'center', maxWidth: 480, margin: '60px auto', boxShadow: '0 4px 20px rgba(0,0,0,.06)' },
  successIcon: { fontSize: 52, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: 800, color: '#1e3a5f', margin: '0 0 10px' },
  successSub: { color: '#64748b', fontSize: 14, lineHeight: 1.7, margin: '0 0 24px' },
};
