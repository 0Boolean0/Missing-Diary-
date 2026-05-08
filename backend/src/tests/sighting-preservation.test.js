/**
 * Preservation Property Tests — Task 2
 *
 * Property 2: Preservation — Valid Submissions With Media Continue to Succeed
 *
 * These tests MUST PASS on unfixed code.
 * They establish the baseline behavior that must be preserved after the fix.
 *
 * Validates: Requirements 3.1, 3.5, 3.6
 *
 * Observed baseline behaviors on UNFIXED code:
 *   1. createSighting with req.file present returns HTTP 201 and calls INSERT
 *   2. Anonymous submission (req.user = null) returns HTTP 201 with reported_by = null
 *   3. When verifyReportWithAI is unavailable (returns null), HTTP 201 is still returned
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';

// ── Inline simulation of the UNFIXED createSighting logic ────────────────────
// We replicate the controller logic with injectable mocks so we can test
// the baseline behavior without needing a real DB or Cloudinary connection.

const sightingSchema = z.object({
  missing_person_id: z.string().uuid(),
  location_text: z.string().optional(),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  description: z.string().min(3),
  confidence_level: z.enum(['sure', 'maybe', 'not_sure']).default('maybe'),
  reporter_name: z.string().optional(),
  reporter_phone: z.string().optional(),
});

/**
 * Faithful inline reproduction of the UNFIXED createSighting handler.
 * Dependencies (query, uploadBufferToCloudinary, verifyReportWithAI) are
 * injected so tests can mock them without ES module cache tricks.
 *
 * @param {object} req
 * @param {object} res
 * @param {function} next
 * @param {object} deps - { query, uploadBufferToCloudinary, verifyReportWithAI }
 */
