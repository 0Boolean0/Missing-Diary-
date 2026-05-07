<<<<<<< Updated upstream
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
=======
# Tasks — Missing Diary Enhancements

## Implementation Plan

---

## Phase 0: Database Migrations & Backend Foundation

- [x] 0.1 Add new DB columns to existing tables
  - [x] 0.1.1 Add `name_bn`, `identifying_marks`, `skin_color`, `weight` columns to `missing_persons`
  - [x] 0.1.2 Add `photo_description` column to `person_images`
  - [x] 0.1.3 Write migration SQL and update `backend/schema.sql`

- [x] 0.2 Create `case_timeline` table
  - [x] 0.2.1 Add CREATE TABLE statement to schema.sql
  - [x] 0.2.2 Add index on `(case_id, time_at ASC)`

- [x] 0.3 Create `location_tracking` table
  - [x] 0.3.1 Add CREATE TABLE statement to schema.sql
  - [x] 0.3.2 Add index on `(case_id, recorded_at DESC)`

- [x] 0.4 Create `notifications` table
  - [x] 0.4.1 Add CREATE TABLE statement to schema.sql

---

## Phase 1: Requirement 1 — Location Pin (Drag Support + Refinement)

- [x] 1.1 Enhance `MapView` component to support draggable markers
  - [x] 1.1.1 Add `draggable` prop to `MapView`
  - [x] 1.1.2 Attach `dragend` event handler that calls `onPick` with new `latlng`
  - [x] 1.1.3 Ensure `ClickPicker` and draggable marker coexist correctly

- [x] 1.2 Update `ReportCase` to use draggable map pin
  - [x] 1.2.1 Pass `draggable={true}` to `MapView` in the Last Seen section
  - [x] 1.2.2 Verify `handleMapPick` is called on both click and drag end
  - [x] 1.2.3 Show geocoding spinner (⏳) while reverse-geocode is in progress
  - [x] 1.2.4 Handle geocoding failure gracefully (field stays editable, coordinates preserved)

- [x] 1.3 Update `SubmitSighting` to use draggable map pin
  - [x] 1.3.1 Add reverse geocoding to sighting location field (same pattern as ReportCase)
  - [x] 1.3.2 Pass `draggable={true}` to `MapView`

---

## Phase 2: Requirement 2 — UI / Color Scheme Redesign

- [x] 2.1 Define new design tokens in `styles.css`
  - [x] 2.1.1 Update CSS variables: primary, accent, background, surface, text, muted, border, success, warning, danger
  - [x] 2.1.2 Ensure all color pairs meet WCAG 2.1 AA contrast ratio (≥ 4.5:1 normal text, ≥ 3:1 large text)
  - [x] 2.1.3 Define distinct status badge colors for all 6 statuses

- [ ] 2.2 Redesign `Navbar`
  - [ ] 2.2.1 Apply new color scheme to navbar background and links
  - [ ] 2.2.2 Add language toggle button placeholder (wired in Phase 5)
  - [ ] 2.2.3 Improve mobile responsiveness

- [ ] 2.3 Redesign `Home` page
  - [ ] 2.3.1 Update hero section colors and typography
  - [ ] 2.3.2 Update stats bar, how-it-works, features, join-us, footer sections

- [ ] 2.4 Redesign `MissingCases` page
  - [ ] 2.4.1 Update filter bar, status tabs, and card grid styling

- [ ] 2.5 Redesign `CaseCard` component
  - [ ] 2.5.1 Improve card layout, image aspect ratio, badge styling

- [ ] 2.6 Redesign `CaseDetails` page
  - [ ] 2.6.1 Update details grid, photo section, QR box, AI match box, timeline section

- [ ] 2.7 Redesign `Dashboard` page
  - [ ] 2.7.1 Update sidebar, stat cards, table, and action button styles

- [ ] 2.8 Redesign `ReportCase` page
  - [ ] 2.8.1 Update form cards, section headers, dropzone, submit button

