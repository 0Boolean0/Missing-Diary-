# Implementation Plan

- [~] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Media-less Sighting Submission Accepted
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — a valid sighting POST body with no `req.file` attached
  - Create `backend/src/tests/sighting-bug-condition.test.js` using `node:test` + `assert`
  - Import the `createSighting` handler and mock `req`, `res`, `next` directly (no HTTP server needed)
  - Set `req.file = undefined` (no multer file) and provide a valid `req.body` with all required fields
  - Mock `query` to capture INSERT calls and return a fake row
  - Assert that `res.status` is called with `400` and `res.json` body contains `"required"` in the message
  - Run test on UNFIXED code — `createSighting` currently skips the file check and calls `query` INSERT, so `res.status(201)` is returned instead
  - **EXPECTED OUTCOME**: Test FAILS (HTTP 201 returned instead of 400 — this proves the bug exists)
  - Document counterexample: `createSighting` returns HTTP 201 with `image_url: null` when no file is attached
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.2, 1.3_

- [~] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Valid Submissions With Media Continue to Succeed
  - **IMPORTANT**: Follow observation-first methodology
  - Create `backend/src/tests/sighting-preservation.test.js` using `node:test` + `assert`
  - Observe on UNFIXED code: `createSighting` with `req.file` present returns HTTP 201 and calls `query` INSERT
  - Observe on UNFIXED code: anonymous submission (`req.user = null`) returns HTTP 201 with `reported_by = null`
  - Observe on UNFIXED code: when `verifyReportWithAI` is unavailable (mock returns `null`), HTTP 201 is still returned
  - Write property-based style tests covering the full non-buggy input domain:
    - For any valid body + non-null `req.file`, assert HTTP 201 and INSERT is called with correct `missing_person_id`
    - For anonymous submission (no JWT / `req.user = null`), assert `reported_by = null` in the INSERT params
    - For AI unavailable (`verifyReportWithAI` mocked to return `null`), assert HTTP 201 still returned
  - Mock `uploadBufferToCloudinary` to return `{ secure_url: 'https://cdn.example.com/test.jpg' }`
  - Mock `verifyReportWithAI` to return `{ score: 72, flags: [] }` for the base case
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.5, 3.6_

