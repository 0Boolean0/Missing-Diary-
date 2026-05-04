# Implementation Plan: Missing Diary Enhancements

## Overview

This plan implements ten enhancement areas for the Missing Diary platform (React/Vite frontend + Node.js/Express/PostgreSQL backend). Tasks are ordered to build incrementally: database schema first, then backend API, then frontend components, wiring everything together at each stage.

All code is JavaScript (frontend: React 19 + Vite, backend: Node.js/Express with ES modules).

---

## Tasks

- [x] 1. Database schema migrations for new tables and columns
  - Add `name_bn`, `skin_color`, `weight`, `identifying_marks` columns to `missing_persons` if not present
  - Create `location_trail` table: `id UUID PK`, `case_id UUID FK → missing_persons.id`, `lat DOUBLE PRECISION`, `lng DOUBLE PRECISION`, `recorded_at TIMESTAMP DEFAULT NOW()`
  - Create `case_timeline` table: `id UUID PK`, `case_id UUID FK → missing_persons.id`, `entry_time TIMESTAMP NOT NULL`, `location_text TEXT NOT NULL`, `lat DOUBLE PRECISION`, `lng DOUBLE PRECISION`, `notes TEXT`, `created_by UUID FK → users.id`, `created_at TIMESTAMP DEFAULT NOW()`
  - Add `notes TEXT` column to `audit_logs` table
  - Add indexes: `idx_location_trail_case` on `location_trail(case_id)`, `idx_location_trail_recorded` on `location_trail(recorded_at DESC)`, `idx_case_timeline_case` on `case_timeline(case_id)`
  - Update `schema.sql` to include all new DDL so `npm run db:init` recreates the full schema
  - _Requirements: 7.3, 8.1, 10.9_

- [x] 2. Backend: Guardian JWT auto-login and 7-day token expiry
  - [x] 2.1 Update `authController.js` to sign JWTs with `expiresIn: '7d'`
    - Locate the `jwt.sign()` call and set expiry to `'7d'`
    - _Requirements: 3.4_
  - [x] 2.2 Update `authController.js` registration to restrict `admin` and `police` roles
    - Validate that the submitted `role` is only `guardian` or `local`; reject with HTTP 400 if `admin` or `police` is submitted
    - _Requirements: 3.6_
  - [x] 2.3 Update `AuthContext.jsx` to validate the stored JWT on app load and clear stale sessions
    - On mount, read `token` from `localStorage`; decode it client-side (without verifying signature) to check `exp`; if expired, call `logout()` and redirect to `/login`
    - _Requirements: 3.2, 3.3_
  - [x] 2.4 Update `AuthContext.jsx` `logout` to clear only `token` and `user` keys (not `localStorage.clear()`)
    - Replace `localStorage.clear()` with targeted `removeItem` calls so the `lang` and offline queue keys survive logout
    - _Requirements: 3.5_

- [x] 3. Checkpoint — auth and schema
  - Ensure the backend starts without errors, JWT expiry is 7 days, and registration rejects admin/police roles. Ask the user if questions arise.

- [x] 4. Backend: Admin approval flow and case visibility
  - [x] 4.1 Update `listCases` in `caseController.js` to filter out `pending` cases for unauthenticated and non-owner users
    - Add a public endpoint path (used by `GET /api/cases` without auth) that only returns cases with `status IN ('active','verified','found')`
    - Authenticated non-admin/police users see their own cases (all statuses) plus public cases
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 4.2 Update `updateCaseStatus` in `caseController.js` to insert structured audit log entries
    - After status update, insert into `audit_logs` with `user_id`, `action` (e.g. `'Updated case status to verified'`), `target_type = 'missing_person'`, `target_id`, and `notes` from request body
    - _Requirements: 4.7, 4.8_
  - [x] 4.3 Add `GET /api/cases/:id/audit` route and controller method to return audit history for a case
    - Query `audit_logs JOIN users` to return `actor_name`, `action`, `notes`, `created_at` in reverse-chronological order
    - Restrict to `admin` and `police` roles
    - _Requirements: 10.10_

- [x] 5. Backend: Verification action endpoints
  - [x] 5.1 Add `POST /api/cases/:id/approve`, `POST /api/cases/:id/reject`, `POST /api/cases/:id/request-info` routes in `caseRoutes.js`
    - Each handler sets the appropriate status and inserts an `audit_logs` record with the action string and optional `notes` from request body
    - Approve → status `verified`, action `'Approved case'`
    - Reject → status `rejected`, action `'Rejected case'`
    - Request Info → status unchanged (`pending`), action `'Requested info on case'`, stores `notes`
    - All three require `requireRole('admin','police')` middleware
    - _Requirements: 10.3, 10.4, 10.5, 10.8_
  - [x] 5.2 Add `POST /api/sightings/:id/approve` and `POST /api/sightings/:id/reject` routes in `sightingRoutes.js`
    - Approve → sighting status `verified`, action `'Approved sighting'`
    - Reject → sighting status `rejected`, action `'Rejected sighting'`
    - Both require `requireRole('admin','police')` middleware
    - _Requirements: 10.6, 10.7, 10.8_
  - [x] 5.3 Add `GET /api/sightings/:id/audit` route returning audit history for a sighting
    - Same pattern as case audit endpoint
    - _Requirements: 10.10_