- [ ] 2.9 Redesign `Login` and `Register` pages
  - [ ] 2.9.1 Update auth card, input fields, role selector, submit button

- [ ] 2.10 Redesign `Sightings` and `SubmitSighting` pages
  - [ ] 2.10.1 Update anonymous toggle, form fields, map section

---

## Phase 3: Requirement 3 — Guardian Login & Auto-Login

- [-] 3.1 Verify and harden `AuthContext` auto-login behavior
  - [ ] 3.1.1 Confirm `useState` initializer reads `localStorage.getItem('user')` on mount
  - [ ] 3.1.2 Add token validation on app load: call `GET /api/auth/me` to verify token is still valid; if 401, clear storage and set user to null
  - [ ] 3.1.3 Add Axios response interceptor in `api/client.js` to catch 401 responses, clear localStorage, and redirect to `/login`

- [ ] 3.2 Update `Register` page to clearly support Guardian role
  - [ ] 3.2.1 Ensure role selector shows `guardian` and `local` options with clear descriptions
  - [ ] 3.2.2 Default role to `guardian` on the Register page

- [ ] 3.3 Update `Login` page
  - [ ] 3.3.1 Add "Remember me" checkbox (already handled by localStorage, just add UI label)
  - [ ] 3.3.2 Show redirect notice when user is sent to login from a protected route

- [ ] 3.4 Protect routes that require authentication
  - [ ] 3.4.1 Create `ProtectedRoute` component that redirects to `/login?redirect=...` if no user
  - [ ] 3.4.2 Wrap `/report`, `/sighting/:id`, `/dashboard` routes with `ProtectedRoute`

---

## Phase 4: Requirement 4 — Admin Approval Flow

- [ ] 4.1 Fix public case listing to hide pending/rejected cases
  - [ ] 4.1.1 Update `listCases` in `caseController.js`: for unauthenticated or non-admin/police users, add `WHERE mp.status IN ('verified','active','found')` filter
  - [ ] 4.1.2 Update `Home.jsx` to only show verified/active cases in recent alerts
  - [ ] 4.1.3 Update `MissingCases.jsx` to remove 'pending' from the public status filter tabs

- [ ] 4.2 Add pending cases section to Dashboard for admin
  - [ ] 4.2.1 Add a "Pending Approval" tab to the Dashboard sidebar
  - [ ] 4.2.2 Fetch pending cases separately: `GET /cases?status=pending` (admin only)
  - [ ] 4.2.3 Display pending cases in a dedicated table with Approve/Reject/Request Info buttons

- [ ] 4.3 Implement `ActionButtons` component
  - [ ] 4.3.1 Create `frontend/src/components/ActionButtons.jsx`
  - [ ] 4.3.2 Props: `type` ('case'|'sighting'), `id`, `currentStatus`, `onAction`
  - [ ] 4.3.3 Render Approve/Reject/Request Info for cases; Verify/Reject/Flag for sightings
  - [ ] 4.3.4 Disable all buttons after any action is taken (replace with status badge + confirmation)
  - [ ] 4.3.5 Show loading spinner on the clicked button during API call

- [ ] 4.4 Wire ActionButtons into Dashboard
  - [ ] 4.4.1 Replace existing inline `db-mini-btn` buttons in Dashboard with `ActionButtons` component
  - [ ] 4.4.2 Handle `onAction` callback to update local state

- [ ] 4.5 Implement "Request Info" notification
  - [ ] 4.5.1 Add `POST /api/admin/notify/:caseId` route in `adminRoutes.js`
  - [ ] 4.5.2 Create handler in `adminController.js` that inserts a row into `notifications` table
  - [ ] 4.5.3 Log the action in `audit_logs`

- [ ] 4.6 Show case status to Guardian in Dashboard
  - [ ] 4.6.1 Ensure Guardian's case list shows status badge (pending/verified/rejected) for each case
  - [ ] 4.6.2 Show a notification banner if any of their cases have a new notification

