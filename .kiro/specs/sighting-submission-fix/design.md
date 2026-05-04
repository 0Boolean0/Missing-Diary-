# Sighting Submission Fix — Bugfix Design

## Overview

Three related bugs in the Submit Sighting flow allow incomplete, unverified sightings to reach the database and become publicly visible without any human review.

**Bug 1 — Enter-key premature submission**: The `<form onSubmit={submit}>` in `SubmitSighting.jsx` has no `onKeyDown` guard. Pressing Enter in any `<input>` element fires the submit handler immediately, bypassing the media requirement.

**Bug 2 — Missing media validation**: The file upload field is labelled "optional" and neither the frontend nor the backend enforces that a photo or video must be present. The Zod schema in `createSighting` does not check `req.file`, so records with `image_url = null` are silently inserted.

**Bug 3 — Incomplete submission pipeline**: After insertion, sightings go straight to `status = 'pending'` with no AI verification step. The `getCase` controller in `caseController.js` fetches sightings with `SELECT * FROM sightings WHERE missing_person_id=$1` — no status filter — so `pending` and `rejected` sightings are returned to all callers, including unauthenticated public users viewing `CaseDetails`.

The fix strategy is:
1. Add an `onKeyDown` guard on the form element (frontend).
2. Add client-side media validation before the API call (frontend).
3. Add server-side media validation in `createSighting` (backend).
4. Call `verifyReportWithAI` after Cloudinary upload and store `ai_score` / `ai_flags` (backend).
5. Add `ai_score INT` and `ai_flags TEXT` columns to the `sightings` table (database).
6. Filter sightings by `status = 'verified'` in `getCase` for non-admin/police callers (backend).

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers the core media-missing bug — a sighting submission where both `imageFile` and `videoFile` are null.
- **Property (P)**: The desired behavior when the bug condition holds — the system must return HTTP 400, display a validation error, and not insert a record.
- **Preservation**: All existing behaviors that must remain unchanged by the fix, including successful submissions with media, admin approval/rejection flows, and anonymous submission support.
- **isBugCondition(X)**: Pseudocode function that returns `true` when a submission has no attached media file.
- **createSighting**: The controller function in `backend/src/controllers/sightingController.js` that handles `POST /api/sightings`.
- **getCase**: The controller function in `backend/src/controllers/caseController.js` that handles `GET /api/cases/:id` and currently returns all sightings regardless of status.
- **verifyReportWithAI**: The utility in `backend/src/utils/aiVerifier.js` that calls Gemini Flash and returns `{ score, flags }` or `null` on failure.
- **ai_score**: Integer column (0–100) on the `sightings` table storing the AI credibility score.
- **ai_flags**: Text column on the `sightings` table storing semicolon-separated concern flags from the AI.
- **optionalAuth**: Middleware that attaches `req.user` if a valid JWT is present, but does not block unauthenticated requests.

---

## Bug Details

### Bug Condition

The core bug manifests when a sighting submission contains no attached media file. The `createSighting` controller either receives a request with no `req.file` (because the frontend allowed submission without one) or the frontend's Enter-key handler fires the submit function before the user has selected a file.

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X of type SightingSubmission
  OUTPUT: boolean

  // Returns true when the submission is missing required media
  RETURN X.imageFile = null AND X.videoFile = null