- [x] 6. Backend: Case timeline CRUD
  - [x] 6.1 Create `timelineController.js` with `addTimelineEntry` and `getTimeline` functions
    - `getTimeline`: `SELECT * FROM case_timeline WHERE case_id=$1 ORDER BY entry_time ASC`
    - `addTimelineEntry`: validate `entry_time` and `location_text` required; insert row; insert `audit_logs` record with action `'Added timeline entry'`, target_type `'case_timeline'`, entry ID
    - Return HTTP 403 if requester is not the case owner, admin, or police
    - _Requirements: 8.3, 8.4, 8.5, 8.6_
  - [x] 6.2 Register timeline routes in `caseRoutes.js`
    - `GET /api/cases/:id/timeline` → `getTimeline` (requires auth)
    - `POST /api/cases/:id/timeline` → `addTimelineEntry` (requires auth)
    - _Requirements: 8.3_

- [x] 7. Backend: Live location trail endpoints
  - [x] 7.1 Create `locationController.js` with `recordLocation` and `getTrail` functions
    - `recordLocation`: insert into `location_trail`; delete rows older than 24 hours for the same `case_id`
    - `getTrail`: return all `location_trail` rows for `case_id` where `recorded_at > NOW() - INTERVAL '24 hours'` ordered by `recorded_at ASC`
    - _Requirements: 7.2, 7.3, 7.4_
  - [x] 7.2 Register location routes
    - `POST /api/cases/:id/location` → `recordLocation` (requires auth, guardian or admin/police)
    - `GET /api/cases/:id/trail` → `getTrail` (requires `requireRole('admin','police')`)
    - _Requirements: 7.2, 7.5_

- [x] 8. Checkpoint — backend API complete
  - Ensure all new routes respond correctly with curl or a REST client. Verify audit logs are written for status changes and timeline entries. Ask the user if questions arise.

- [x] 9. Frontend: CSS custom properties and WCAG AA color redesign
  - [x] 9.1 Refactor `frontend/src/styles.css` to define all colors as CSS custom properties
    - Define a palette at `:root`: primary, primary-dark, background, surface, text, text-muted, border, success, warning, danger, and status-specific badge colors
    - Ensure all body text / heading / label combinations achieve ≥ 4.5:1 contrast ratio
    - Ensure large text (≥ 18pt or 14pt bold) achieves ≥ 3:1 contrast ratio
    - Ensure all interactive elements have a visible focus ring with ≥ 3:1 contrast against adjacent background
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 9.2 Apply the new CSS variables to Navbar, CaseCard, form elements, badges, and modal/overlay elements
    - Replace all hard-coded hex/rgb color values in component inline styles and CSS classes with `var(--*)` references
    - Apply distinct badge colors for each status: `pending`, `active`, `verified`, `found`, `closed`, `rejected`
    - _Requirements: 2.6, 2.7_

- [x] 10. Frontend: Language toggle (i18n)
  - [x] 10.1 Create `frontend/src/i18n/translations.js` with English and Bengali string dictionaries
    - Export an object keyed by `en` and `bn` containing all static UI strings for Navbar, Home, Missing Cases, Case Details, Report Case, Submit Sighting, Login, Register, and Dashboard pages
    - _Requirements: 5.3_
  - [x] 10.2 Create `frontend/src/context/LangContext.jsx` providing `lang`, `t()`, and `setLang()`
    - On mount, read `lang` from `localStorage`; default to `'en'` if absent
    - `t(key)` returns the translation for the current language, falling back to English if the key is missing in Bengali
    - `setLang(code)` updates state and persists to `localStorage` under key `lang`
    - _Requirements: 5.4, 5.5, 5.7_
  - [x] 10.3 Add language toggle button to `Navbar.jsx`
    - Render a toggle showing the current language (`EN` / বাং)
    - On click, call `setLang` to switch between `en` and `bn`
    - When `bn` is active, apply a Bengali-compatible font (e.g. `'Noto Sans Bengali', sans-serif`) via a CSS class on `<html>` or a wrapper element
    - _Requirements: 5.1, 5.2, 5.6_
  - [x] 10.4 Replace hard-coded UI strings in all pages and components with `t()` calls
    - Update Navbar, Home, MissingCases, CaseDetails, ReportCase, SubmitSighting, Login, Register, Dashboard
    - _Requirements: 5.3_