---

## Phase 5: Requirement 5 — Language Toggle (EN/BN)

- [ ] 5.1 Create translation dictionary
  - [ ] 5.1.1 Create `frontend/src/i18n/translations.js` with `en` and `bn` objects
  - [ ] 5.1.2 Add translations for all Navbar strings
  - [ ] 5.1.3 Add translations for Home page strings
  - [ ] 5.1.4 Add translations for Login/Register page strings
  - [ ] 5.1.5 Add translations for ReportCase form labels, placeholders, and error messages
  - [ ] 5.1.6 Add translations for MissingCases page strings
  - [ ] 5.1.7 Add translations for CaseDetails page strings
  - [ ] 5.1.8 Add translations for Dashboard strings
  - [ ] 5.1.9 Add translations for Sightings/SubmitSighting strings
  - [ ] 5.1.10 Add translations for all badge/status labels and common UI strings

- [ ] 5.2 Create `LanguageContext`
  - [ ] 5.2.1 Create `frontend/src/context/LanguageContext.jsx`
  - [ ] 5.2.2 Initialize from `localStorage.getItem('lang')` defaulting to `'en'`
  - [ ] 5.2.3 Persist language changes to `localStorage`
  - [ ] 5.2.4 Export `useLanguage()` hook and `t()` helper

- [ ] 5.3 Add `LanguageProvider` to app root
  - [ ] 5.3.1 Wrap app in `LanguageProvider` in `main.jsx`

- [ ] 5.4 Add `LanguageToggle` to Navbar
  - [ ] 5.4.1 Create `frontend/src/components/LanguageToggle.jsx`
  - [ ] 5.4.2 Render EN/বাংলা toggle button in Navbar
  - [ ] 5.4.3 On click, call `setLang` from `LanguageContext`

- [ ] 5.5 Apply translations to all pages and components
  - [ ] 5.5.1 Update `Navbar.jsx` to use `t()` for all text
  - [ ] 5.5.2 Update `Home.jsx` to use `t()` for all static text
  - [ ] 5.5.3 Update `Login.jsx` and `Register.jsx`
  - [ ] 5.5.4 Update `ReportCase.jsx` labels and placeholders
  - [ ] 5.5.5 Update `MissingCases.jsx`
  - [ ] 5.5.6 Update `CaseDetails.jsx`
  - [ ] 5.5.7 Update `Dashboard.jsx`
  - [ ] 5.5.8 Update `Sightings.jsx` and `SubmitSighting.jsx`
  - [ ] 5.5.9 Update `CaseCard.jsx`

---

## Phase 6: Requirement 6 — AI Photo Description

- [ ] 6.1 Add mandatory photo validation to `ReportCase`
  - [ ] 6.1.1 Add client-side check: if no photo is selected, show error and block form submission
  - [ ] 6.1.2 Add file size validation: reject files > 10MB with an error message
  - [ ] 6.1.3 Update submit button to show "Photo required" hint when no photo is attached

- [ ] 6.2 Create `AIPhotoDescription` component
  - [ ] 6.2.1 Create `frontend/src/components/AIPhotoDescription.jsx`
  - [ ] 6.2.2 Accept `file` prop (the selected image File object)
  - [ ] 6.2.3 On file change, POST to `VITE_AI_ENDPOINT/describe` as multipart/form-data
  - [ ] 6.2.4 Show loading spinner while waiting for response
  - [ ] 6.2.5 Display returned description in a read-only `<textarea>`
  - [ ] 6.2.6 On failure or if `VITE_AI_ENDPOINT` is not set, show muted "AI description unavailable" message
  - [ ] 6.2.7 Expose `description` value to parent via callback prop `onDescription`

- [ ] 6.3 Integrate `AIPhotoDescription` into `ReportCase`
  - [ ] 6.3.1 Render `AIPhotoDescription` below the photo dropzone
  - [ ] 6.3.2 Store the AI description in form state
  - [ ] 6.3.3 Append `photo_description` to FormData on submit

