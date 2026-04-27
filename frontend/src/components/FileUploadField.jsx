import { useRef, useState } from 'react';

/**
 * Drag-and-drop + click file upload field with client-side validation.
 */
export default function FileUploadField({ id, label, accept, maxSizeMB, fileType, file, onChange }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const validate = (selectedFile) => {
    const allowedTypes = accept.split(',').map((t) => t.trim());
    if (!allowedTypes.includes(selectedFile.type))
      return `Invalid file type. Allowed: ${allowedTypes.join(', ')}`;
    if (selectedFile.size > maxSizeMB * 1024 * 1024)
      return `File too large. Max ${maxSizeMB} MB`;
    return '';
  };

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;
    const err = validate(selectedFile);
    if (err) { setError(err); onChange(null); return; }
    setError('');
    onChange(selectedFile);
  };

  const handleRemove = () => {
    onChange(null); setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const preview = file && fileType === 'photo' ? URL.createObjectURL(file) : null;

  return (
    <div className="file-upload-field">
      <label className="file-upload-label" htmlFor={id}>
        {label} <span className="file-size-hint">(max {maxSizeMB} MB)</span>
      </label>

      {!file ? (
        <div
          className={`drop-zone${dragOver ? ' drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current?.click()}
          role="button" tabIndex={0}
          aria-label={`Upload ${label}`}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        >
          <span className="drop-icon">{fileType === 'photo' ? '🖼️' : '🎥'}</span>
          <span className="drop-text">Drag &amp; drop or <span className="drop-link">browse</span></span>
          <span className="drop-hint">{fileType === 'photo' ? 'JPEG, PNG, WebP' : 'MP4, MOV, WebM'}</span>
        </div>
      ) : (
        <div className="file-preview">
          {fileType === 'photo' && preview && <img src={preview} alt="Preview" className="photo-preview" />}
          {fileType === 'video' && (
            <div className="video-placeholder">
              <span>🎥</span><span className="video-name">{file.name}</span>
            </div>
          )}
          <div className="file-meta">
            <span className="file-name">{file.name}</span>
            <span className="file-size">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
            <span className="file-verified">✅ Ready</span>
          </div>
          <button type="button" className="remove-btn" onClick={handleRemove} aria-label={`Remove ${label}`}>
            ✕ Remove
          </button>
        </div>
      )}

      <input
        ref={inputRef} id={id} type="file" accept={accept}
        onChange={(e) => handleFile(e.target.files[0])}
        className="hidden-input" aria-hidden="true" tabIndex={-1}
      />
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  );
}
