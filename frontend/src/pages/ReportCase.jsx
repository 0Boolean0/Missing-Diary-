import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import { api } from '../api/client';

export default function ReportCase() {
  const nav = useNavigate();
  const [pos, setPos] = useState({ lat: 23.8103, lng: 90.4125 });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: '',
    height: '',
    clothing: '',
    medical_info: '',
    description: '',
    last_seen_location: '',
    last_seen_time: '',
  });
  const [msg, setMsg] = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function handleFiles(e) {
    const selected = e.target.files;
    setFiles(selected);
    const urls = [...selected].map(f => URL.createObjectURL(f));
    setPreviews(urls);
  }

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    setSubmitting(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
    fd.append('last_seen_lat', pos.lat);
    fd.append('last_seen_lng', pos.lng);
    [...files].forEach(f => fd.append('images', f));
    try {
      const { data } = await api.post('/cases', fd);
      nav(`/cases/${data.id}`);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to submit report');
    }
    setSubmitting(false);
  }

  return (
    <>
      <Navbar />
      <main className="container narrow" style={{ paddingBottom: 48 }}>

        {/* Page Header */}
        <div style={{ margin: '28px 0 24px' }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800 }}>🚨 Report Missing Person</h1>
          <p className="muted" style={{ margin: 0 }}>
            Fill in as much detail as possible. Every piece of information helps.
          </p>
        </div>

        {msg && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#991b1b', fontWeight: 600 }}>
            ⚠️ {msg}
          </div>
        )}

        <form onSubmit={submit} style={{ display: 'grid', gap: 24 }}>

          {/* Section 1 — Personal Info */}
          <div className="panel" style={{ padding: 24 }}>
            <h2 style={{ margin: '0 0 18px', fontSize: 17, fontWeight: 800, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 8 }}>
              👤 Personal Information
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Full Name <span style={{ color: 'var(--red)' }}>*</span></label>
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Rahim Uddin"
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="field-label">Age</label>
                <input
                  type="number"
                  value={form.age}
                  onChange={e => set('age', e.target.value)}
                  placeholder="e.g. 25"
                  min="0"
                  max="120"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="field-label">Gender</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} style={{ width: '100%' }}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="field-label">Height</label>
                <input
                  value={form.height}
                  onChange={e => set('height', e.target.value)}
                  placeholder="e.g. 5 ft 6 in"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="field-label">Clothing Description</label>
                <input
                  value={form.clothing}
                  onChange={e => set('clothing', e.target.value)}
                  placeholder="e.g. Blue shirt, black pants"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Medical Information</label>
                <input
                  value={form.medical_info}
                  onChange={e => set('medical_info', e.target.value)}
                  placeholder="Any medical conditions, medications, etc."
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Full Description</label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Describe the person in detail — physical features, habits, who they may be with..."
                  style={{ width: '100%', minHeight: 100 }}
                />
              </div>
            </div>
          </div>

          {/* Section 2 — Last Seen */}
          <div className="panel" style={{ padding: 24 }}>
            <h2 style={{ margin: '0 0 18px', fontSize: 17, fontWeight: 800, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 8 }}>
              📍 Last Seen Details
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Last Seen Location <span style={{ color: 'var(--red)' }}>*</span></label>
                <input
                  value={form.last_seen_location}
                  onChange={e => set('last_seen_location', e.target.value)}
                  placeholder="e.g. Mirpur 10, Dhaka"
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Last Seen Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.last_seen_time}
                  onChange={e => set('last_seen_time', e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Map */}
            <div style={{ marginTop: 16 }}>
              <label className="field-label" style={{ marginBottom: 8, display: 'block' }}>
                📌 Pin on Map <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>(click to set location)</span>
              </label>
              <MapView
                center={[pos.lat, pos.lng]}
                markers={[{ lat: pos.lat, lng: pos.lng, title: 'Last seen location' }]}
                onPick={latlng => setPos(latlng)}
                height={300}
              />
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                📍 Selected: {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
              </p>
            </div>
          </div>

          {/* Section 3 — Photos */}
          <div className="panel" style={{ padding: 24 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>
              📷 Photos
            </h2>
            <p className="muted" style={{ margin: '0 0 14px', fontSize: 13 }}>
              Upload recent photos of the missing person. Multiple photos allowed.
            </p>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFiles}
              style={{ width: '100%' }}
            />
            {previews.length > 0 && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                {previews.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`preview ${i + 1}`}
                    style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 10, border: '2px solid var(--border)' }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            className="btn danger full"
            type="submit"
            disabled={submitting}
            style={{ padding: '14px', fontSize: 16, borderRadius: 12 }}
          >
            {submitting ? '⏳ Submitting...' : '🚨 Submit Missing Person Report'}
          </button>

        </form>
      </main>

      <style>{`
        .field-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 6px;
        }
        @media (max-width: 600px) {
          .report-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
