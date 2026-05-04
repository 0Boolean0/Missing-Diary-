# Design Document: Missing Diary Enhancements

## Overview

This document describes the technical design for ten enhancement areas of the Missing Diary platform — a full-stack missing persons reporting and tracking system. The frontend is React 19 + Vite (plain JavaScript, `.jsx`/`.js`), the backend is Node.js/Express with ES modules, and the database is PostgreSQL. All existing code uses the patterns established in the current codebase: Zod for validation, `jsonwebtoken` for auth, `react-leaflet` for maps, `axios` for HTTP, and CSS custom properties for styling.

The enhancements are:
1. Interactive location pin with reverse-geocoding
2. WCAG AA-compliant UI color redesign
3. Guardian JWT auto-login and 7-day token expiry
4. Admin approval flow and case visibility
5. Language toggle (English/Bengali i18n)
6. Mandatory photo upload with AI-generated description
7. Live GPS location tracking with 24-hour trail
8. Case timeline entries
9. Offline location prompt and submission queue
10. Verification action buttons with audit logging

---

## Architecture

The system follows a three-tier architecture that is already established:

```
┌─────────────────────────────────────────────────────────────┐
│  React 19 + Vite Frontend (port 5173)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │AuthCtx   │ │LangCtx   │ │OfflineQ  │ │LocationTrack │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Pages: Home, Cases, CaseDetails, ReportCase,        │  │
│  │         Dashboard, Login, Register, Sightings        │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Components: Navbar, MapView, CaseCard, ProtectedRoute│  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │ axios (VITE_API_URL)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Express 5 Backend (port 5000)                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │authRoutes│ │caseRoutes│ │sighting  │ │adminRoutes   │  │
│  └──────────┘ └──────────┘ │Routes    │ └──────────────┘  │
│                             └──────────┘                    │
│  Middleware: requireAuth, optionalAuth, requireRole         │
│  Validation: Zod schemas on all inputs                      │
└─────────────────────────────────────────────────────────────┘
                          │ pg (DATABASE_URL)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  PostgreSQL                                                  │
│  users, missing_persons, person_images, sightings,          │
│  police_updates, audit_logs,                                 │
│  + NEW: location_trail, case_timeline                        │
└─────────────────────────────────────────────────────────────┘
```

**External services:**
- **Nominatim** (OpenStreetMap) — reverse-geocoding, called from the frontend
- **Cloudinary** — photo storage, called from the backend via `cloudinaryUpload.js`
- **AI Vision endpoint** — optional, configured via `VITE_AI_ENDPOINT` env var, called from the frontend

**No WebSocket server is introduced.** Live location updates use HTTP polling (30-second `setInterval` on the admin/police viewer side) to keep the architecture simple and avoid adding a new dependency. The Guardian side posts coordinates via `POST /api/cases/:id/location`.

---

## Components and Interfaces

### Backend: New Controllers and Routes

#### `locationController.js`
```
recordLocation(req, res, next)
  - Auth: requireAuth + (guardian owner OR admin/police)
  - Body: { lat: number, lng: number }
  - Inserts into location_trail
  - Deletes rows for same case_id older than 24 hours
  - Returns: 201 { id, case_id, lat, lng, recorded_at }

getTrail(req, res, next)
  - Auth: requireRole('admin', 'police')
  - Returns: location_trail rows for case_id where recorded_at > NOW() - 24h, ordered ASC
```

#### `timelineController.js`
```
addTimelineEntry(req, res, next)
  - Auth: requireAuth
  - Authorization: case owner OR admin/police (checked in controller)
  - Body: { entry_time, location_text, lat?, lng?, notes? }
  - Inserts into case_timeline
  - Inserts audit_logs record
  - Returns: 201 created entry

getTimeline(req, res, next)
  - Auth: requireAuth
  - Returns: case_timeline rows for case_id ordered by entry_time ASC
```