- [ ] 6.4 Update backend to store photo description
  - [ ] 6.4.1 Update `createCase` in `caseController.js` to read `photo_description` from request body
  - [ ] 6.4.2 Store `photo_description` in the `person_images` row for the first uploaded image
  - [ ] 6.4.3 Update Zod schema to accept optional `photo_description` field

- [ ] 6.5 Add `VITE_AI_ENDPOINT` to `frontend/.env.example`

---

## Phase 7: Requirement 7 — Live Location Tracking

- [ ] 7.1 Create backend tracking routes and controller
  - [ ] 7.1.1 Create `backend/src/controllers/trackingController.js`
  - [ ] 7.1.2 Implement `POST /api/tracking/:caseId` — insert row into `location_tracking`
  - [ ] 7.1.3 Implement `GET /api/tracking/:caseId` — return rows from last 24 hours
  - [ ] 7.1.4 Create `backend/src/routes/trackingRoutes.js` with `requireAuth` middleware
  - [ ] 7.1.5 Register tracking routes in `server.js`

- [ ] 7.2 Create `LiveTracker` component
  - [ ] 7.2.1 Create `frontend/src/components/LiveTracker.jsx`
  - [ ] 7.2.2 On mount (when enabled), call `navigator.geolocation.getCurrentPosition` every 30 seconds via `setInterval`
  - [ ] 7.2.3 POST each location update to `POST /api/tracking/:caseId`
  - [ ] 7.2.4 On unmount or "Stop Tracking" click, clear the interval
  - [ ] 7.2.5 Handle permission denied: show error message, disable tracking
  - [ ] 7.2.6 Show "Tracking active" / "Tracking stopped" status indicator

- [ ] 7.3 Integrate `LiveTracker` into `CaseDetails`
  - [ ] 7.3.1 Show `LiveTracker` component for admin and case owner (guardian)
  - [ ] 7.3.2 Fetch location trail from `GET /api/tracking/:caseId` on page load
  - [ ] 7.3.3 Display trail as a `Polyline` on the Leaflet map (add to `MapView`)
  - [ ] 7.3.4 Show most recent location as a distinct marker (different icon color)

- [ ] 7.4 Update `MapView` to support polyline trail
  - [ ] 7.4.1 Add `trail` prop: array of `{lat, lng}` points
  - [ ] 7.4.2 Render `<Polyline>` from react-leaflet when `trail` is provided

---

## Phase 8: Requirement 8 — Case Timeline Entries

- [ ] 8.1 Create backend timeline routes and controller
  - [ ] 8.1.1 Create `backend/src/controllers/timelineController.js`
  - [ ] 8.1.2 Implement `POST /api/cases/:id/timeline` — validate `time_at` is in the past, insert row
  - [ ] 8.1.3 Implement `GET /api/cases/:id/timeline` — return entries sorted by `time_at ASC`
  - [ ] 8.1.4 Implement `DELETE /api/cases/:id/timeline/:entryId` — owner or admin only
  - [ ] 8.1.5 Add timeline routes to `caseRoutes.js`

- [ ] 8.2 Create `TimelineEditor` component
  - [ ] 8.2.1 Create `frontend/src/components/TimelineEditor.jsx`
  - [ ] 8.2.2 Manage local array of `TimelineEntry` objects in state
  - [ ] 8.2.3 Render "Add Timeline Entry" button
  - [ ] 8.2.4 On click, show inline form: datetime-local input, location text input, mini map picker
  - [ ] 8.2.5 Validate that selected time is in the past; show error if future
  - [ ] 8.2.6 Allow editing and deleting entries before submission
  - [ ] 8.2.7 Expose entries array to parent via `onChange` prop