END FUNCTION
```

### Examples

- **Enter-key trigger**: User fills in the description field and presses Enter. `submit()` fires immediately. `image` state is `null`. The `FormData` has no `image` key. Backend inserts a record with `image_url = null`. **Expected**: form submission is blocked; error message shown.
- **Click submit without file**: User clicks the submit button without selecting a file. Same path as above — no client-side guard, no server-side guard. **Expected**: HTTP 400 returned; no DB insert.
- **Valid submission with file**: User selects a JPEG, fills required fields, clicks submit. `req.file` is present. **Expected**: Cloudinary upload succeeds, AI verification runs, record inserted with `status = 'pending'`, `ai_score` and `ai_flags` populated (or null if AI unavailable).
- **Edge case — AI unavailable**: Valid submission with file, but `GEMINI_API_KEY` is unset or Gemini times out. **Expected**: record is still inserted with `ai_score = null` and `ai_flags = null`; submission is not blocked.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When a user attaches a valid photo and fills all required fields and submits, the system must continue to create the sighting record and navigate to the case page.
- When an admin or police user calls `POST /api/sightings/:id/approve`, the system must continue to set status to `verified` and insert an audit log.
- When an admin or police user calls `POST /api/sightings/:id/reject`, the system must continue to set status to `rejected` and insert an audit log.
- When an authenticated admin or police user calls `GET /api/sightings`, the system must continue to return all sightings regardless of status.
- When a user submits anonymously (no JWT), the system must continue to accept the submission (subject to the new media requirement) and store `reported_by = null`.
- When the AI verification utility is unavailable or returns null, the system must continue to accept the submission and store `ai_score = null` and `ai_flags = null`.
- When a user selects a missing person and pins a location on the map, `missing_person_id`, `lat`, and `lng` must continue to be included in the payload.

**Scope:**
All inputs that do NOT satisfy `isBugCondition` (i.e., submissions that include a media file) must be completely unaffected by the media validation fix. The Enter-key guard must only block submission in `<input>` elements — pressing Enter inside the `<textarea>` description field must continue to insert a newline as normal.

---

## Hypothesized Root Cause

1. **No Enter-key guard on the form**: `SubmitSighting.jsx` uses a plain `<form onSubmit={submit}>`. HTML forms submit on Enter by default when focus is inside an `<input>`. There is no `onKeyDown` handler to intercept this.

2. **File upload field marked optional**: The label reads "📷 Attach a photo (optional)" and the `submit()` function has no early-return check for `image === null`. The `FormData` is built and posted regardless.

3. **Zod schema does not validate `req.file`**: The `sightingSchema` in `createSighting` only validates `req.body` fields. `req.file` (set by multer) is outside the schema. There is no explicit `if (!req.file)` guard before the Cloudinary upload block.

4. **No AI verification call in `createSighting`**: Unlike `createCase` (which calls `verifyReportWithAI` for pending submissions), `createSighting` inserts the record immediately after the optional Cloudinary upload with no AI step. The `sightings` table also lacks `ai_score` and `ai_flags` columns.

5. **`getCase` returns all sightings without a status filter**: The query `SELECT * FROM sightings WHERE missing_person_id=$1` has no `WHERE status = 'verified'` clause. The `getCase` handler does not check `req.user` before including sightings in the response, so unauthenticated callers receive `pending` and `rejected` sightings.

---

## Correctness Properties

Property 1: Bug Condition — Media-less Submissions Are Rejected

_For any_ sighting submission X where `isBugCondition(X)` is true (no image file attached), the fixed `createSighting` function SHALL return HTTP 400 with a body containing `"required"` in the message field, and SHALL NOT insert any record into the `sightings` table.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation — Valid Submissions Continue to Succeed

_For any_ sighting submission X where `isBugCondition(X)` is false (an image file is attached and all required fields are present), the fixed `createSighting` function SHALL return HTTP 201 and insert a sighting record, producing the same observable outcome as the original function for all fields except the newly added `ai_score` and `ai_flags` (which are new columns absent from the original).

**Validates: Requirements 3.1, 3.5, 3.6, 3.7**

---

## Fix Implementation

### Changes Required

**File 1**: `frontend/src/pages/SubmitSighting.jsx`

**Change 1 — Enter-key guard**:
Add an `onKeyDown` handler to the `<form>` element. Block Enter only when the event target is an `<input>` element (not a `<textarea>`, which needs Enter for newlines).

```
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

**Change 2 — Client-side media validation**:
Add an `imageError` state. At the top of `submit()`, before building `FormData`, check `if (!image)` and set the error state, then return early. Add a visual indicator (red border) on the file upload box when `imageError` is set. Update the file upload label to remove "(optional)".

```
const [imageError, setImageError] = useState('');

async function submit(e) {
  e.preventDefault();
  setImageError('');
  if (!image) {
    setImageError('A photo or video is required to submit a sighting.');
    return;
  }
  // ... rest of submit
}
```

---

**File 2**: `backend/src/controllers/sightingController.js`

**Change 3 — Server-side media validation**:
After `sightingSchema.parse(req.body)`, add an explicit file check before any Cloudinary upload:

```
if (!req.file) {
  return res.status(400).json({ message: 'A photo or video is required to submit a sighting.' });
}
```

**Change 4 — AI verification call**:
After the Cloudinary upload, call `verifyReportWithAI` with the sighting's description and location. Store the result in `ai_score` and `ai_flags`. The call must be non-blocking — if it returns `null`, proceed with `null` values.

```
const aiResult = await verifyReportWithAI({
  description: data.description,
  last_seen_location: data.location_text,
});
const aiScore = aiResult?.score ?? null;
const aiFlags = aiResult?.flags?.length > 0 ? aiResult.flags.join('; ') : null;
```

**Change 5 — Include `ai_score` and `ai_flags` in INSERT**:
Update the `INSERT INTO sightings` statement to include the two new columns:

```sql
INSERT INTO sightings
  (missing_person_id, reported_by, location_text, lat, lng, description,
   image_url, confidence_level, status, ai_score, ai_flags)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9,$10) RETURNING *
```

Add `verifyReportWithAI` to the import at the top of the file.

---

**File 3**: `backend/src/controllers/caseController.js`

**Change 6 — Filter sightings by status in `getCase`**:
The `getCase` handler must check the caller's role before including sightings. Admin and police see all statuses; everyone else sees only `status = 'verified'`.

```javascript
const isPrivileged = user && (user.role === 'admin' || user.role === 'police');
const sightings = await query(
  isPrivileged
    ? 'SELECT * FROM sightings WHERE missing_person_id=$1 ORDER BY created_at DESC'
    : "SELECT * FROM sightings WHERE missing_person_id=$1 AND status='verified' ORDER BY created_at DESC",
  [req.params.id]
);
```

