# Requirements Document

## Introduction

This document defines the requirements for a comprehensive enhancement of the Missing Diary platform — a full-stack missing persons reporting and tracking system built with React (Vite) on the frontend and Node.js/Express with PostgreSQL on the backend.

The enhancements span ten functional areas: interactive location pinning with reverse-geocoding, a WCAG AA-compliant UI redesign, persistent Guardian authentication with JWT auto-login, an Admin approval workflow for new cases, a bilingual English/Bengali language toggle, AI-generated photo descriptions, live GPS location tracking with a 24-hour trail, multi-entry case timelines, offline-mode location queuing, and structured verification action buttons with audit logging.

---

## Glossary

- **System**: The Missing Diary full-stack application (React frontend + Express/PostgreSQL backend).
- **Guardian**: A registered user with role `guardian` who submits and manages missing person cases on behalf of a family.
- **Admin**: A registered user with role `admin` who has full moderation and approval authority over cases and sightings.
- **Police**: A registered user with role `police` who can view all cases and update statuses.
- **Reporter**: Any authenticated user (Guardian, Police, or Admin) who submits a missing person report.
- **Visitor**: An unauthenticated user browsing the platform.
- **Case**: A missing person record stored in the `missing_persons` table.
- **Sighting**: A user-submitted observation of a potentially missing person, stored in the `sightings` table.
- **Map_Pin**: An interactive Leaflet map marker that the Reporter can drag to select a geographic coordinate.
- **Geocoder**: The Nominatim reverse-geocoding service used to convert latitude/longitude into a human-readable address.
- **JWT**: A JSON Web Token issued by the backend upon successful authentication, stored in `localStorage`.
- **Approval_Flow**: The workflow in which a newly submitted Case starts with status `pending` and becomes publicly visible only after an Admin sets it to `active` or `verified`.
- **Language_Toggle**: A UI control in the Navbar that switches the interface language between English (`en`) and Bengali (`bn`) without a page reload.
- **i18n_Store**: The in-memory translation dictionary keyed by language code and string identifier.
- **AI_Describer**: A local on-device or server-side AI model (e.g., a vision model) that generates a text description from an uploaded photo.
- **Location_Tracker**: The browser Geolocation API polling mechanism that records GPS coordinates every 30 seconds.
- **WebSocket_Server**: The server-side WebSocket endpoint that receives and broadcasts live location updates.
- **Location_Trail**: The sequence of GPS coordinates recorded for a Case over the past 24 hours, stored in the `location_trail` table.
- **Timeline_Entry**: A single time-and-location record associated with a Case, stored in the `case_timeline` table.
- **Offline_Queue**: A browser-side persistent store (e.g., `localStorage` or IndexedDB) that holds form submissions captured when the device has no internet connectivity.
- **Verification_Button**: An action button (Approve / Reject / Request Info) rendered in the Admin/Police dashboard for Cases and Sightings.
- **Audit_Log**: A record in the `audit_logs` table capturing who performed which action on which entity and when.
- **WCAG_AA**: Web Content Accessibility Guidelines 2.1 Level AA — the accessibility standard the UI color scheme must satisfy.

---

## Requirements

### Requirement 1: Interactive Location Pin with Reverse-Geocoding

**User Story:** As a Reporter, I want to drag a map pin to the exact last-seen location, so that the address field is filled in automatically and the coordinates are accurate.

#### Acceptance Criteria

1. WHEN the Report Case form loads, THE Map_Pin SHALL be placed at the default coordinate (23.8103°N, 90.4125°E — Dhaka, Bangladesh).
2. WHEN a Reporter clicks anywhere on the map, THE Map_Pin SHALL move to the clicked coordinate.
3. WHEN a Reporter drags the Map_Pin and releases it, THE Map_Pin SHALL remain at the released coordinate.
4. WHEN the Map_Pin position changes, THE Geocoder SHALL be called with the new latitude and longitude within 300ms.
5. WHEN the Geocoder returns a result, THE System SHALL populate the "Last Seen Location" text field with the shortest readable address composed from road, suburb, city, and state components.
6. IF the Geocoder call fails or times out after 5 seconds, THEN THE System SHALL leave the existing "Last Seen Location" field value unchanged and display no error to the Reporter.
7. WHILE the Geocoder call is in progress, THE System SHALL display a loading indicator inside the "Last Seen Location" input field.
8. WHEN the form is submitted, THE System SHALL include the Map_Pin's current latitude and longitude as `last_seen_lat` and `last_seen_lng` in the request payload.