- [ ] 8.3 Integrate `TimelineEditor` into `ReportCase`
  - [ ] 8.3.1 Add `TimelineEditor` as Section 5 in the report form
  - [ ] 8.3.2 On form submit, POST each timeline entry to `POST /api/cases/:id/timeline` after case creation

- [ ] 8.4 Display timeline in `CaseDetails`
  - [ ] 8.4.1 Fetch timeline from `GET /api/cases/:id/timeline`
  - [ ] 8.4.2 Render timeline entries in chronological order with time, location, and map coordinates
  - [ ] 8.4.3 On entry click, pan the map to that entry's coordinates and highlight the marker
  - [ ] 8.4.4 Add timeline markers to the `MapView` markers array with a distinct icon

---

## Phase 9: Requirement 9 — Offline Submission with Location Prompt

- [ ] 9.1 Create `OfflineQueueContext`
  - [ ] 9.1.1 Create `frontend/src/context/OfflineQueueContext.jsx`
  - [ ] 9.1.2 Initialize queue from `localStorage.getItem('offline_queue')` (parse JSON)
  - [ ] 9.1.3 Listen to `window` `online` and `offline` events; update `status` state
  - [ ] 9.1.4 Implement `enqueue(submission)` — adds item to queue, persists to localStorage
  - [ ] 9.1.5 Implement `retryAll()` — iterates queue, attempts POST, increments retry counter, removes on success
  - [ ] 9.1.6 Implement exponential backoff: delay = 2^retries * 1000ms (1s, 2s, 4s)
  - [ ] 9.1.7 After 3 failed retries, mark item as `failed` (do not remove from queue)
  - [ ] 9.1.8 On `online` event, automatically call `retryAll()`
  - [ ] 9.1.9 Wrap app in `OfflineQueueProvider` in `main.jsx`

- [ ] 9.2 Create `OfflineIndicator` component
  - [ ] 9.2.1 Create `frontend/src/components/OfflineIndicator.jsx`
  - [ ] 9.2.2 Show banner when `status === 'offline'`
  - [ ] 9.2.3 Display queue count (e.g. "1 submission queued")
  - [ ] 9.2.4 Show "Syncing..." when `status === 'online'` and queue is non-empty
  - [ ] 9.2.5 Show GPS permission prompt button when offline

- [ ] 9.3 Integrate offline handling into `ReportCase`
  - [ ] 9.3.1 Add `OfflineIndicator` at the top of the form
  - [ ] 9.3.2 On form submit, check `navigator.onLine`; if offline, call `enqueue()` instead of `api.post()`
  - [ ] 9.3.3 When offline, prompt for GPS permission via `navigator.geolocation.getCurrentPosition`
  - [ ] 9.3.4 Store captured GPS in the queue item; if denied, store `lat: null, lng: null`
  - [ ] 9.3.5 Show success message "Saved offline — will upload when connected"

- [ ] 9.4 Integrate offline handling into `SubmitSighting`
  - [ ] 9.4.1 Same pattern as ReportCase: check online status, enqueue if offline

---

## Phase 10: Requirement 10 — Verification Action Buttons (Full Admin Flow)

- [ ] 10.1 Enhance `ActionButtons` component (built in Phase 4)
  - [ ] 10.1.1 Add "Flag" action for sightings (sets status to `'flagged'` — add to sightings status enum)
  - [ ] 10.1.2 Add "Request Info" action for cases (calls `POST /api/admin/notify/:caseId`)
  - [ ] 10.1.3 Show confirmation toast/banner after each successful action
  - [ ] 10.1.4 Ensure all buttons are disabled immediately on click (prevent double-submit)
  - [ ] 10.1.5 Re-enable buttons if the API call fails (with error message)

- [ ] 10.2 Update sightings status enum in backend
  - [ ] 10.2.1 Add `'flagged'` to the `status` CHECK constraint in `sightings` table (migration)
  - [ ] 10.2.2 Update Zod schema in `sightingController.js` to accept `'flagged'`