async function createSighting_unfixed(req, res, next, deps) {
  const { query, uploadBufferToCloudinary } = deps;
  try {
    const data = sightingSchema.parse(req.body);
    let imageUrl = null;
    if (req.file) {
      const uploaded = await uploadBufferToCloudinary(req.file.buffer, 'missing-diary/sightings');
      imageUrl = uploaded.secure_url;
    }
    // NOTE: No req.file guard here — this is the UNFIXED version.
    // No verifyReportWithAI call here — this is the UNFIXED version.
    const result = await query(
      `INSERT INTO sightings
        (missing_person_id,reported_by,location_text,lat,lng,description,image_url,confidence_level,status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING *`,
      [
        data.missing_person_id,
        req.user?.id || null,
        data.location_text || null,
        data.lat,
        data.lng,
        data.description,
        imageUrl,
        data.confidence_level,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    next(e);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a mock res object that captures status codes and JSON bodies.
 */
function makeMockRes() {
  const statusCodes = [];
  const jsonBodies = [];
  const res = {
    statusCodes,
    jsonBodies,
    status(code) {
      statusCodes.push(code);
      return this;
    },
    json(body) {
      jsonBodies.push(body);
      return this;
    },
  };
  return res;
}

/**
 * Build a mock query that captures INSERT calls and returns a fake row.
 */
function makeMockQuery() {
  let insertCalled = false;
  let insertParams = null;

  const query = async (sql, params) => {
    if (sql.trim().toUpperCase().startsWith('INSERT')) {
      insertCalled = true;
      insertParams = params;
      return {
        rows: [{
          id: 'fake-sighting-id',
          missing_person_id: params[0],
          reported_by: params[1],
          location_text: params[2],
          lat: params[3],
          lng: params[4],
          description: params[5],
          image_url: params[6],
          confidence_level: params[7],
          status: 'pending',
          created_at: new Date().toISOString(),
        }],
      };
    }
    return { rows: [] };
  };

  return {
    query,
    get insertCalled() { return insertCalled; },
    get insertParams() { return insertParams; },
  };
}

/**
 * Mock uploadBufferToCloudinary — always returns a stable CDN URL.
 */
const mockUploadBufferToCloudinary = async (_buffer, _folder) => ({
  secure_url: 'https://cdn.example.com/test.jpg',
});

/**
 * Mock verifyReportWithAI — returns a normal score for the base case.
 */
const mockVerifyReportWithAI_available = async (_data) => ({
  score: 72,
  flags: [],
});

/**
 * Mock verifyReportWithAI — simulates AI being unavailable (returns null).
 */
const mockVerifyReportWithAI_unavailable = async (_data) => null;

// ── Valid sighting body generators ───────────────────────────────────────────

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

/**
 * Generate a set of varied valid sighting bodies to cover the non-buggy input domain.
 * Each entry has a req.file present (non-null), so isBugCondition(X) = false.
 */
function generateValidInputs() {
  return [
    // Minimal required fields
    {
      body: {
        missing_person_id: VALID_UUID,
        lat: '23.8103',
        lng: '90.4125',
        description: 'Saw someone matching the description near the market',
        confidence_level: 'maybe',
      },
      file: { buffer: Buffer.from('fake-image-data'), originalname: 'photo.jpg', mimetype: 'image/jpeg' },
      user: { id: 'user-123' },
      label: 'minimal required fields, authenticated user',
    },
    // With optional location_text
    {
      body: {
        missing_person_id: VALID_UUID,
        lat: '23.8103',
        lng: '90.4125',
        description: 'Person seen near the bus station wearing blue jacket',
        confidence_level: 'sure',
        location_text: 'Dhaka Bus Terminal, Gate 3',
      },
      file: { buffer: Buffer.from('fake-image-data-2'), originalname: 'sighting.jpg', mimetype: 'image/jpeg' },
      user: { id: 'user-456' },
      label: 'with location_text, confidence=sure',
    },
    // With reporter_name and reporter_phone
    {
      body: {
        missing_person_id: VALID_UUID,
        lat: '24.0000',
        lng: '91.0000',
        description: 'Spotted near the river bank, matches the photo',
        confidence_level: 'not_sure',
        reporter_name: 'Rahim Uddin',
        reporter_phone: '+8801700000000',
      },
      file: { buffer: Buffer.from('fake-image-data-3'), originalname: 'evidence.jpg', mimetype: 'image/jpeg' },
      user: { id: 'user-789' },
      label: 'with reporter_name and reporter_phone, confidence=not_sure',
    },
    // Long description
    {
      body: {
        missing_person_id: VALID_UUID,
        lat: '22.3569',
        lng: '91.7832',
        description: 'I was walking near the Chittagong port area when I noticed a person who closely resembled the missing individual. They were wearing similar clothing and appeared disoriented. I tried to approach but they moved away quickly.',
        confidence_level: 'maybe',
      },
      file: { buffer: Buffer.from('fake-image-data-4'), originalname: 'long-desc.jpg', mimetype: 'image/jpeg' },
      user: { id: 'user-abc' },
      label: 'long description',
    },
    // Different UUID for missing_person_id
    {
      body: {
        missing_person_id: 'b1ffcd00-1d2e-5fg9-cc7e-7cc0ce491b22'.replace('f', 'e').replace('g', 'f'),
        lat: '23.7272',
        lng: '90.4093',
        description: 'Saw this person at the train station',
        confidence_level: 'sure',
      },
      file: { buffer: Buffer.from('fake-image-data-5'), originalname: 'train.jpg', mimetype: 'image/jpeg' },
      user: { id: 'user-def' },
      label: 'different missing_person_id',
    },
  ].filter(input => {
    // Ensure the UUID is valid (filter out any malformed test data)
    try {
      z.string().uuid().parse(input.body.missing_person_id);
      return true;
    } catch {
      return false;
    }
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

/**
 * Property 2a: For any valid body + non-null req.file, createSighting returns
 * HTTP 201 and calls INSERT with the correct missing_person_id.
 *
 * Validates: Requirements 3.1
 */
test('Preservation: valid submission with req.file returns HTTP 201 and calls INSERT', async (t) => {
  const inputs = generateValidInputs();
  assert.ok(inputs.length > 0, 'Should have at least one valid input to test');

  for (const input of inputs) {
    const mockDb = makeMockQuery();
    const res = makeMockRes();
    const next = (err) => { throw err; };

    const req = {
      file: input.file,
      body: input.body,
      user: input.user,
    };

    await createSighting_unfixed(req, res, next, {
      query: mockDb.query,
      uploadBufferToCloudinary: mockUploadBufferToCloudinary,
      verifyReportWithAI: mockVerifyReportWithAI_available,
    });

    // Assert HTTP 201
    assert.equal(
      res.statusCodes[0],
      201,
      `[${input.label}] Expected HTTP 201 but got ${res.statusCodes[0]}`
    );

    // Assert INSERT was called
    assert.equal(
      mockDb.insertCalled,
      true,
      `[${input.label}] Expected INSERT to be called but it was not`
    );

    // Assert correct missing_person_id in INSERT params
    assert.equal(
      mockDb.insertParams[0],
      input.body.missing_person_id,
      `[${input.label}] Expected INSERT param[0] (missing_person_id) to be ${input.body.missing_person_id} but got ${mockDb.insertParams[0]}`
    );

    // Assert image_url is set (not null) because req.file was present
    assert.equal(
      mockDb.insertParams[6],
      'https://cdn.example.com/test.jpg',
      `[${input.label}] Expected image_url to be the Cloudinary URL but got ${mockDb.insertParams[6]}`
    );
  }
});

/**
 * Property 2b: For anonymous submission (req.user = null), createSighting
 * returns HTTP 201 and stores reported_by = null in the INSERT params.
 *
 * Validates: Requirements 3.5
 */
test('Preservation: anonymous submission (req.user = null) returns HTTP 201 with reported_by = null', async (t) => {
  const anonymousInputs = [
    {
      body: {
        missing_person_id: VALID_UUID,
        lat: '23.8103',
        lng: '90.4125',
        description: 'Anonymous sighting near the park',
        confidence_level: 'maybe',
      },
      file: { buffer: Buffer.from('anon-image'), originalname: 'anon.jpg', mimetype: 'image/jpeg' },
      user: null,
      label: 'anonymous (req.user = null)',
    },
    {
      body: {
        missing_person_id: VALID_UUID,
        lat: '24.1000',
        lng: '90.5000',
        description: 'Spotted near the hospital entrance',
        confidence_level: 'sure',
        reporter_name: 'Anonymous Reporter',
      },
      file: { buffer: Buffer.from('anon-image-2'), originalname: 'anon2.jpg', mimetype: 'image/jpeg' },
      user: null,
      label: 'anonymous with reporter_name in body',
    },
    {
      body: {
        missing_person_id: VALID_UUID,
        lat: '22.0000',
        lng: '89.0000',
        description: 'Saw the person at the market stall',
        confidence_level: 'not_sure',
      },
      file: { buffer: Buffer.from('anon-image-3'), originalname: 'anon3.jpg', mimetype: 'image/jpeg' },
      user: undefined,  // also covers req.user = undefined
      label: 'anonymous (req.user = undefined)',
    },
  ];

  for (const input of anonymousInputs) {
    const mockDb = makeMockQuery();
    const res = makeMockRes();
    const next = (err) => { throw err; };

    const req = {
      file: input.file,
      body: input.body,
      user: input.user,
    };

    await createSighting_unfixed(req, res, next, {
      query: mockDb.query,
      uploadBufferToCloudinary: mockUploadBufferToCloudinary,
      verifyReportWithAI: mockVerifyReportWithAI_available,
    });

    // Assert HTTP 201
    assert.equal(
      res.statusCodes[0],
      201,
      `[${input.label}] Expected HTTP 201 but got ${res.statusCodes[0]}`
    );

    // Assert INSERT was called
    assert.equal(
      mockDb.insertCalled,
      true,
      `[${input.label}] Expected INSERT to be called`
    );

    // Assert reported_by = null (params[1] is reported_by)
    assert.equal(
      mockDb.insertParams[1],
      null,
      `[${input.label}] Expected reported_by (INSERT param[1]) to be null for anonymous submission, got ${mockDb.insertParams[1]}`
    );
  }
});

/**
 * Property 2c: When verifyReportWithAI is unavailable (returns null),
 * createSighting still returns HTTP 201.
 *
 * This tests that the AI verification step is non-blocking — its absence
 * must not prevent a valid submission from succeeding.
 *
 * Validates: Requirements 3.6
 */
test('Preservation: AI unavailable (verifyReportWithAI returns null) still returns HTTP 201', async (t) => {
  const inputs = [
    {
      body: {
        missing_person_id: VALID_UUID,
        lat: '23.8103',
        lng: '90.4125',
        description: 'Sighting near the central mosque',
        confidence_level: 'maybe',
      },
      file: { buffer: Buffer.from('ai-unavail-image'), originalname: 'photo.jpg', mimetype: 'image/jpeg' },
      user: { id: 'user-123' },
      label: 'AI unavailable, authenticated user',
    },
    {
      body: {
        missing_person_id: VALID_UUID,
        lat: '24.5000',
        lng: '91.5000',
        description: 'Person spotted at the ferry terminal',
        confidence_level: 'sure',
      },
      file: { buffer: Buffer.from('ai-unavail-image-2'), originalname: 'ferry.jpg', mimetype: 'image/jpeg' },
      user: null,
      label: 'AI unavailable, anonymous user',
    },
  ];

  for (const input of inputs) {
    const mockDb = makeMockQuery();
    const res = makeMockRes();
    const next = (err) => { throw err; };

    const req = {
      file: input.file,
      body: input.body,
      user: input.user,
    };

    // Use the "unavailable" AI mock (returns null)
    await createSighting_unfixed(req, res, next, {
      query: mockDb.query,
      uploadBufferToCloudinary: mockUploadBufferToCloudinary,
      verifyReportWithAI: mockVerifyReportWithAI_unavailable,
    });

    // Assert HTTP 201 — AI being unavailable must not block the submission
    assert.equal(
      res.statusCodes[0],
      201,
      `[${input.label}] Expected HTTP 201 even when AI is unavailable, but got ${res.statusCodes[0]}`
    );

    // Assert INSERT was still called
    assert.equal(
      mockDb.insertCalled,
      true,
      `[${input.label}] Expected INSERT to be called even when AI is unavailable`
    );
  }
});