---

### Requirement 2: WCAG AA-Compliant UI Color Redesign

**User Story:** As a Visitor or Reporter, I want the platform to use a visually distinctive and accessible color scheme, so that I can read all content clearly and the interface feels trustworthy.

#### Acceptance Criteria

1. THE System SHALL apply a consistent color palette across all pages: Home, Missing Cases, Case Details, Report Case, Submit Sighting, Login, Register, and Dashboard.
2. THE System SHALL define all colors as CSS custom properties (variables) in a single stylesheet so that changes propagate globally.
3. THE System SHALL ensure every text-on-background color combination used in body text, headings, labels, and buttons meets a contrast ratio of at least 4.5:1 as specified by WCAG_AA.
4. THE System SHALL ensure every large-text (18pt or 14pt bold) color combination meets a contrast ratio of at least 3:1 as specified by WCAG_AA.
5. THE System SHALL ensure all interactive elements (buttons, links, form inputs) have a visible focus indicator with a contrast ratio of at least 3:1 against the adjacent background.
6. THE System SHALL apply the redesigned color scheme to the Navbar, all card components, all form elements, all badge/status indicators, and all modal or overlay elements.
7. WHERE a status badge is rendered (pending, active, verified, found, closed, rejected), THE System SHALL use a distinct color for each status that meets WCAG_AA contrast requirements against the badge background.

---

### Requirement 3: Guardian Login and JWT Auto-Login

**User Story:** As a Guardian, I want my login session to persist across browser restarts, so that I do not have to re-enter my credentials every time I visit the platform.

#### Acceptance Criteria

1. WHEN a user successfully logs in, THE System SHALL store the JWT in `localStorage` under the key `token` and the user object under the key `user`.
2. WHEN the application loads, THE System SHALL read the JWT from `localStorage` and restore the authenticated session without requiring the user to log in again.
3. WHEN the stored JWT is expired or invalid, THE System SHALL clear `localStorage` and redirect the user to the Login page.
4. THE Auth_API SHALL issue JWTs with an expiry of exactly 7 days.
5. WHEN a user logs out, THE System SHALL remove both `token` and `user` from `localStorage` and set the authenticated user state to null.
6. THE Registration_Form SHALL offer `guardian` and `local` as selectable roles; the `admin` and `police` roles SHALL NOT be selectable during self-registration.
7. WHEN a Guardian is authenticated, THE Navbar SHALL display the Guardian's name and a Logout button.
8. WHEN a Visitor accesses a route that requires authentication, THE System SHALL redirect the Visitor to `/login` with a `redirect` query parameter containing the originally requested path.

---

### Requirement 4: Admin Approval Flow

**User Story:** As an Admin, I want all new cases submitted by Guardians to start as "pending" and require my explicit approval before they appear publicly, so that I can prevent false or inappropriate reports from being visible.

#### Acceptance Criteria

1. WHEN a Guardian submits a new Case, THE System SHALL set the Case status to `pending`.
2. WHEN an Admin or Police user submits a new Case, THE System SHALL set the Case status to `verified`.
3. WHILE a Case has status `pending`, THE System SHALL NOT include it in the public cases listing returned to unauthenticated Visitors or non-owner authenticated users.
4. WHEN an Admin sets a Case status to `active` or `verified`, THE System SHALL make the Case visible in the public listing.
5. WHEN an Admin sets a Case status to `rejected`, THE System SHALL remove the Case from the public listing and retain it only in the Admin dashboard.
6. THE Admin_Dashboard SHALL display all Cases regardless of status, with the current status clearly labeled.
7. WHEN an Admin changes a Case status, THE System SHALL insert a record into `audit_logs` containing the Admin's user ID, the action description, the target type `missing_person`, and the target Case ID.
8. IF a Case status update request is made by a user without the `admin` or `police` role, THEN THE System SHALL return HTTP 403 Forbidden.

---

### Requirement 5: Language Toggle (English / Bengali)

**User Story:** As a Visitor or Reporter, I want to switch the interface language between English and Bengali, so that I can use the platform in my preferred language without reloading the page.

#### Acceptance Criteria