#### New routes added to `caseRoutes.js`
```
POST   /api/cases/:id/approve       → approveCase      (requireRole admin/police)
POST   /api/cases/:id/reject        → rejectCase       (requireRole admin/police)
POST   /api/cases/:id/request-info  → requestInfo      (requireRole admin/police)
GET    /api/cases/:id/audit         → getCaseAudit     (requireRole admin/police)
GET    /api/cases/:id/timeline      → getTimeline      (requireAuth)
POST   /api/cases/:id/timeline      → addTimelineEntry (requireAuth)
POST   /api/cases/:id/location      → recordLocation   (requireAuth)
GET    /api/cases/:id/trail         → getTrail         (requireRole admin/police)
```

#### New routes added to `sightingRoutes.js`
```
POST   /api/sightings/:id/approve   → approveSighting  (requireRole admin/police)
POST   /api/sightings/:id/reject    → rejectSighting   (requireRole admin/police)
GET    /api/sightings/:id/audit     → getSightingAudit (requireRole admin/police)
```

### Frontend: New Files

#### `frontend/src/context/LangContext.jsx`
```
Exports: LangProvider, useLang()
State: lang ('en' | 'bn'), persisted to localStorage['lang']
API:
  t(key: string) → string   // returns translation, falls back to 'en'
  setLang(code: string)     // updates state + localStorage
```

#### `frontend/src/i18n/translations.js`
```
Export: { en: { [key]: string }, bn: { [key]: string } }
Keys cover: Navbar, Home, MissingCases, CaseDetails, ReportCase,
            SubmitSighting, Login, Register, Dashboard pages
```

#### `frontend/src/components/ProtectedRoute.jsx`
```
Props: children
Behavior: if user is null → Navigate to /login?redirect=<current path>
          else → renders children
```

#### `frontend/src/utils/aiDescriber.js`
```
export async function describePhoto(file: File): Promise<string | null>
  - Converts file to base64
  - POSTs to VITE_AI_ENDPOINT
  - Returns description string or null on any error
```

#### `frontend/src/utils/offlineQueue.js`
```
export function enqueue(entry: object): void
export function getAll(): object[]
export function remove(index: number): void
export function clear(): void
  - Storage key: 'offline_queue' in localStorage
  - Serializes as JSON array
```

#### `frontend/src/utils/syncQueue.js`
```
export function initSyncListener(): void
  - Attaches window 'online' event listener
  - On online: iterates offlineQueue.getAll(), posts each to /api/cases
  - On success: removes entry, shows success toast
  - On failure: retains entry, shows error toast with retry option
```

#### `frontend/src/utils/locationTracker.js`
```
export function startTracking(caseId: string, onCoord: Function): void
export function stopTracking(): void
  - Uses setInterval(30000) + navigator.geolocation.getCurrentPosition
  - On success: calls onCoord({ lat, lng, caseId })
  - On error: logs, waits for next interval
```

### Frontend: Modified Files

| File | Changes |
|------|---------|
| `AuthContext.jsx` | Validate JWT expiry on mount; targeted `removeItem` on logout |
| `Navbar.jsx` | Add language toggle button; add offline queue badge |
| `MapView.jsx` | Add `draggable` prop to Marker; wire `dragend` to `onPick`; add `polyline` prop for trail rendering |
| `ReportCase.jsx` | Photo required validation; AI description integration; offline detection + queue |
| `Dashboard.jsx` | Replace status `<select>` with Approve/Reject/Request Info buttons; add audit history panel |
| `CaseDetails.jsx` | Add timeline display + entry form; add live tracking toggle; add trail polyline |
| `Register.jsx` | Remove admin/police role options |
| `styles.css` | Full CSS custom property redesign for WCAG AA compliance |
| `main.jsx` | Wrap protected routes in `ProtectedRoute`; add `LangProvider` |

---

## Data Models

### New Tables (DDL additions to `schema.sql`)

