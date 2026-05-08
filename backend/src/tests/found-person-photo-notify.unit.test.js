/**
 * Unit Tests (Example-Based) — found-person-photo-notify
 *
 * Tests Tasks 10.1–10.4:
 *   10.1 uploadFoundPhoto returns 400 when req.file is absent
 *   10.2 uploadFoundPhoto returns 404 when case does not exist
 *   10.3 uploadFoundPhoto skips notification INSERT when guardian_id is null
 *   10.4 getFoundPhotos returns 200 with [] when no photos exist for a found case
 *
 * Uses jest.unstable_mockModule + dynamic import (same pattern as the property tests).
 */

import { jest, test, expect, describe, beforeEach } from '@jest/globals';

// ── Mock setup ────────────────────────────────────────────────────────────────

const mockQuery = jest.fn();
const mockUploadBufferToCloudinary = jest.fn();

jest.unstable_mockModule('../config/db.js', () => ({
  query: mockQuery,
}));

jest.unstable_mockModule('../utils/cloudinaryUpload.js', () => ({
  uploadBufferToCloudinary: mockUploadBufferToCloudinary,
}));

// Dynamically import controllers AFTER mocks are set up
const { uploadFoundPhoto, getFoundPhotos } = await import('../controllers/foundPhotoController.js');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a mock res object that captures status code and json body.
 * res.status() returns res so .json() can be chained.
 */
function makeRes() {
  const res = {
    _status: null,
    _body: null,
    status(code) {
      this._status = code;
      return this;
    },
    json(body) {
      this._body = body;
      return this;
    },
  };
  return res;
}

// ── Test 10.1: uploadFoundPhoto returns 400 when req.file is absent ───────────

/**
 * Validates: Requirements 1.3
 *
 * WHEN a Police_Officer submits a request without an image file,
 * THE Photo_Upload_Endpoint SHALL return HTTP 400 with a descriptive error message.
 */
describe('Task 10.1: uploadFoundPhoto returns 400 when req.file is absent', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockUploadBufferToCloudinary.mockReset();
  });

  test('returns HTTP 400 with descriptive message when req.file is undefined', async () => {
    const req = {
      params: { id: 'case-uuid-123' },
      user: { id: 'officer-uuid-456' },
      file: undefined,
    };
    const res = makeRes();
    const next = jest.fn();

    await uploadFoundPhoto(req, res, next);

    expect(res._status).toBe(400);
    expect(res._body).toEqual({ message: 'No image file provided. Please attach a photo.' });
  });

  test('makes no DB calls when req.file is absent', async () => {
    const req = {
      params: { id: 'case-uuid-123' },
      user: { id: 'officer-uuid-456' },
      file: undefined,
    };
    const res = makeRes();
    const next = jest.fn();

    await uploadFoundPhoto(req, res, next);

    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockUploadBufferToCloudinary).not.toHaveBeenCalled();
  });
});

// ── Test 10.2: uploadFoundPhoto returns 404 when case does not exist ──────────

/**
 * Validates: Requirements 1.4
 *
 * IF the Case identified by :id does not exist,
 * THEN THE Photo_Upload_Endpoint SHALL return HTTP 404 with the message "Case not found".
 */
describe('Task 10.2: uploadFoundPhoto returns 404 when case does not exist', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockUploadBufferToCloudinary.mockReset();
  });

  test('returns HTTP 404 with "Case not found" when DB returns empty rows', async () => {
    // DB returns no rows for the case lookup
    mockQuery.mockResolvedValue({ rows: [] });

    const req = {
      params: { id: 'nonexistent-case-uuid' },
      user: { id: 'officer-uuid-456' },
      file: {
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('fake-image-data'),
      },
    };
    const res = makeRes();
    const next = jest.fn();

    await uploadFoundPhoto(req, res, next);

    expect(res._status).toBe(404);
    expect(res._body).toEqual({ message: 'Case not found' });
  });

  test('does not call Cloudinary when case does not exist', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const req = {
      params: { id: 'nonexistent-case-uuid' },
      user: { id: 'officer-uuid-456' },
      file: {
        mimetype: 'image/png',
        size: 2048,
        buffer: Buffer.from('fake-image-data'),
      },
    };
    const res = makeRes();
    const next = jest.fn();

    await uploadFoundPhoto(req, res, next);

    expect(mockUploadBufferToCloudinary).not.toHaveBeenCalled();
  });
});