- [~] 3. Fix for sighting submission — media validation, AI verification, and status filtering

  - [~] 3.1 Add AI columns migration to schema.sql
    - Append to `backend/schema.sql`:
      ```sql
      -- Sighting Submission Fix — AI verification columns
      ALTER TABLE sightings ADD COLUMN IF NOT EXISTS ai_score INT;
      ALTER TABLE sightings ADD COLUMN IF NOT EXISTS ai_flags TEXT;
      ```
    - Run the migration against the live Supabase DB (execute the two ALTER TABLE statements)
    - _Requirements: 2.4_

  - [~] 3.2 Add server-side media validation to `createSighting`
    - File: `backend/src/controllers/sightingController.js`
    - After `sightingSchema.parse(req.body)`, add before the Cloudinary block:
      ```js
      if (!req.file) {
        return res.status(400).json({ message: 'A photo or video is required to submit a sighting.' });
      }
      ```
    - _Bug_Condition: isBugCondition(X) where X.imageFile = null AND X.videoFile = null_
    - _Expected_Behavior: result.httpStatus = 400 AND result.body.message CONTAINS "required" AND no_record_inserted(X)_
    - _Preservation: submissions with req.file present must still reach the Cloudinary upload and INSERT path_
    - _Requirements: 2.3_

  - [~] 3.3 Add AI verification call to `createSighting`
    - File: `backend/src/controllers/sightingController.js`
    - Add import at top: `import { verifyReportWithAI } from '../utils/aiVerifier.js';`
    - After the Cloudinary upload block, add:
      ```js
      const aiResult = await verifyReportWithAI({
        description: data.description,
        last_seen_location: data.location_text,
      });
      const aiScore = aiResult?.score ?? null;
      const aiFlags = aiResult?.flags?.length > 0 ? aiResult.flags.join('; ') : null;
      ```
    - Update the INSERT statement to include `ai_score` and `ai_flags` as `$9` and `$10`:
      ```sql
      INSERT INTO sightings
        (missing_person_id, reported_by, location_text, lat, lng, description,
         image_url, confidence_level, status, ai_score, ai_flags)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9,$10) RETURNING *
      ```
    - Pass `[data.missing_person_id, req.user?.id || null, data.location_text || null, data.lat, data.lng, data.description, imageUrl, data.confidence_level, aiScore, aiFlags]`
    - _Requirements: 2.4_

  - [~] 3.4 Filter sightings by status in `getCase`
    - File: `backend/src/controllers/caseController.js`
    - In the `getCase` function, replace the unconditional sightings query with a role-aware query:
      ```js
      const isPrivileged = user && (user.role === 'admin' || user.role === 'police');
      const sightings = await query(
        isPrivileged
          ? 'SELECT * FROM sightings WHERE missing_person_id=$1 ORDER BY created_at DESC'
          : "SELECT * FROM sightings WHERE missing_person_id=$1 AND status='verified' ORDER BY created_at DESC",
        [req.params.id]
      );
      ```
    - Note: `user` is already available as `req.user` in the `getCase` scope
    - _Preservation: admin/police callers must still receive all statuses (pending, verified, rejected)_
    - _Requirements: 2.5, 3.4_

  - [~] 3.5 Add Enter-key guard to the sighting form
    - File: `frontend/src/pages/SubmitSighting.jsx`
    - Add `onKeyDown` handler to the `<form>` element:
      ```jsx
      <form
        onSubmit={submit}
        onKeyDown={e => {
          if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
            e.preventDefault();
          }
        }}
        className="form-grid"
      >
      ```
    - This must NOT block Enter in `<textarea>` elements (needed for newlines in description)
    - _Bug_Condition: Enter key pressed in INPUT element when image state is null_
    - _Preservation: Enter in textarea must still insert a newline_
    - _Requirements: 2.1_

  - [ ] 3.6 Add client-side media validation to `SubmitSighting`
    - File: `frontend/src/pages/SubmitSighting.jsx`
    - Add `imageError` state: `const [imageError, setImageError] = useState('')`
    - At the top of `submit()`, before building `FormData`:
      ```js
      setImageError('');
      if (!image) {
        setImageError('A photo or video is required to submit a sighting.');
        return;
      }
      ```
    - Update the file upload label from `"📷 Attach a photo (optional)"` to `"📷 Attach a photo or video (required)"`
    - Render `imageError` below the file upload field with red styling:
      ```jsx
      {imageError && <p className="error" style={{ color: 'red', marginTop: 4 }}>{imageError}</p>}
      ```
    - Add a red border to the file upload box when `imageError` is set:
      ```jsx
      <div className="file-upload-box" style={imageError ? { border: '1px solid red' } : {}}>
      ```
    - _Bug_Condition: image state is null when submit() is called_
    - _Expected_Behavior: imageError is set, API call is not made, error message is displayed_
    - _Preservation: when image is non-null, submit() proceeds normally to the API call_
    - _Requirements: 2.1, 2.2_

  - [ ] 3.7 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Media-less Sighting Returns HTTP 400
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior: HTTP 400 with "required" in message, no INSERT
    - Run `backend/src/tests/sighting-bug-condition.test.js` on the FIXED code
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed — `createSighting` now returns 400 for no-file submissions)
    - _Requirements: 2.3, Expected Behavior Properties from design_

  - [ ] 3.8 Verify preservation tests still pass
    - **Property 2: Preservation** - Valid Submissions With Media Still Return HTTP 201
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run `backend/src/tests/sighting-preservation.test.js` on the FIXED code
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — valid submissions, anonymous submissions, and AI-unavailable cases all still return 201)
    - Confirm all tests still pass after fix (no regressions)

- [ ] 4. Checkpoint — Ensure all tests pass
  - Run `node --test backend/src/tests/sighting-bug-condition.test.js` — must pass
  - Run `node --test backend/src/tests/sighting-preservation.test.js` — must pass
  - Manually verify: submit a sighting with no file → expect HTTP 400 and error message displayed
  - Manually verify: submit a sighting with a file → expect HTTP 201 and navigation to case page
  - Manually verify: fetch `GET /api/cases/:id` without auth when a `pending` sighting exists → sighting must NOT appear
  - Manually verify: fetch `GET /api/cases/:id` as admin → `pending` sighting must appear
  - Ensure all tests pass; ask the user if questions arise.