```sql
CREATE TABLE location_trail (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id     UUID NOT NULL REFERENCES missing_persons(id) ON DELETE CASCADE,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_location_trail_case     ON location_trail(case_id);
CREATE INDEX idx_location_trail_recorded ON location_trail(recorded_at DESC);

CREATE TABLE case_timeline (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id        UUID NOT NULL REFERENCES missing_persons(id) ON DELETE CASCADE,
  entry_time     TIMESTAMP NOT NULL,
  location_text  TEXT NOT NULL,
  lat            DOUBLE PRECISION,
  lng            DOUBLE PRECISION,
  notes          TEXT,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_case_timeline_case ON case_timeline(case_id);
```

### Modified Tables

```sql
-- Add notes column to audit_logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add new columns to missing_persons (if not already present)
ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS name_bn          VARCHAR(120);
ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS skin_color       VARCHAR(40);
ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS weight           VARCHAR(40);
ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS identifying_marks TEXT;
```

### Audit Log Record Shape

Every audit log record written by the new endpoints follows this shape:

```json
{
  "user_id":     "<UUID of acting admin/police>",
  "action":      "Approved case | Rejected case | Requested info on case | Approved sighting | Rejected sighting | Added timeline entry | Deleted case",
  "target_type": "missing_person | sighting | case_timeline",
  "target_id":   "<UUID of the target entity>",
  "notes":       "<free text or null>",
  "created_at":  "<timestamp>"
}
```

### i18n Translation Key Structure

```js
// translations.js
export const translations = {
  en: {
    // Navbar
    'nav.home': 'Home',
    'nav.cases': 'Missing Cases',
    'nav.sightings': 'Sightings',
    'nav.report': 'Report',
    'nav.dashboard': 'Dashboard',
    'nav.login': 'Login',
    'nav.logout': 'Logout',
    // ... all static strings
  },
  bn: {
    'nav.home': 'হোম',
    'nav.cases': 'নিখোঁজ মামলা',
    // ... Bengali translations
    // Missing keys fall back to 'en' via t() function
  }
};
```

### Offline Queue Entry Shape

```json
{
  "id":        "<UUID generated client-side>",
  "timestamp": "<ISO string>",
  "formData": {
    "name": "...",
    "last_seen_lat": 23.8103,
    "last_seen_lng": 90.4125,
    "last_seen_location": "...",
    "photoFileName": "photo.jpg",
    "photoNote": "Re-upload required — file cannot be stored offline"
    // ... all other form fields
  }
}
```

Note: actual `File` objects cannot be stored in `localStorage`. The queue stores form metadata and the file name. On sync, the user is notified that the photo must be re-attached.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Map pin position update

*For any* valid geographic coordinate (lat, lng), when the user clicks the map or releases a drag at that coordinate, the pin state should be updated to exactly that coordinate.

**Validates: Requirements 1.2, 1.3**

---

### Property 2: Geocoder address formatting

*For any* Nominatim reverse-geocoding response object with varying combinations of `road`, `suburb`, `city`, `state`, and `display_name` fields, the formatted address string should contain only the non-null components from that set, joined by commas, with no empty segments.

**Validates: Requirements 1.5**

---

### Property 3: Form submission includes pin coordinates

*For any* pin position (lat, lng) set before form submission, the `FormData` payload sent to the backend should contain `last_seen_lat` equal to the pin's latitude and `last_seen_lng` equal to the pin's longitude.

**Validates: Requirements 1.8**

---

### Property 4: WCAG AA contrast compliance

*For any* text/background color pair defined in the CSS design system (`:root` custom properties), the WCAG 2.1 relative luminance contrast ratio should be ≥ 4.5:1 for body text and ≥ 3:1 for large text (≥ 18pt or 14pt bold) and focus indicators.

**Validates: Requirements 2.3, 2.4, 2.5**

---

### Property 5: Session restoration round-trip

*For any* valid user object stored in `localStorage['user']` with a non-expired JWT in `localStorage['token']`, initializing the `AuthContext` should restore that user as the authenticated session state without requiring a new login.