- [ ] 10.3 Add pending sightings section to Dashboard
  - [ ] 10.3.1 Add "Pending Sightings" sub-section in the Sightings tab
  - [ ] 10.3.2 Show `ActionButtons` with Verify/Reject/Flag for each pending sighting

- [ ] 10.4 Verify audit logging for all admin actions
  - [ ] 10.4.1 Confirm `updateCaseStatus` logs to `audit_logs` (already exists — verify)
  - [ ] 10.4.2 Confirm `updateSightingStatus` logs to `audit_logs` (already exists — verify)
  - [ ] 10.4.3 Add audit log entry for "Request Info" notification action
  - [ ] 10.4.4 Add audit log entry for "Flag" sighting action

---

## Phase 11: Integration, Testing & Polish

- [ ] 11.1 Write property-based tests (fast-check)
  - [ ] 11.1.1 Install `fast-check` in frontend dev dependencies
  - [ ] 11.1.2 Property 3: coordinates round-trip through case create/retrieve
  - [ ] 11.1.3 Property 4: WCAG contrast ratio for all CSS color token pairs
  - [ ] 11.1.4 Property 5: status badge CSS class uniqueness
  - [ ] 11.1.5 Property 6: login stores token in localStorage
  - [ ] 11.1.6 Property 8: guardian-submitted cases have status=pending
  - [ ] 11.1.7 Property 9: pending cases excluded from public listing
  - [ ] 11.1.8 Property 11: admin status update creates audit log entry
  - [ ] 11.1.9 Property 12: translation dictionary completeness (all keys have en+bn values)
  - [ ] 11.1.10 Property 13: language preference round-trips through localStorage
  - [ ] 11.1.11 Property 14: file size 10MB threshold enforcement
  - [ ] 11.1.12 Property 17: location trail limited to last 24 hours
  - [ ] 11.1.13 Property 18: timeline entry past-date validation
  - [ ] 11.1.14 Property 19: timeline entries returned in chronological order
  - [ ] 11.1.15 Property 22: offline upload retry count never exceeds 3
  - [ ] 11.1.16 Property 24: sighting status updated correctly by admin action

- [ ] 11.2 Write unit tests (Vitest + React Testing Library)
  - [ ] 11.2.1 `LanguageContext`: t() returns correct strings; localStorage persistence
  - [ ] 11.2.2 `AuthContext`: token storage on login; session restore on mount; logout clears storage
  - [ ] 11.2.3 `TimelineEditor`: future-date validation; chronological sort
  - [ ] 11.2.4 `OfflineQueueContext`: enqueue/dequeue; retry counter; max 3 retries
  - [ ] 11.2.5 `ActionButtons`: disabled after action; confirmation message shown
  - [ ] 11.2.6 `AIPhotoDescription`: loading state; graceful degradation on failure
  - [ ] 11.2.7 Backend `createCase`: status=pending for guardian; status=verified for admin/police
  - [ ] 11.2.8 Backend `listCases`: pending cases filtered for public requests

- [ ] 11.3 End-to-end integration tests
  - [ ] 11.3.1 Admin approval flow: create as guardian → pending → approve → publicly visible
  - [ ] 11.3.2 Language toggle: switch to Bangla → verify all strings change → reload → verify persisted
  - [ ] 11.3.3 Offline queue: go offline → submit → go online → verify API called

- [ ] 11.4 Final polish and bug fixes
  - [ ] 11.4.1 Verify all pages are responsive on mobile (≤ 600px)
  - [ ] 11.4.2 Verify Leaflet map z-index does not overlap Navbar on any page
  - [ ] 11.4.3 Verify Bangla Unicode text renders correctly in all form fields
  - [ ] 11.4.4 Add `VITE_AI_ENDPOINT` documentation to README
  - [ ] 11.4.5 Update `backend/.env.example` with any new environment variables
  - [ ] 11.4.6 Run full test suite and fix any failures
>>>>>>> Stashed changes