1. THE Navbar SHALL display a language toggle control that shows the currently active language.
2. WHEN a user activates the language toggle, THE System SHALL switch all UI strings to the selected language without a full page reload.
3. THE i18n_Store SHALL contain translations for all static UI strings on the Home, Navbar, Missing Cases, Case Details, Report Case, Submit Sighting, Login, Register, and Dashboard pages.
4. WHEN a user selects a language, THE System SHALL persist the selection in `localStorage` under the key `lang`.
5. WHEN the application loads, THE System SHALL read the `lang` value from `localStorage` and apply the corresponding language; IF no value is stored, THEN THE System SHALL default to English (`en`).
6. WHEN the language is set to Bengali (`bn`), THE System SHALL render all translated strings using a Bengali-compatible font.
7. WHERE a string has no Bengali translation defined in the i18n_Store, THE System SHALL fall back to the English string.

---

### Requirement 6: Mandatory Photo Upload with AI-Generated Description

**User Story:** As a Reporter, I want to upload a photo of the missing person and have the system generate a text description automatically, so that the case record is richer and easier to search.

#### Acceptance Criteria

1. THE Report_Case_Form SHALL require at least one photo to be uploaded before the form can be submitted.
2. IF a Reporter attempts to submit the Report_Case_Form without a photo, THEN THE System SHALL display a validation error message and prevent submission.
3. WHEN a photo is uploaded, THE System SHALL upload it to Cloudinary and store the resulting URL in the `person_images` table.
4. WHEN a photo is uploaded and the AI_Describer is available, THE System SHALL generate a text description of the photo and pre-populate the "Additional Description" field with the generated text.
5. WHEN the AI_Describer is unavailable, THE System SHALL allow the Reporter to submit the form without an AI-generated description and SHALL NOT display an error related to AI availability.
6. THE AI_Describer SHALL generate descriptions that include observable physical attributes visible in the photo (e.g., approximate age, clothing color, hair style) without making inferences about identity or ethnicity.
7. WHEN an AI-generated description is pre-populated, THE System SHALL display a label indicating the description was AI-generated and allow the Reporter to edit or clear it before submission.

---

### Requirement 7: Live Location Tracking with 24-Hour Trail

**User Story:** As an Admin or Police user, I want to see a live GPS trail of a missing person's last known movements over the past 24 hours on the map, so that I can coordinate search efforts more effectively.

#### Acceptance Criteria

1. WHEN a Guardian grants GPS permission and enables live tracking for a Case, THE Location_Tracker SHALL poll the browser Geolocation API every 30 seconds.
2. WHEN the Location_Tracker obtains a new coordinate, THE System SHALL transmit the coordinate, timestamp, and Case ID to the backend via WebSocket or HTTP polling endpoint.
3. THE Backend SHALL store each received coordinate in the `location_trail` table with columns: `id`, `case_id`, `lat`, `lng`, `recorded_at`.
4. THE Backend SHALL retain only location trail records with `recorded_at` within the past 24 hours; records older than 24 hours SHALL be eligible for deletion.
5. WHEN an Admin or Police user views a Case detail page, THE System SHALL fetch all `location_trail` records for that Case from the past 24 hours and render them as a polyline on the Leaflet map.
6. WHEN a new location update is received via WebSocket, THE System SHALL append the new coordinate to the rendered polyline without a full page reload.
7. IF the browser Geolocation API returns an error, THEN THE Location_Tracker SHALL log the error and retry after the next 30-second interval.
8. WHILE live tracking is active, THE System SHALL display a visible indicator on the Case detail page showing that tracking is active.

---

### Requirement 8: Case Timeline Entries

**User Story:** As a Reporter or Admin, I want to add multiple time-and-location entries to a case, so that the full sequence of known movements is recorded and visible to investigators.

#### Acceptance Criteria