**Validates: Requirements 3.2**

---

### Property 6: Role restriction on registration

*For any* registration request body where `role` is not `'guardian'` or `'local'` (e.g., `'admin'`, `'police'`, or any arbitrary string), the registration endpoint should return HTTP 400 and not create a user record.

**Validates: Requirements 3.6**

---

### Property 7: Protected route redirect

*For any* route path that requires authentication, an unauthenticated user accessing that path should be redirected to `/login?redirect=<original path>`, with the `redirect` query parameter containing the exact originally requested path.

**Validates: Requirements 3.8**

---

### Property 8: Case status assignment by role

*For any* valid case submission, the initial status of the created case should be `'pending'` when submitted by a `guardian` or `local` user, and `'verified'` when submitted by an `admin` or `police` user.

**Validates: Requirements 4.1, 4.2**

---

### Property 9: Case visibility by status

*For any* case in the database, its presence in the public cases listing (unauthenticated `GET /api/cases`) should be determined solely by its status: cases with status `'pending'` or `'rejected'` must not appear; cases with status `'active'`, `'verified'`, `'found'`, or `'closed'` must appear.

**Validates: Requirements 4.3, 4.4, 4.5**

---

### Property 10: Audit log completeness

*For any* moderation action (case approve, case reject, request info, sighting approve, sighting reject, timeline entry add) performed by an admin or police user, an `audit_logs` record should be inserted containing non-null values for `user_id`, `action`, `target_type`, `target_id`, and `created_at`; `notes` may be null unless the action is "Request Info".

**Validates: Requirements 4.7, 8.6, 10.3, 10.4, 10.5, 10.6, 10.7, 10.9**

---

### Property 11: Role enforcement on moderation endpoints

*For any* user with role `'guardian'` or `'local'`, requests to case status update, case approval/rejection, sighting approval/rejection, or timeline entry endpoints for cases they do not own should return HTTP 403 Forbidden.

**Validates: Requirements 4.8, 8.5, 10.8**

---

### Property 12: i18n fallback

*For any* translation key that exists in the English dictionary but is absent from the Bengali dictionary, calling `t(key)` with language set to `'bn'` should return the English string rather than `undefined` or an empty string.

**Validates: Requirements 5.7**

---

### Property 13: Location trail 24-hour retention

*For any* `location_trail` record with `recorded_at` timestamp more than 24 hours before the current time, a query to `GET /api/cases/:id/trail` should not include that record in its response.

**Validates: Requirements 7.4**

---

### Property 14: Location coordinate transmission

*For any* GPS coordinate obtained by the `locationTracker` while tracking is active, the backend `POST /api/cases/:id/location` endpoint should be called with a request body containing `lat` and `lng` values matching that coordinate.

**Validates: Requirements 7.2, 7.3**

---

### Property 15: Timeline chronological ordering

*For any* set of `case_timeline` entries with varying `entry_time` values, the response from `GET /api/cases/:id/timeline` should return them in ascending `entry_time` order (oldest first).

**Validates: Requirements 8.2**

---

### Property 16: Timeline entry validation

*For any* timeline entry submission missing `entry_time` or `location_text`, the `POST /api/cases/:id/timeline` endpoint should return a validation error (HTTP 400) and not insert a record.

**Validates: Requirements 8.4**

---

### Property 17: Offline queue serialization round-trip

*For any* form data object submitted while the device is offline, the data serialized into `localStorage['offline_queue']` should be deserializable back to an object with all the same field values intact.

**Validates: Requirements 9.4**

---

### Property 18: Offline queue count display

*For any* state of the offline queue containing N entries (N ≥ 0), the count displayed in the UI should equal N.

**Validates: Requirements 9.8**

---

### Property 19: Audit history reverse-chronological ordering