// ── Test 10.3: uploadFoundPhoto skips notification INSERT when guardian_id is null ──

/**
 * Validates: Requirements 2.4
 *
 * IF the Case has no guardian_id (the guardian account was deleted),
 * THEN THE System SHALL skip notification creation and SHALL NOT return an error.
 */
describe('Task 10.3: uploadFoundPhoto skips notification INSERT when guardian_id is null', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockUploadBufferToCloudinary.mockReset();
  });

  test('returns HTTP 201 and does not INSERT into notifications when guardian_id is null', async () => {
    const caseId = 'case-uuid-no-guardian';
    const userId = 'officer-uuid-456';

    const fakeCase = {
      id: caseId,
      name: 'John Doe',
      status: 'active',
      guardian_id: null,
    };

    const queryCalls = [];
    mockQuery.mockImplementation(async (sql, params) => {
      queryCalls.push({ sql, params });
      if (sql.includes('SELECT * FROM missing_persons')) {
        return { rows: [fakeCase] };
      }
      if (sql.includes('INSERT INTO found_person_photos')) {
        return {
          rows: [{
            id: 'photo-uuid-789',
            missing_person_id: caseId,
            uploaded_by: userId,
            image_url: 'https://cloudinary.com/fake-photo',
            public_id: 'missing-diary/found-persons/fake',
            created_at: new Date().toISOString(),
          }],
        };
      }
      return { rows: [] };
    });

    mockUploadBufferToCloudinary.mockResolvedValue({
      secure_url: 'https://cloudinary.com/fake-photo',
      public_id: 'missing-diary/found-persons/fake',
    });

    const req = {
      params: { id: caseId },
      user: { id: userId },
      file: {
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('fake-image-data'),
      },
    };
    const res = makeRes();
    const next = jest.fn();

    await uploadFoundPhoto(req, res, next);

    // Should succeed with 201
    expect(res._status).toBe(201);
    expect(next).not.toHaveBeenCalled();

    // Notifications INSERT must NOT have been called
    const notifCall = queryCalls.find(c => c.sql.includes('INSERT INTO notifications'));
    expect(notifCall).toBeUndefined();
  });
});

// ── Test 10.4: getFoundPhotos returns 200 with [] when no photos exist ────────

/**
 * Validates: Requirements 5.3
 *
 * WHEN a request is made to GET /api/cases/:id/found-photos for a Case with no Found_Photos,
 * THE System SHALL return HTTP 200 with an empty JSON array [].
 */
describe('Task 10.4: getFoundPhotos returns 200 with [] when no photos exist for a found case', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockUploadBufferToCloudinary.mockReset();
  });

  test('returns HTTP 200 with empty array when case exists with status "found" but has no photos', async () => {
    const caseId = 'case-uuid-found-no-photos';

    mockQuery.mockImplementation(async (sql) => {
      if (sql.includes('SELECT id, status FROM missing_persons')) {
        return { rows: [{ id: caseId, status: 'found' }] };
      }
      if (sql.includes('SELECT id, image_url, public_id, created_at FROM found_person_photos')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const req = {
      params: { id: caseId },
      user: { id: 'guardian-uuid-123' },
    };
    const res = makeRes();
    const next = jest.fn();

    await getFoundPhotos(req, res, next);

    // HTTP 200 is the default when res.json() is called without res.status()
    expect(res._status).toBeNull(); // no explicit status set means 200
    expect(res._body).toEqual([]);
    expect(next).not.toHaveBeenCalled();
  });
});
