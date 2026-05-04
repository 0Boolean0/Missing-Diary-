# Bugfix Requirements Document

## Introduction

The "Submit Sighting" form in Missing Diary allows anonymous/local users to report a sighting of a missing person. Three related bugs exist in the current implementation:

1. **Enter-key premature submission** — pressing Enter anywhere in the form triggers submission even when no photo or video has been uploaded, bypassing the intended media requirement.
2. **Missing media validation** — neither the frontend nor the backend enforces that at least one media file (photo or video) must be present before a sighting is accepted. The `image_url` column is stored as `null` for media-free submissions, and the backend `sightingSchema` does not require a file.
3. **Incomplete submission pipeline** — after a sighting is saved it goes directly to `status = 'pending'` with no AI-assisted verification step, and the admin approval gate does not prevent the sighting from being visible to the public before an admin explicitly approves it.

These bugs together mean that incomplete, unverified sightings can be submitted with a single accidental keypress and may surface to the public without any human review.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user presses the Enter key while focus is on any text input inside the Submit Sighting form AND no photo or video has been uploaded, THEN the system submits the form immediately without displaying any validation error.

1.2 WHEN a user clicks the submit button without attaching a photo or video, THEN the system accepts the submission and creates a sighting record with `image_url = null` and `status = 'pending'`.

1.3 WHEN the backend `createSighting` controller receives a sighting POST request that contains no file attachment, THEN the system inserts the record without returning a validation error, because the Zod schema does not require a file.

1.4 WHEN a sighting is saved with `status = 'pending'`, THEN the system does not call any AI verification endpoint before persisting the record, so no credibility score or flags are attached to the submission.

1.5 WHEN a sighting has `status = 'pending'` (not yet approved by an admin), THEN the system returns it in the public sightings listing, making unreviewed sightings visible to all users.

### Expected Behavior (Correct)

2.1 WHEN a user presses the Enter key while focus is on any text input inside the Submit Sighting form AND no photo or video has been uploaded, THEN the system SHALL prevent form submission and SHALL display a validation error message indicating that a media file is required.

2.2 WHEN a user clicks the submit button without attaching a photo or video, THEN the system SHALL prevent submission, SHALL highlight the media upload field, and SHALL display the message "A photo or video is required to submit a sighting."

2.3 WHEN the backend `createSighting` controller receives a sighting POST request that contains no file attachment, THEN the system SHALL return HTTP 400 with an error message indicating that media is required, and SHALL NOT insert a record into the `sightings` table.

2.4 WHEN a sighting POST request passes media validation, THEN the system SHALL call the AI verification utility with the sighting's description and image URL, attach the resulting `ai_score` and `ai_flags` to the record, and persist the sighting with `status = 'pending'`.

2.5 WHEN a sighting has `status = 'pending'` or `status = 'rejected'`, THEN the system SHALL NOT include it in any public-facing sightings response; only sightings with `status = 'verified'` SHALL be visible to unauthenticated users and non-admin authenticated users.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user attaches a valid photo or video AND fills all required fields AND submits the form, THEN the system SHALL CONTINUE TO create the sighting record and navigate the user to the relevant case page.

3.2 WHEN an admin or police user calls `POST /api/sightings/:id/approve`, THEN the system SHALL CONTINUE TO set the sighting status to `verified` and insert an audit log record.

3.3 WHEN an admin or police user calls `POST /api/sightings/:id/reject`, THEN the system SHALL CONTINUE TO set the sighting status to `rejected` and insert an audit log record.

3.4 WHEN an authenticated admin or police user requests the sightings list via `GET /api/sightings`, THEN the system SHALL CONTINUE TO return all sightings regardless of status.

3.5 WHEN a user submits a sighting anonymously (without logging in), THEN the system SHALL CONTINUE TO accept the submission (subject to the new media requirement) and store `reported_by = null`.

3.6 WHEN the AI verification utility is unavailable or returns null, THEN the system SHALL CONTINUE TO accept the sighting submission and store it with `ai_score = null` and `ai_flags = null`, without blocking the submission.

3.7 WHEN a user selects a missing person from the dropdown and pins a location on the map, THEN the system SHALL CONTINUE TO include `missing_person_id`, `lat`, and `lng` in the submitted payload.

---

## Bug Condition Pseudocode

### Bug Condition Function

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type SightingSubmission
  OUTPUT: boolean

  // Returns true when the submission is missing required media
  RETURN X.imageFile = null AND X.videoFile = null
END FUNCTION
```

### Fix Checking Property

```pascal
// Property: Fix Checking — media-less submissions must be rejected
FOR ALL X WHERE isBugCondition(X) DO
  result ← submitSighting'(X)
  ASSERT result.httpStatus = 400
    AND result.body.message CONTAINS "required"
    AND no_record_inserted(X)
END FOR
```

### Preservation Checking Property

```pascal
// Property: Preservation Checking — valid submissions must still succeed
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT submitSighting(X) = submitSighting'(X)
  // i.e. a submission with media attached behaves identically before and after the fix
END FOR
```