*For any* set of `audit_logs` records for a given case or sighting with varying `created_at` timestamps, the response from `GET /api/cases/:id/audit` or `GET /api/sightings/:id/audit` should return them in descending `created_at` order (most recent first).

**Validates: Requirements 10.10**

---

## Error Handling

### Backend Error Patterns

All controllers follow the existing `try/catch → next(e)` pattern. The global `errorHandler` middleware in `error.js` handles Zod validation errors (HTTP 400), JWT errors (HTTP 401), and unhandled errors (HTTP 500).

**New error cases introduced:**

| Scenario | HTTP Status | Response |
|----------|-------------|----------|
| Timeline entry missing required fields | 400 | Zod error details |
| Timeline entry by unauthorized user | 403 | `{ message: 'Forbidden' }` |
| Location record for non-existent case | 404 | `{ message: 'Case not found' }` |
| Verification action by non-admin/police | 403 | `{ message: 'Forbidden' }` |
| Registration with admin/police role | 400 | `{ message: 'Invalid role' }` |
| Expired/invalid JWT on protected route | 401 | `{ message: 'Invalid or expired token' }` |

### Frontend Error Patterns

**Geocoding failures (Requirement 1.6):** The `handleMapPick` function wraps the Nominatim call in a try/catch with an `AbortController` timeout of 5 seconds. On any failure, the existing `last_seen_location` field value is preserved and the loading indicator is cleared. No error is shown to the user.

**AI description failures (Requirement 6.5):** The `aiDescriber.js` utility catches all errors and returns `null`. The `ReportCase` component treats a `null` return as "AI unavailable" and proceeds without pre-populating the description field.

**Offline queue sync failures (Requirement 9.7):** The `syncQueue.js` listener catches per-entry submission errors. Failed entries remain in the queue. A toast notification is shown with a manual retry option. The sync continues to attempt remaining entries.

