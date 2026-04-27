import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MapView from '../components/MapView';
import FileUploadField from '../components/FileUploadField';
import { api } from '../api/client';
import { useLang } from '../context/LangContext';
import { t } from '../i18n/report';

const INITIAL = {
  guardian_name: '', guardian_phone: '', guardian_email: '',
  guardian_relation: '', guardian_nid: '',
  name: '', name_bn: '', age: '', gender: '', skin_color: '',
  height: '', weight: '', clothing: '',
  identifying_marks: '', medical_info: '', description: '',
  last_seen_location: '', last_seen_time: '',
};

export default function ReportCase() {
  const nav = useNavigate();
  const formRef = useRef(null);
  const { lang, setLang } = useLang();
  const T = t[lang];

  const [form, setForm] = useState(INITIAL);
  const [pos, setPos] = useState({ lat: 23.8103, lng: 90.4125 });
  const [photo, setPhoto] = useState(null);
  const [video, setVideo] = useState(null);
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [submitted, setSubmitted] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.guardian_name.trim()) e.guardian_name = T.valName;
    if (!form.guardian_phone.trim()) e.guardian_phone = T.valPhone;
    if (!form.guardian_relation) e.guardian_relation = T.valRelation;
    if (form.guardian_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.guardian_email))
      e.guardian_email = T.valEmail;
    if (!form.name.trim()) e.name = T.valMissingName;
    if (!form.age || isNaN(form.age) || form.age < 0 || form.age > 120)
      e.age = T.valAge;
    if (!form.gender) e.gender = T.valGender;
    if (!form.last_seen_location.trim()) e.last_seen_location = T.valLocation;
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(''); setProgress(0);
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    // fallback: if location text is empty, use coordinates
    if (!form.last_seen_location.trim()) {
      fd.set('last_seen_location', `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`);
    }
    fd.append('last_seen_lat', pos.lat);
    fd.append('last_seen_lng', pos.lng);
    if (photo) fd.append('images', photo);
    if (video) fd.append('video', video);
    try {
      setLoading(true);
      const { data } = await api.post('/cases', fd, {
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      });
      setSubmitted(data);
    } catch (err) {
      setMsg(err.response?.data?.message || T.valSubmitFail);
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <>
        <Navbar />
        <main className="container narrow">
          <div className="success-card">
            <div className="success-icon">✅</div>
            <h2>{T.successTitle}</h2>
            <p>{T.successMsg}</p>
            <div className="submission-id">
              <span>{T.caseId}:</span>
              <strong>{submitted.id}</strong>
            </div>
            <div className="file-status-section">
              <h3>{T.fileStatus}</h3>
              <ul className="file-status-list">
                <li className={photo ? 'status-ok' : 'status-none'}>
                  🖼️ <strong>{T.photoStatus}</strong> — {photo ? T.uploaded : T.notProvided}
                </li>
                <li className={video ? 'status-ok' : 'status-none'}>
                  🎥 <strong>{T.videoStatus}</strong> — {video ? T.uploaded : T.notProvided}
                </li>
              </ul>
            </div>
            <div className="row gap" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
              <button className="btn" onClick={() => nav(`/cases/${submitted.id}`)}>{T.viewCase}</button>
              <button className="btn" onClick={() => { setSubmitted(null); setForm(INITIAL); setPhoto(null); setVideo(null); }}>
                {T.submitAnother}
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <>
      <Navbar />

      {/* Header Banner */}
      <div className="report-banner">
        <div className="report-banner-inner">
          <h1>{T.bannerTitle}</h1>
          <p>{T.bannerSub}</p>
          <p className="report-banner-note">{T.bannerEmergency}</p>
        </div>
      </div>

      <main className="container narrow">
        <form ref={formRef} className="guardian-form" onSubmit={handleSubmit} noValidate>

          {/* ── Section 1: Contact Info ── */}
          <section className="form-section">
            <div className="section-header-row">
              <h2>{T.secContact}</h2>
              <button
                type="button"
                className="lang-toggle-inline"
                onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
              >
                {lang === 'en' ? '🇧🇩 বাংলা' : '🇬🇧 English'}
              </button>
            </div>
            <p className="section-hint">{T.secContactHint}</p>

            <div className="form-group">
              <label htmlFor="guardian_name">{T.fullName} <span className="required">*</span></label>
              <input id="guardian_name" name="guardian_name" type="text"
                value={form.guardian_name} onChange={handleChange}
                aria-invalid={!!errors.guardian_name}
                placeholder={T.phFullName} autoComplete="name" />
              {errors.guardian_name && <span className="field-error" role="alert">{errors.guardian_name}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="guardian_phone">{T.phone} <span className="required">*</span></label>
                <input id="guardian_phone" name="guardian_phone" type="tel"
                  value={form.guardian_phone} onChange={handleChange}
                  aria-invalid={!!errors.guardian_phone}
                  placeholder={T.phPhone} autoComplete="tel" />
                {errors.guardian_phone && <span className="field-error" role="alert">{errors.guardian_phone}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="guardian_email">{T.email}</label>
                <input id="guardian_email" name="guardian_email" type="email"
                  value={form.guardian_email} onChange={handleChange}
                  aria-invalid={!!errors.guardian_email}
                  placeholder={T.phEmail} autoComplete="email" />
                {errors.guardian_email && <span className="field-error" role="alert">{errors.guardian_email}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="guardian_relation">{T.relation} <span className="required">*</span></label>
                <select id="guardian_relation" name="guardian_relation"
                  value={form.guardian_relation} onChange={handleChange}
                  aria-invalid={!!errors.guardian_relation}>
                  <option value="">{T.relationPlaceholder}</option>
                  <option value="parent">{T.relParent}</option>
                  <option value="guardian">{T.relGuardian}</option>
                  <option value="sibling">{T.relSibling}</option>
                  <option value="relative">{T.relRelative}</option>
                  <option value="teacher">{T.relTeacher}</option>
                  <option value="neighbor">{T.relNeighbor}</option>
                  <option value="other">{T.relOther}</option>
                </select>
                {errors.guardian_relation && <span className="field-error" role="alert">{errors.guardian_relation}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="guardian_nid">{T.nid}</label>
                <input id="guardian_nid" name="guardian_nid" type="text"
                  value={form.guardian_nid} onChange={handleChange}
                  placeholder={T.phNid} />
              </div>
            </div>
          </section>

          {/* ── Section 2: Missing Person Info ── */}
          <section className="form-section">
            <h2>{T.secMissing}</h2>
            <p className="section-hint">{T.secMissingHint}</p>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">{T.nameEn} <span className="required">*</span></label>
                <input id="name" name="name" type="text"
                  value={form.name} onChange={handleChange}
                  aria-invalid={!!errors.name}
                  placeholder={T.phNameEn} />
                {errors.name && <span className="field-error" role="alert">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="name_bn">{T.nameBn}</label>
                <input id="name_bn" name="name_bn" type="text"
                  value={form.name_bn} onChange={handleChange}
                  placeholder={T.phNameBn} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="age">{T.age} <span className="required">*</span></label>
                <input id="age" name="age" type="number" min="0" max="120"
                  value={form.age} onChange={handleChange}
                  aria-invalid={!!errors.age}
                  placeholder={T.phAge} />
                {errors.age && <span className="field-error" role="alert">{errors.age}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="gender">{T.gender} <span className="required">*</span></label>
                <select id="gender" name="gender" value={form.gender} onChange={handleChange}
                  aria-invalid={!!errors.gender}>
                  <option value="">{T.genderPlaceholder}</option>
                  <option value="male">{T.genderMale}</option>
                  <option value="female">{T.genderFemale}</option>
                  <option value="other">{T.genderOther}</option>
                </select>
                {errors.gender && <span className="field-error" role="alert">{errors.gender}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="skin_color">{T.skinColor}</label>
                <select id="skin_color" name="skin_color" value={form.skin_color} onChange={handleChange}>
                  <option value="">{T.skinPlaceholder}</option>
                  <option value="fair">{T.skinFair}</option>
                  <option value="wheatish">{T.skinWheatish}</option>
                  <option value="dark">{T.skinDark}</option>
                  <option value="very_dark">{T.skinVeryDark}</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="height">{T.height}</label>
                <input id="height" name="height" type="text"
                  value={form.height} onChange={handleChange}
                  placeholder={T.phHeight} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="weight">{T.weight}</label>
                <input id="weight" name="weight" type="text"
                  value={form.weight} onChange={handleChange}
                  placeholder={T.phWeight} />
              </div>
              <div className="form-group">
                <label htmlFor="clothing">{T.clothing}</label>
                <input id="clothing" name="clothing" type="text"
                  value={form.clothing} onChange={handleChange}
                  placeholder={T.phClothing} />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="identifying_marks">{T.identifyingMarks}</label>
              <input id="identifying_marks" name="identifying_marks" type="text"
                value={form.identifying_marks} onChange={handleChange}
                placeholder={T.phMarks} />
            </div>

            <div className="form-group">
              <label htmlFor="medical_info">{T.medicalInfo}</label>
              <input id="medical_info" name="medical_info" type="text"
                value={form.medical_info} onChange={handleChange}
                placeholder={T.phMedical} />
            </div>

            <div className="form-group">
              <label htmlFor="description">{T.description}</label>
              <textarea id="description" name="description"
                value={form.description} onChange={handleChange}
                rows={4} placeholder={T.phDescription} />
            </div>
          </section>

          {/* ── Section 3: Last Seen ── */}
          <section className="form-section">
            <h2>{T.secLastSeen}</h2>
            <p className="section-hint">{T.secLastSeenHint}</p>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="last_seen_location">{T.location} <span className="required">*</span></label>
                <input id="last_seen_location" name="last_seen_location" type="text"
                  value={form.last_seen_location} onChange={handleChange}
                  aria-invalid={!!errors.last_seen_location}
                  placeholder={T.phLocation} />
                {errors.last_seen_location && <span className="field-error" role="alert">{errors.last_seen_location}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="last_seen_time">{T.dateTime}</label>
                <input id="last_seen_time" name="last_seen_time" type="datetime-local"
                  value={form.last_seen_time} onChange={handleChange}
                  max={new Date().toISOString().slice(0, 16)} />
              </div>
            </div>

            <div className="form-group">
              <label>{T.mapLabel} <span className="section-hint" style={{ fontWeight: 400 }}>{T.mapHint}</span></label>
              <MapView
                center={[pos.lat, pos.lng]}
                markers={[{ lat: pos.lat, lng: pos.lng, title: T.location }]}
                onPick={(latlng) => setPos(latlng)}
                height={280}
              />
            </div>
          </section>

          {/* ── Section 4: Media ── */}
          <section className="form-section">
            <h2>{T.secMedia}</h2>
            <p className="section-hint">{T.secMediaHint}</p>
            <div className="form-row uploads-row">
              <FileUploadField
                id="photo-upload" label={T.photoLabel}
                accept="image/jpeg,image/png,image/webp"
                maxSizeMB={10} fileType="photo"
                file={photo} onChange={setPhoto}
              />
              <FileUploadField
                id="video-upload" label={T.videoLabel}
                accept="video/mp4,video/quicktime,video/webm"
                maxSizeMB={30} fileType="video"
                file={video} onChange={setVideo}
              />
            </div>
          </section>

          {loading && progress > 0 && (
            <div className="progress-bar-wrap" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="progress-bar" style={{ width: `${progress}%` }} />
              <span className="progress-label">{T.uploadedPct(progress)}</span>
            </div>
          )}

          {msg && <div className="submit-error" role="alert"><strong>{T.errorLabel}:</strong> {msg}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? T.submitting : T.submit}
          </button>
          <p className="required-note"><span className="required">*</span> {T.required}</p>
        </form>
      </main>
    </>
  );
}