1. THE System SHALL provide a `case_timeline` table with columns: `id` (UUID), `case_id` (UUID FK → `missing_persons.id`), `entry_time` (TIMESTAMP), `location_text` (TEXT), `lat` (DOUBLE PRECISION), `lng` (DOUBLE PRECISION), `notes` (TEXT), `created_by` (UUID FK → `users.id`), `created_at` (TIMESTAMP DEFAULT NOW()).
2. THE Case_Detail_Page SHALL display all timeline entries for a Case in chronological order, showing entry time, location, and notes.
3. WHEN an authenticated Reporter or Admin submits a new timeline entry for a Case, THE System SHALL insert the entry into `case_timeline` and return the created record.
4. THE Timeline_Entry_Form SHALL require `entry_time` and `location_text`; `lat`, `lng`, and `notes` SHALL be optional.
5. IF a timeline entry submission is made by a user who is neither the Case owner nor an Admin or Police user, THEN THE System SHALL return HTTP 403 Forbidden.
6. WHEN a timeline entry is added, THE System SHALL insert a record into `audit_logs` with the action `Added timeline entry`, the target type `case_timeline`, and the entry ID.
7. THE Case_Detail_Page SHALL render timeline entry locations as additional markers on the Leaflet map, visually distinct from the primary last-seen marker.

---

### Requirement 9: Offline Location Prompt and Submission Queue

**User Story:** As a Reporter with no internet connection, I want the platform to capture my GPS location and queue my report for submission, so that I do not lose the report when connectivity is restored.

#### Acceptance Criteria

1. WHEN the Report_Case_Form loads and the browser has no internet connectivity, THE System SHALL display a banner informing the Reporter that the device is offline.
2. WHEN the device is offline and the Reporter attempts to submit the form, THE System SHALL prompt the Reporter to grant GPS permission to capture the current device location.
3. WHEN the Reporter grants GPS permission while offline, THE System SHALL capture the current latitude and longitude from the browser Geolocation API and store them in the form state.
4. WHEN the Reporter submits the form while offline, THE System SHALL serialize the complete form data (including captured coordinates and any selected photo file reference) into the Offline_Queue stored in `localStorage`.
5. WHEN internet connectivity is restored, THE System SHALL detect the restored connection and automatically attempt to submit all entries in the Offline_Queue to the backend.
6. WHEN an Offline_Queue entry is successfully submitted, THE System SHALL remove it from the Offline_Queue and display a success notification to the Reporter.
7. IF an Offline_Queue submission attempt fails after connectivity is restored, THEN THE System SHALL retain the entry in the Offline_Queue and display an error notification with a manual retry option.
8. THE System SHALL display the count of pending Offline_Queue entries in the UI so the Reporter is aware of queued submissions.

---

### Requirement 10: Verification Action Buttons with Audit Logging

**User Story:** As an Admin or Police user, I want dedicated Approve, Reject, and Request Info action buttons for Cases and Sightings in the dashboard, so that moderation actions are explicit, consistent, and fully audited.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL render an "Approve" button, a "Reject" button, and a "Request Info" button for each Case with status `pending`.
2. THE Admin_Dashboard SHALL render an "Approve" button and a "Reject" button for each Sighting with status `pending`.
3. WHEN an Admin or Police user clicks "Approve" on a Case, THE System SHALL set the Case status to `verified` and insert an `audit_logs` record with action `Approved case`, target type `missing_person`, and the Case ID.
4. WHEN an Admin or Police user clicks "Reject" on a Case, THE System SHALL set the Case status to `rejected` and insert an `audit_logs` record with action `Rejected case`, target type `missing_person`, and the Case ID.
5. WHEN an Admin or Police user clicks "Request Info" on a Case, THE System SHALL set the Case status to `pending` (unchanged) and insert an `audit_logs` record with action `Requested info on case`, target type `missing_person`, and the Case ID; THE System SHALL also allow the Admin to enter a free-text note that is stored with the audit record.
6. WHEN an Admin or Police user clicks "Approve" on a Sighting, THE System SHALL set the Sighting status to `verified` and insert an `audit_logs` record with action `Approved sighting`, target type `sighting`, and the Sighting ID.
7. WHEN an Admin or Police user clicks "Reject" on a Sighting, THE System SHALL set the Sighting status to `rejected` and insert an `audit_logs` record with action `Rejected sighting`, target type `sighting`, and the Sighting ID.
8. IF a verification action request is made by a user without the `admin` or `police` role, THEN THE System SHALL return HTTP 403 Forbidden.
9. THE Audit_Log record SHALL include: `user_id` of the acting Admin/Police, `action` text, `target_type`, `target_id`, `notes` (nullable free text), and `created_at` timestamp.
10. THE Admin_Dashboard SHALL display the audit history for each Case and Sighting, showing actor name, action, notes, and timestamp in reverse-chronological order.