**JWT expiry on app load (Requirement 3.3):** `AuthContext` decodes the stored JWT client-side (without signature verification — that is the backend's job) to check the `exp` claim. If expired, `logout()` is called (which removes `token` and `user` from localStorage, preserving `lang` and `offline_queue`) and the user is redirected to `/login`.

---

## Testing Strategy

### Unit Tests

The project currently has no test framework. The recommended setup is **Vitest** for both frontend and backend unit tests, as it integrates natively with Vite and supports ES modules without additional configuration.

**Install:**
```bash
# Frontend
cd frontend && npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom

# Backend
cd backend && npm install --save-dev vitest
```

**Unit test targets (example-based):**

- `authController.register` — rejects admin/police roles, accepts guardian/local
- `authController.login` — returns 7-day JWT
- `caseController.createCase` — sets correct initial status by role
- `caseController.listCases` — filters pending cases for public requests
- `timelineController.addTimelineEntry` — validates required fields, inserts audit log
- `locationController.getTrail` — filters records older than 24 hours
- `offlineQueue.js` — enqueue/dequeue/getAll/remove operations
- `aiDescriber.js` — returns null on network error, returns string on success
- `LangContext` — `t()` fallback to English for missing Bengali keys
- `AuthContext` — clears only `token` and `user` on logout (not `lang` or `offline_queue`)

### Property-Based Tests

The recommended PBT library is **fast-check** (works with Vitest, supports ES modules, actively maintained).

```bash
npm install --save-dev fast-check
```

Each property test runs a minimum of **100 iterations**. Tests are tagged with a comment referencing the design property.

**Property test file locations:**

```
frontend/src/__tests__/properties/
  mapPin.property.test.js        → Properties 1, 3
  geocoder.property.test.js      → Property 2
  auth.property.test.js          → Properties 5, 6, 7
  i18n.property.test.js          → Property 12
  offlineQueue.property.test.js  → Properties 17, 18

backend/src/__tests__/properties/
  caseStatus.property.test.js    → Properties 8, 9
  auditLog.property.test.js      → Property 10
  roleEnforcement.property.test.js → Property 11
  locationTrail.property.test.js → Properties 13, 14
  timeline.property.test.js      → Properties 15, 16
  auditOrder.property.test.js    → Property 19
```

**Example property test (Property 2 — geocoder formatting):**

```js
// Feature: missing-diary-enhancements, Property 2: geocoder address formatting
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatAddress } from '../../utils/geocoder';

describe('Property 2: Geocoder address formatting', () => {
  it('produces comma-joined non-empty components only', () => {
    fc.assert(
      fc.property(
        fc.record({
          road:      fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          suburb:    fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          city:      fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          state:     fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          display_name: fc.string({ minLength: 1 }),
        }),
        (address) => {
          const result = formatAddress({ address });
          // No empty segments
          expect(result.split(', ').every(s => s.length > 0)).toBe(true);
          // All present components appear in result
          const parts = [address.road, address.suburb, address.city, address.state].filter(Boolean);
          if (parts.length > 0) {
            parts.forEach(p => expect(result).toContain(p));
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Example property test (Property 9 — case visibility):**

```js
// Feature: missing-diary-enhancements, Property 9: case visibility by status
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

const PUBLIC_STATUSES  = ['active', 'verified', 'found', 'closed'];
const HIDDEN_STATUSES  = ['pending', 'rejected'];

describe('Property 9: Case visibility by status', () => {
  it('public listing excludes pending and rejected cases', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...HIDDEN_STATUSES),
        fc.uuid(),
        (status, caseId) => {
          const publicCases = filterPublicCases([{ id: caseId, status }]);
          expect(publicCases.find(c => c.id === caseId)).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('public listing includes active/verified/found/closed cases', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PUBLIC_STATUSES),
        fc.uuid(),
        (status, caseId) => {
          const publicCases = filterPublicCases([{ id: caseId, status }]);
          expect(publicCases.find(c => c.id === caseId)).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**WCAG contrast property (Property 4):**

The contrast ratio calculation is a pure function (no external dependencies) and is well-suited for property testing. The test enumerates all color pairs defined in the CSS design system and verifies each meets the threshold.

```js
// Feature: missing-diary-enhancements, Property 4: WCAG AA contrast compliance
import { describe, it, expect } from 'vitest';
import { wcagContrastRatio } from '../../utils/colorContrast';
import { colorPairs } from '../../design-system/colorPairs';

describe('Property 4: WCAG AA contrast compliance', () => {
  it('all body text color pairs meet 4.5:1 ratio', () => {
    colorPairs.bodyText.forEach(({ fg, bg, label }) => {
      const ratio = wcagContrastRatio(fg, bg);
      expect(ratio, `${label}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('all large text color pairs meet 3:1 ratio', () => {
    colorPairs.largeText.forEach(({ fg, bg, label }) => {
      const ratio = wcagContrastRatio(fg, bg);
      expect(ratio, `${label}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(3.0);
    });
  });
});
```

### Integration Tests

Integration tests verify the full request/response cycle against a real (test) database. These are run separately from unit/property tests.

**Targets:**
- `POST /api/auth/register` — full registration flow
- `POST /api/cases` — case creation with photo upload (Cloudinary mocked)
- `POST /api/cases/:id/approve` — approval sets status + writes audit log
- `GET /api/cases` (unauthenticated) — only returns public-status cases
- `GET /api/cases/:id/trail` — returns only last-24h records
- `POST /api/cases/:id/timeline` — inserts entry + audit log

### WCAG Accessibility Note

Full WCAG AA validation requires manual testing with assistive technologies (screen readers, keyboard navigation) and expert accessibility review. The automated contrast ratio tests in Property 4 verify the mathematical requirement but do not substitute for manual testing of focus management, ARIA labels, and screen reader announcements.

### Test Commands

```bash
# Frontend unit + property tests (single run)
cd frontend && npx vitest --run

# Backend unit + property tests (single run)
cd backend && npx vitest --run

# Frontend with UI
cd frontend && npx vitest --ui
```