- [x] 11. Frontend: Guardian auth persistence and protected routes
  - [x] 11.1 Update `AuthContext.jsx` to restore session on app load from `localStorage`
    - Initialize `user` state from `localStorage.getItem('user')` (already done); additionally validate token expiry on mount and clear if expired
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 11.2 Create a `ProtectedRoute` component in `frontend/src/components/ProtectedRoute.jsx`
    - If `user` is null, redirect to `/login?redirect=<current path>`
    - _Requirements: 3.8_
  - [x] 11.3 Wrap `/report`, `/sighting`, and `/dashboard` routes in `ProtectedRoute` in `main.jsx`
    - _Requirements: 3.8_
  - [x] 11.4 Update `Navbar.jsx` to display the authenticated user's name and a Logout button when logged in
    - Already partially implemented; ensure the user's `name` is shown alongside the Logout button
    - _Requirements: 3.7_
  - [x] 11.5 Update `Register.jsx` to offer only `guardian` and `local` as selectable roles
    - Remove or hide any `admin` / `police` options from the role selector
    - _Requirements: 3.6_

- [x] 12. Frontend: Interactive location pin with reverse-geocoding (ReportCase)
  - [x] 12.1 Verify and harden the existing `handleMapPick` geocoding logic in `ReportCase.jsx`
    - Ensure the Nominatim call fires within 300ms of pin movement (debounce if needed)
    - Add a 5-second timeout using `AbortController`; on timeout or error, leave the existing field value unchanged and clear the loading indicator
    - Show the `⏳` loading indicator inside the input while geocoding is in progress (already partially implemented — verify it works correctly)
    - _Requirements: 1.4, 1.5, 1.6, 1.7_
  - [x] 12.2 Ensure `MapView.jsx` supports draggable markers and calls `onPick` on both click and drag-end
    - Add a `draggable` prop to the Leaflet `Marker`; wire `dragend` event to call `onPick` with the new latlng
    - _Requirements: 1.2, 1.3_
  - [x] 12.3 Confirm the form submission includes `last_seen_lat` and `last_seen_lng` from the pin state
    - Already implemented in `ReportCase.jsx`; verify the values are appended to `FormData` correctly
    - _Requirements: 1.8_

- [x] 13. Frontend: Mandatory photo upload with AI-generated description
  - [x] 13.1 Add photo-required validation to `ReportCase.jsx`
    - In the `submit` handler, check that `photoFile` is not null before proceeding; if null, set an error message and return early
    - _Requirements: 6.1, 6.2_
  - [x] 13.2 Create `frontend/src/utils/aiDescriber.js` that calls a vision API to generate a photo description
    - Accept a `File` object; convert to base64; call the configured AI endpoint (use `VITE_AI_ENDPOINT` env var)
    - Return the generated description string, or `null` if the service is unavailable or returns an error
    - _Requirements: 6.4, 6.5, 6.6_
  - [x] 13.3 Wire AI description generation into `ReportCase.jsx` photo upload handler
    - After `handlePhoto` sets `photoFile`, call `aiDescriber(file)` asynchronously
    - If a description is returned, pre-populate `form.description` with the text and set an `aiGenerated` flag
    - Display a label "✨ AI-generated — you may edit this" above the description textarea when `aiGenerated` is true
    - If the AI call fails or returns null, do nothing (no error shown)
    - _Requirements: 6.4, 6.5, 6.7_

- [x] 14. Frontend: Offline location prompt and submission queue
  - [x] 14.1 Create `frontend/src/utils/offlineQueue.js` with `enqueue`, `dequeue`, `getAll`, and `remove` helpers
    - Use `localStorage` key `offline_queue` storing a JSON array of serialized form submissions
    - _Requirements: 9.4_
  - [x] 14.2 Add offline detection and banner to `ReportCase.jsx`
    - Use `navigator.onLine` and `window` `online`/`offline` events to track connectivity state
    - When offline, display a banner: "You are offline. Your report will be saved and submitted when connectivity is restored."
    - _Requirements: 9.1_
  - [x] 14.3 Add offline GPS capture and queue submission to `ReportCase.jsx`
    - When the user submits while offline, call `navigator.geolocation.getCurrentPosition` to capture coordinates
    - Serialize form data (excluding the actual File object — store the file name and a note that re-upload is needed) into `offlineQueue.enqueue()`
    - _Requirements: 9.2, 9.3, 9.4_
  - [x] 14.4 Create `frontend/src/utils/syncQueue.js` that listens for the `online` event and flushes the queue
    - On `online` event, iterate `offlineQueue.getAll()`, attempt `api.post('/cases', ...)` for each entry, remove on success, retain on failure
    - Show a toast notification on success ("Queued report submitted") and on failure ("Failed to submit queued report — tap to retry")
    - _Requirements: 9.5, 9.6, 9.7_
  - [x] 14.5 Display pending queue count in the UI
    - In `Navbar.jsx` or `ReportCase.jsx`, read `offlineQueue.getAll().length` and display a badge if count > 0
    - _Requirements: 9.8_