---

**File 4**: `backend/schema.sql`

**Change 7 — Add AI columns to `sightings` table**:
Append migration statements at the end of `schema.sql`:

```sql
-- Sighting Submission Fix — AI verification columns
ALTER TABLE sightings ADD COLUMN IF NOT EXISTS ai_score INT;
ALTER TABLE sightings ADD COLUMN IF NOT EXISTS ai_flags TEXT;
```

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write tests that submit sighting payloads with no attached file and assert that the backend returns HTTP 400 and does not insert a record. Run these tests on the UNFIXED `createSighting` to observe that they fail (HTTP 201 is returned instead).

**Test Cases**:
1. **No-file POST to `/api/sightings`**: Send a valid body with all required fields but no `multipart/form-data` file part. On unfixed code, expect HTTP 201 (bug). After fix, expect HTTP 400.
2. **Enter-key in input field**: Simulate a `keydown` event with `key = 'Enter'` on an `<input>` element inside the form when `image` state is null. On unfixed code, `submit()` is called (bug). After fix, `preventDefault()` is called and `submit()` is not invoked.
3. **Submit button click with no file**: Simulate a form submit event with `image = null`. On unfixed code, the API call proceeds (bug). After fix, `imageError` is set and the API is not called.
4. **`getCase` returns pending sightings to public**: Call `GET /api/cases/:id` without authentication when a `pending` sighting exists. On unfixed code, the sighting appears in the response (bug). After fix, it is excluded.

**Expected Counterexamples**:
- `createSighting` returns HTTP 201 with `image_url: null` when no file is attached.
- The form's `submit()` function is invoked on Enter keypress in an input field.
- `getCase` includes `status = 'pending'` sightings in the public response.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  result := createSighting_fixed(X)
  ASSERT result.httpStatus = 400
    AND result.body.message CONTAINS "required"
    AND no_record_inserted(X)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT createSighting_original(X).httpStatus = createSighting_fixed(X).httpStatus
  // Both return 201 and insert a record
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (varying descriptions, locations, confidence levels, anonymous vs authenticated).
- It catches edge cases that manual unit tests might miss (e.g., empty `location_text`, very long descriptions, special characters).
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs.

**Test Plan**: Observe behavior on UNFIXED code for valid submissions (with file), capture the HTTP 201 response shape, then write property-based tests asserting that shape is preserved after the fix.

**Test Cases**:
1. **Valid submission preservation**: Generate random valid sighting payloads (varying `description`, `location_text`, `confidence_level`, `reporter_name`) with a mock file attached. Assert HTTP 201 and a record with the correct `missing_person_id`.
2. **Anonymous submission preservation**: Same as above but without a JWT. Assert `reported_by = null` in the response.
3. **Admin sightings list preservation**: After inserting a `pending` sighting, call `GET /api/sightings` as admin. Assert the sighting appears regardless of status.
4. **Approve/reject flow preservation**: Call `POST /api/sightings/:id/approve` and `POST /api/sightings/:id/reject` as admin. Assert status transitions and audit log entries are unchanged.
5. **AI unavailable preservation**: Mock `verifyReportWithAI` to return `null`. Assert the submission still returns HTTP 201 with `ai_score = null`.

### Unit Tests

- Test `createSighting` with no `req.file` → expect HTTP 400 and no DB insert.
- Test `createSighting` with a valid file → expect HTTP 201, Cloudinary upload called, `verifyReportWithAI` called, record inserted with `ai_score` and `ai_flags`.
- Test `createSighting` when `verifyReportWithAI` returns `null` → expect HTTP 201 with `ai_score = null`.
- Test `getCase` as unauthenticated user with a `pending` sighting → expect sighting excluded from response.
- Test `getCase` as admin with a `pending` sighting → expect sighting included in response.
- Test the Enter-key `onKeyDown` handler: `e.target.tagName === 'INPUT'` → `preventDefault()` called; `e.target.tagName === 'TEXTAREA'` → `preventDefault()` not called.
- Test the client-side `submit()` guard: `image === null` → `imageError` set, API not called.

### Property-Based Tests

- Generate random sighting payloads with `imageFile = null` and assert all result in HTTP 400 (fix checking — Property 1).
- Generate random valid sighting payloads with a non-null file and assert all result in HTTP 201 (preservation checking — Property 2).
- Generate random non-`<input>` target elements and assert the Enter-key guard never calls `preventDefault()` for them.

### Integration Tests

- Full submit flow: select a case, pin a location, attach a photo, fill description, click submit → assert navigation to case page and sighting visible in admin dashboard.
- Enter-key blocked: fill description input, press Enter without a file → assert no API call and error message displayed.
- Public case detail: create a `pending` sighting, fetch `GET /api/cases/:id` without auth → assert sighting not in response; approve sighting, fetch again → assert sighting now appears.
- AI score stored: submit a valid sighting with Gemini available → assert `ai_score` is an integer between 0 and 100 in the returned record.
