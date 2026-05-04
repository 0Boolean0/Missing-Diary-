import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import { api } from '../api/client';
import { describePhoto } from '../utils/aiDescriber';
import * as offlineQueue from '../utils/offlineQueue';

// Simple UUID v4 generator (no external dependency needed)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export default function ReportCase() {
  const nav = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pos, setPos] = useState({ lat: 23.8103, lng: 90.4125 });
  const [geocoding, setGeocoding] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('error'); // 'error' | 'success'
  const [photoError, setPhotoError] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [queueCount, setQueueCount] = useState(offlineQueue.getAll().length);

  const [form, setForm] = useState({
    reporter_name: '',
    reporter_phone: '',
    reporter_relation: '',
    name: '',
    name_bn: '',
    age: '',
    gender: '',
    skin_color: '',
    height: '',
    weight: '',
    clothing: '',
    identifying_marks: '',
    medical_info: '',
    description: '',
    last_seen_location: '',
    last_seen_time: '',
  });

  // 14.2: Track online/offline connectivity
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Keep queue count in sync when the custom event fires (from syncQueue)
  useEffect(() => {
    function handleQueueUpdate() {
      setQueueCount(offlineQueue.getAll().length);
    }
    window.addEventListener('offlineQueueUpdated', handleQueueUpdate);
    return () => window.removeEventListener('offlineQueueUpdated', handleQueueUpdate);
  }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function handlePhoto(e) {
    const f = e.target.files[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
    setPhotoError(false);
    setAiGenerated(false);

    // Attempt AI description generation
    setAiLoading(true);
    describePhoto(f).then(description => {
      setAiLoading(false);
      if (description) {
        set('description', description);
        setAiGenerated(true);
      }
    });
  }

  function handleVideo(e) {
    const f = e.target.files[0];
    if (f) setVideoFile(f);
  }

  async function handleMapPick(latlng) {
    setPos(latlng);
    setGeocoding(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json&accept-language=en`,
        { headers: { 'Accept-Language': 'en' }, signal: controller.signal }
      );
      const data = await res.json();
      if (data && data.display_name) {
        // Build a short readable address
        const a = data.address || {};
        const parts = [
          a.road || a.neighbourhood || a.suburb,
          a.city_district || a.suburb || a.town || a.village,
          a.city || a.county,
          a.state,
        ].filter(Boolean);
        const short = parts.length ? parts.join(', ') : data.display_name;
        set('last_seen_location', short);
      }
    } catch {
      // On timeout or error: leave existing value unchanged, no error shown
    } finally {
      clearTimeout(timeout);
      setGeocoding(false);
    }
  }

  // 14.3: Capture GPS and enqueue when offline
  async function submitOffline() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        // No geolocation available — use current map pin position
        resolve(pos);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        () => {
          // On error, fall back to current map pin position
          resolve(pos);
        },
        { timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    setSubmitting(true);

    // 14.3: If offline, capture GPS and enqueue
    if (!isOnline) {
      const gpsPos = await submitOffline();
      const entry = {
        id: generateUUID(),
        timestamp: new Date().toISOString(),
        formData: {
          ...form,
          last_seen_lat: gpsPos.lat,
          last_seen_lng: gpsPos.lng,
          // Photo file cannot be stored in localStorage — store metadata only
          photoFileName: photoFile ? photoFile.name : null,
          photoNote: photoFile ? 'Re-upload required — file cannot be stored offline' : null,
          videoFileName: videoFile ? videoFile.name : null,
        },
      };
      offlineQueue.enqueue(entry);
      const newCount = offlineQueue.getAll().length;
      setQueueCount(newCount);
      window.dispatchEvent(new CustomEvent('offlineQueueUpdated'));
      setMsgType('success');
      setMsg('Your report has been saved and will be submitted when connectivity is restored.');
      setSubmitting(false);
      return;
    }

    // Online path: photo is required
    if (!photoFile) {
      setPhotoError(true);
      setMsgType('error');
      setMsg('A photo is required. Please upload a photo of the missing person.');
      setSubmitting(false);
      return;
    }

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
    fd.append('last_seen_lat', pos.lat);
    fd.append('last_seen_lng', pos.lng);
    if (photoFile) fd.append('images', photoFile);
    if (videoFile) fd.append('video', videoFile);
    try {
      const { data } = await api.post('/cases', fd);
      nav(`/cases/${data.id}`);
    } catch (err) {
      setMsgType('error');
      setMsg(err.response?.data?.message || 'Failed to submit report');
    }
    setSubmitting(false);
  }

  return (
    <>
      <Navbar />
      <div className="rc-page">
        <div className="rc-container">

          {/* Header */}
          <div className="rc-header">
            <h1>🚨 Report Missing Person</h1>
            <p>Fill in as much detail as possible. Every piece of information helps.</p>
          </div>

          {/* 14.2: Offline banner */}
          {!isOnline && (
            <div className="rc-offline-banner">
              📵 You are offline. Your report will be saved and submitted when connectivity is restored.
            </div>
          )}

          {/* 14.5: Pending queue count */}
          {queueCount > 0 && (
            <div className="rc-queue-notice">
              📋 {queueCount} report{queueCount !== 1 ? 's' : ''} pending submission — will be sent when online.
            </div>
          )}

          {msg && (
            <div className={msgType === 'success' ? 'rc-success' : 'rc-error'}>
              {msgType === 'success' ? '✅' : <strong>Error:</strong>} {msg}
            </div>
          )}

          <form onSubmit={submit}>

            {/* ── Section 1: Reporter Info ── */}
            <div className="rc-card">
              <div className="rc-section-title">
                <span>1. Reporter Information</span>
                <div className="rc-section-line" />
              </div>
              <p className="rc-section-sub">Your contact details so authorities can reach you</p>
              <div className="rc-grid-2">
                <div className="rc-field">
                  <label>Your Full Name <span className="req">*</span></label>
                  <input value={form.reporter_name} onChange={e => set('reporter_name', e.target.value)} placeholder="Your name" required />
                </div>
                <div className="rc-field">
                  <label>Phone Number <span className="req">*</span></label>
                  <input value={form.reporter_phone} onChange={e => set('reporter_phone', e.target.value)} placeholder="+880 1XXX-XXXXXX" required />
                </div>
                <div className="rc-field rc-full">
                  <label>Relation to Missing Person <span className="req">*</span></label>
                  <select value={form.reporter_relation} onChange={e => set('reporter_relation', e.target.value)} required>
                    <option value="">Select relation</option>
                    <option value="parent">Parent</option>
                    <option value="sibling">Sibling</option>
                    <option value="spouse">Spouse</option>
                    <option value="relative">Relative</option>
                    <option value="friend">Friend</option>
                    <option value="neighbor">Neighbor</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── Section 2: Missing Person Details ── */}
            <div className="rc-card">
              <div className="rc-section-title">
                <span>2. Missing Person Details</span>
                <div className="rc-section-line" />
              </div>
              <p className="rc-section-sub">Provide detailed information about the missing person</p>
              <div className="rc-grid-2">
                <div className="rc-field">
                  <label>Name (English) <span className="req">*</span></label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name in English" required />
                </div>
                <div className="rc-field">
                  <label>Name (বাংলা)</label>
                  <input value={form.name_bn} onChange={e => set('name_bn', e.target.value)} placeholder="বাংলায় নাম" />
                </div>
                <div className="rc-field">
                  <label>Age <span className="req">*</span></label>
                  <input type="number" value={form.age} onChange={e => set('age', e.target.value)} placeholder="e.g. 25" min="0" max="120" required />
                </div>
                <div className="rc-field">
                  <label>Gender <span className="req">*</span></label>
                  <select value={form.gender} onChange={e => set('gender', e.target.value)} required>
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="rc-field">
                  <label>Skin Color</label>
                  <select value={form.skin_color} onChange={e => set('skin_color', e.target.value)}>
                    <option value="">Select skin color</option>
                    <option value="Fair">Fair</option>
                    <option value="Wheatish">Wheatish</option>
                    <option value="Brown">Brown</option>
                    <option value="Dark">Dark</option>
                  </select>
                </div>
                <div className="rc-field">
                  <label>Height</label>
                  <input value={form.height} onChange={e => set('height', e.target.value)} placeholder="e.g. 5.6 ft" />
                </div>
                <div className="rc-field">
                  <label>Weight</label>
                  <input value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="e.g. 60 kg" />
                </div>
                <div className="rc-field">
                  <label>Clothing Description</label>
                  <input value={form.clothing} onChange={e => set('clothing', e.target.value)} placeholder="e.g. Blue shirt, black pants" />
                </div>
                <div className="rc-field rc-full">
                  <label>Identifying Marks</label>
                  <input value={form.identifying_marks} onChange={e => set('identifying_marks', e.target.value)} placeholder="Scars, tattoos, birthmarks, etc." />
                </div>
                <div className="rc-field rc-full">
                  <label>Medical Information</label>
                  <input value={form.medical_info} onChange={e => set('medical_info', e.target.value)} placeholder="Any medical conditions, medications, etc." />
                </div>
                <div className="rc-field rc-full">
                  <label>Additional Description</label>
                  {aiGenerated && (
                    <div style={{ fontSize: 12, color: '#7c3aed', marginBottom: 4, fontWeight: 600 }}>
                      ✨ AI-generated — you may edit this
                    </div>
                  )}
                  {aiLoading && (
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                      ✨ Generating description...
                    </div>
                  )}
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the person in detail — physical features, habits, who they may be with..." rows={4} />
                </div>
              </div>
            </div>

            {/* ── Section 3: Last Seen ── */}
            <div className="rc-card">
              <div className="rc-section-title">
                <span>3. Last Seen Information</span>
                <div className="rc-section-line" />
              </div>
              <p className="rc-section-sub">When and where was the person last seen?</p>
              <div className="rc-grid-2">
                <div className="rc-field">
                  <label>Last Seen Location <span className="req">*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      value={form.last_seen_location}
                      onChange={e => set('last_seen_location', e.target.value)}
                      placeholder="Pin on map or type manually"
                      required
                      style={{ paddingRight: geocoding ? 36 : 12 }}
                    />
                    {geocoding && (
                      <span style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 14, color: '#27AE60'
                      }}>⏳</span>
                    )}
                  </div>
                </div>
                <div className="rc-field">
                  <label>Date &amp; Time</label>
                  <input type="datetime-local" value={form.last_seen_time} onChange={e => set('last_seen_time', e.target.value)} />
                </div>
              </div>
              <div className="rc-map-label">
                Pin Location on Map <span className="rc-map-hint">(Click on the map — address will auto-fill above)</span>
              </div>
              <MapView
                center={[pos.lat, pos.lng]}
                markers={[{ lat: pos.lat, lng: pos.lng, title: 'Last seen location' }]}
                onPick={handleMapPick}
                height={300}
                draggable={true}
              />
              <p className="rc-coords">📍 {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</p>
            </div>

            {/* ── Section 4: Photos & Videos ── */}
            <div className="rc-card">
              <div className="rc-section-title">
                <span>4. Photos &amp; Videos</span>
                <div className="rc-section-line" />
              </div>
              <p className="rc-section-sub">Upload recent photos or videos to help identify the person</p>
              {isOnline ? null : (
                <p className="rc-offline-note">
                  📵 Photo files cannot be stored offline. The file name will be saved — you will need to re-upload the photo when submitting online.
                </p>
              )}
              <div className="rc-grid-2">
                {/* Photo */}
                <div className="rc-field">
                  <label>Photo <span className="rc-file-hint">(Max 10MB)</span></label>
                  <label className={`rc-dropzone${photoError ? ' rc-dropzone-error' : ''}`} htmlFor="photo-input">
                    {photoPreview ? (
                      <div className="rc-photo-preview">
                        <img src={photoPreview} alt="preview" />
                        <div className="rc-photo-meta">
                          <span className="rc-filename">{photoFile?.name}</span>
                          <span className="rc-ready">✔ Ready</span>
                        </div>
                        <button type="button" className="rc-remove-btn" onClick={e => { e.preventDefault(); setPhotoFile(null); setPhotoPreview(null); }}>Remove</button>
                      </div>
                    ) : (
                      <div className="rc-dropzone-inner">
                        <span className="rc-drop-icon">🖼️</span>
                        <span>Drag &amp; drop or <span className="rc-browse">browse</span></span>
                        <span className="rc-drop-hint">jpg, png, webp</span>
                        {photoError && <span className="rc-drop-required">Photo is required</span>}
                      </div>
                    )}
                  </label>
                  <input id="photo-input" type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
                </div>

                {/* Video */}
                <div className="rc-field">
                  <label>Video <span className="rc-file-hint">(Max 30MB)</span></label>
                  <label className="rc-dropzone" htmlFor="video-input">
                    {videoFile ? (
                      <div className="rc-photo-preview">
                        <div className="rc-video-icon">🎬</div>
                        <div className="rc-photo-meta">
                          <span className="rc-filename">{videoFile.name}</span>
                          <span className="rc-ready">✔ Ready</span>
                        </div>
                        <button type="button" className="rc-remove-btn" onClick={e => { e.preventDefault(); setVideoFile(null); }}>Remove</button>
                      </div>
                    ) : (
                      <div className="rc-dropzone-inner">
                        <span className="rc-drop-icon">🎬</span>
                        <span>Drag &amp; drop or <span className="rc-browse">browse</span></span>
                        <span className="rc-drop-hint">mp4, quicktime, webm</span>
                      </div>
                    )}
                  </label>
                  <input id="video-input" type="file" accept="video/*" onChange={handleVideo} style={{ display: 'none' }} />
                </div>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" className="rc-btn-submit" disabled={submitting}>
              {submitting
                ? '⏳ Submitting...'
                : isOnline
                  ? '🚨 Submit Report'
                  : '💾 Save Report (Offline)'}
            </button>
            <p className="rc-required-note">* Required fields</p>

          </form>
        </div>
      </div>

      <style>{`
        .rc-page {
          min-height: 100vh;
          background: linear-gradient(160deg, #eafaf1 0%, #f4fdf7 40%, #f9fafb 100%);
          padding: 32px 16px 64px;
        }
        .rc-container {
          max-width: 860px;
          margin: 0 auto;
        }
        .rc-header {
          text-align: center;
          margin-bottom: 24px;
        }
        .rc-header h1 {
          font-size: 26px;
          font-weight: 800;
          color: #1e3a5f;
          margin: 0 0 6px;
        }
        .rc-header p {
          color: #64748b;
          font-size: 14px;
          margin: 0;
        }
        .rc-offline-banner {
          background: #fef3c7;
          border: 1px solid #fbbf24;
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 16px;
          color: #92400e;
          font-size: 14px;
          font-weight: 600;
        }
        .rc-queue-notice {
          background: #eff6ff;
          border: 1px solid #93c5fd;
          border-radius: 10px;
          padding: 10px 16px;
          margin-bottom: 16px;
          color: #1e40af;
          font-size: 13px;
          font-weight: 600;
        }
        .rc-offline-note {
          background: #fef9c3;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 12px;
          color: #713f12;
          margin: 0 0 12px;
        }
        .rc-card {
          background: #fff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 28px 28px 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 12px rgba(0,0,0,.05);
        }
        .rc-section-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 4px;
        }
        .rc-section-title span {
          font-size: 16px;
          font-weight: 800;
          color: #1e3a5f;
          white-space: nowrap;
        }
        .rc-section-line {
          flex: 1;
          height: 2px;
          background: linear-gradient(90deg, #27AE60 0%, transparent 100%);
          border-radius: 2px;
        }
        .rc-section-sub {
          color: #64748b;
          font-size: 13px;
          margin: 0 0 18px;
        }
        .rc-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .rc-full { grid-column: 1 / -1; }
        .rc-field label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
        }
        .rc-field input,
        .rc-field select,
        .rc-field textarea {
          width: 100%;
          padding: 9px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          color: #111827;
          background: #fff;
          box-sizing: border-box;
          transition: border-color .15s;
          outline: none;
        }
        .rc-field input:focus,
        .rc-field select:focus,
        .rc-field textarea:focus {
          border-color: #27AE60;
          box-shadow: 0 0 0 3px rgba(39,174,96,.12);
        }
        .rc-field textarea { resize: vertical; }
        .req { color: #ef4444; }
        .rc-file-hint { color: #94a3b8; font-weight: 400; font-size: 12px; }
        .rc-map-label {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin: 16px 0 8px;
        }
        .rc-map-hint { color: #94a3b8; font-weight: 400; }
        .rc-coords { font-size: 12px; color: #64748b; margin: 6px 0 0; }
        .rc-dropzone {
          display: block;
          border: 2px dashed #cbd5e1;
          border-radius: 10px;
          cursor: pointer;
          transition: border-color .15s;
          min-height: 140px;
          overflow: hidden;
        }
        .rc-dropzone:hover { border-color: #27AE60; }
        .rc-dropzone-error { border-color: #ef4444; background: #fef2f2; }
        .rc-dropzone-error:hover { border-color: #dc2626; }
        .rc-drop-required { color: #ef4444; font-size: 12px; font-weight: 600; }
        .rc-dropzone-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 28px 16px;
          color: #64748b;
          font-size: 13px;
          text-align: center;
          min-height: 140px;
        }
        .rc-drop-icon { font-size: 28px; }
        .rc-drop-hint { font-size: 11px; color: #94a3b8; }
        .rc-browse { color: #27AE60; text-decoration: underline; }
        .rc-photo-preview {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .rc-photo-preview img {
          width: 100%;
          height: 120px;
          object-fit: cover;
          border-radius: 8px;
        }
        .rc-video-icon {
          font-size: 40px;
          text-align: center;
          padding: 20px 0 8px;
        }
        .rc-photo-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: #374151;
        }
        .rc-filename {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 140px;
        }
        .rc-ready { color: #16a34a; font-weight: 700; }
        .rc-remove-btn {
          background: none;
          border: 1px solid #ef4444;
          color: #ef4444;
          border-radius: 6px;
          padding: 4px 12px;
          font-size: 12px;
          cursor: pointer;
          align-self: flex-start;
        }
        .rc-remove-btn:hover { background: #fef2f2; }
        .rc-btn-submit {
          width: 100%;
          padding: 14px;
          background: #27AE60;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          margin-bottom: 8px;
          transition: background .15s;
        }
        .rc-btn-submit:hover:not(:disabled) { background: #1e8449; }
        .rc-btn-submit:disabled { opacity: .6; cursor: not-allowed; }
        .rc-required-note {
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
        }
        .rc-error {
          background: #fef2f2;
          border: 1px solid #fca5a5;
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 16px;
          color: #991b1b;
          font-size: 14px;
        }
        .rc-success {
          background: #f0fdf4;
          border: 1px solid #86efac;
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 16px;
          color: #166534;
          font-size: 14px;
          font-weight: 600;
        }
        @media (max-width: 600px) {
          .rc-grid-2 { grid-template-columns: 1fr; }
          .rc-full { grid-column: 1; }
          .rc-card { padding: 18px 16px; }
        }
      `}</style>
    </>
  );
}
