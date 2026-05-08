import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconEye = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconCamera = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

export default function PoliceCaseCard({ item, onStatusUpdate }) {
  const img = item.images?.[0] || 'https://placehold.co/300x240?text=No+Photo';
  const statusLabel = item.status === 'active' ? 'Active' : item.status === 'found' ? 'Found' : item.status;

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  async function submitFoundPhoto() {
    if (!uploadFile) {
      setUploadError('Please select a photo before submitting.');
      return;
    }
    setUploadError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', uploadFile);
      await api.post(`/cases/${item.id}/found-photo`, fd);
      // Notify parent to update status in list
      onStatusUpdate(item.id, 'found');
      setUploadOpen(false);
      setUploadFile(null);
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Failed to upload photo.');
    }
    setUploading(false);
  }

  return (
    <div className="case-card">
      <img src={img} alt={item.name} />
      <div className="case-body">
        <div className="row between" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>{item.name}</h3>
          <span className={`badge ${item.status}`}>{statusLabel}</span>
        </div>
        <p>Age: {item.age || 'Unknown'}</p>
        <p>Last seen: {item.last_seen_location}</p>

        <div className="row gap" style={{ marginTop: 14, flexWrap: 'wrap' }}>
          {item.status !== 'found' ? (
            <>
              {/* Mark as Found — opens photo upload form */}
              <button
                onClick={() => setUploadOpen(prev => !prev)}
                style={{
                  flex: 1, fontSize: 13, padding: '8px 12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
                }}
              >
                <IconCamera /> Mark as Found
              </button>
              <button
                className="btn outline"
                onClick={() => onStatusUpdate(item.id, 'active')}
                style={{ flex: 1, fontSize: 13, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <IconSearch /> Not Found
              </button>
            </>
          ) : (
            <Link
              to={`/cases/${item.id}`}
              style={{
                flex: 1, fontSize: 13, padding: '8px 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #86efac',
                borderRadius: 8, textDecoration: 'none', fontWeight: 600,
              }}
            >
              🔍 View Found Photo
            </Link>
          )}
        </div>

        {/* Inline photo upload form — only for police, only when not yet found */}
        {uploadOpen && item.status !== 'found' && (
          <div style={{ marginTop: 12, padding: '12px 14px', background: '#f0fdf4', borderRadius: 10, border: '1.5px solid #86efac' }}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, color: '#15803d' }}>
              Upload Found-Person Photo
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'block', marginBottom: 8, fontSize: 13 }}
              onChange={e => {
                setUploadFile(e.target.files?.[0] || null);
                setUploadError('');
              }}
            />
            {uploadError && (
              <p style={{ color: '#dc2626', fontSize: 12, margin: '0 0 8px' }}>{uploadError}</p>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={submitFoundPhoto}
                disabled={uploading}
                style={{
                  fontSize: 13, padding: '7px 16px', background: '#16a34a', color: '#fff',
                  border: 'none', borderRadius: 999, cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 600,
                }}
              >
                {uploading ? 'Uploading...' : 'Submit'}
              </button>
              <button
                onClick={() => { setUploadOpen(false); setUploadError(''); setUploadFile(null); }}
                style={{
                  fontSize: 13, padding: '7px 14px', background: '#f3f4f6', color: '#374151',
                  border: 'none', borderRadius: 999, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 8 }}>
          <Link
            className="btn"
            to={`/cases/${item.id}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--green)', fontSize: 13, padding: '8px 12px' }}
          >
            <IconEye /> View Details
          </Link>
        </div>
      </div>
    </div>
  );
}