- [x] 15. Checkpoint — core frontend features
  - Verify photo validation blocks submission, language toggle switches strings, offline banner appears when network is disabled in DevTools, and the map pin geocodes correctly. Ask the user if questions arise.

- [x] 16. Frontend: Live location tracking (Guardian side)
  - [x] 16.1 Create `frontend/src/utils/locationTracker.js`
    - Export `startTracking(caseId, onCoord)` and `stopTracking()` functions
    - Use `setInterval` (30 000ms) calling `navigator.geolocation.getCurrentPosition`
    - On success, call `onCoord({ lat, lng, caseId })`; on error, log and wait for next interval
    - _Requirements: 7.1, 7.7_
  - [x] 16.2 Add a "Enable Live Tracking" toggle to `CaseDetails.jsx` (visible to the case owner / Guardian)
    - When enabled, call `startTracking(caseId, coord => api.post('/cases/:id/location', coord))`
    - Display a pulsing "🔴 Live tracking active" indicator while tracking is on
    - When disabled, call `stopTracking()`
    - _Requirements: 7.1, 7.8_

- [x] 17. Frontend: Live location trail display (Admin/Police side)
  - [x] 17.1 Update `CaseDetails.jsx` to fetch and render the 24-hour location trail for admin/police users
    - On mount (when `user.role` is `admin` or `police`), call `GET /api/cases/:id/trail`
    - Render the trail as a Leaflet `Polyline` on the existing map
    - _Requirements: 7.5_
  - [x] 17.2 Poll for new trail points every 30 seconds while the page is open
    - Use `setInterval` to re-fetch `GET /api/cases/:id/trail` and update the polyline
    - _Requirements: 7.6_

- [x] 18. Frontend: Case timeline UI
  - [x] 18.1 Update `CaseDetails.jsx` to fetch and display timeline entries
    - Call `GET /api/cases/:id/timeline` on mount
    - Render entries in chronological order showing `entry_time`, `location_text`, and `notes`
    - Add timeline entry markers to the Leaflet map as distinct markers (different icon color/shape from the primary last-seen marker)
    - _Requirements: 8.2, 8.7_
  - [x] 18.2 Add a "Add Timeline Entry" form to `CaseDetails.jsx` for authenticated reporters and admins
    - Form fields: `entry_time` (datetime-local, required), `location_text` (text, required), `lat` (number, optional), `lng` (number, optional), `notes` (textarea, optional)
    - On submit, call `POST /api/cases/:id/timeline`; on success, append the new entry to the list
    - _Requirements: 8.3, 8.4_

- [x] 19. Frontend: Admin/Police verification action buttons in Dashboard
  - [x] 19.1 Replace the status `<select>` dropdowns in `Dashboard.jsx` with explicit Approve / Reject / Request Info buttons for pending cases
    - For each case with `status === 'pending'`, render three buttons: "✅ Approve", "❌ Reject", "ℹ️ Request Info"
    - "Request Info" opens an inline text input for the admin to enter a note before confirming
    - Each button calls the corresponding new API endpoint (`/approve`, `/reject`, `/request-info`)
    - _Requirements: 10.1, 10.3, 10.4, 10.5_
  - [x] 19.2 Replace the sighting status `<select>` with Approve / Reject buttons for pending sightings
    - For each sighting with `status === 'pending'`, render "✅ Approve" and "❌ Reject" buttons
    - Each button calls the corresponding sighting endpoint
    - _Requirements: 10.2, 10.6, 10.7_
  - [x] 19.3 Add an audit history panel to `Dashboard.jsx` for each case and sighting
    - Add an expandable "Audit History" section per row that fetches and displays `GET /api/cases/:id/audit` or `GET /api/sightings/:id/audit`
    - Show actor name, action, notes, and timestamp in reverse-chronological order
    - _Requirements: 10.10_

- [x] 20. Final checkpoint — full integration
  - Ensure all tests pass and the full workflow works end-to-end: Guardian submits case (pending), Admin approves it (verified, audit logged), timeline entry added, live tracking starts, language toggle works in both languages, offline queue saves and flushes. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- The backend uses Node.js ES modules (`"type": "module"`) — use `import`/`export` syntax throughout
- The frontend uses React 19 with Vite; no TypeScript — plain `.jsx` and `.js` files
- Leaflet map interactions use `react-leaflet` v5 already installed
- AI description feature requires a `VITE_AI_ENDPOINT` environment variable; if absent, the feature degrades gracefully
- The offline queue stores form metadata only — photo files cannot be stored in `localStorage` and will require re-upload after connectivity is restored
