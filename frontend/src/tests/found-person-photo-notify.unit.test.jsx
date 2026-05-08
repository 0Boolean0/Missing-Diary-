/**
 * Frontend Unit Tests — found-person-photo-notify
 *
 * Task 11.1: Dashboard shows placeholder when case is 'found' but foundPhotos is empty
 * Task 11.2: Dashboard inline upload form appears after clicking "Mark as Found"
 *
 * Validates:
 *   Req 3.2 — WHEN the Case_Detail_Page loads a Case whose status is 'found' but
 *             which has no Found_Photo, THE Case_Detail_Page SHALL display a
 *             placeholder message "No found-person photo has been uploaded yet".
 *   Req 4.1 — WHEN a Police_Officer views the Dashboard and a Case has status other
 *             than 'found', THE Dashboard SHALL display a "Mark as Found" button.
 *   Req 4.2 — WHEN a Police_Officer clicks "Mark as Found", THE Dashboard SHALL
 *             display an inline upload form containing a file input and a "Submit" button.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../context/LangContext', () => ({
  useLang: vi.fn(),
}));

vi.mock('../components/Navbar', () => ({
  default: () => <nav data-testid="navbar-stub" />,
}));

vi.mock('../components/MapView', () => ({
  default: () => <div data-testid="map-view-stub" />,
}));

vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => null,
}));

vi.mock('../utils/locationTracker', () => ({
  startTracking: vi.fn(),
  stopTracking: vi.fn(),
}));

// ── Imports that depend on mocks ──────────────────────────────────────────────

import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import CaseDetails from '../pages/CaseDetails';
import Dashboard from '../pages/Dashboard';

// ── Shared setup ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useLang.mockReturnValue({ t: (key) => key });
  useAuth.mockReturnValue({ user: null });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const CASE_ID = 'case-found-001';

const foundCaseNoPhotos = {
  id: CASE_ID,
  name: 'Jane Doe',
  status: 'found',
  age: 30,
  gender: 'female',
  last_seen_location: 'Dhaka, Mirpur',
  last_seen_lat: 23.8,
  last_seen_lng: 90.4,
  images: [],
  sightings: [],
  description: 'Test case description',
};

/**
 * Set up api.get mock for CaseDetails with a 'found' case and empty foundPhotos.
 */
function mockCaseDetailsApi({ caseData, foundPhotos = [] } = {}) {
  api.get.mockImplementation((url) => {
    if (url === `/cases/${caseData.id}`) return Promise.resolve({ data: caseData });
    if (url === `/cases/${caseData.id}/timeline`) return Promise.resolve({ data: [] });
    if (url === `/cases/${caseData.id}/found-photos`) return Promise.resolve({ data: foundPhotos });
    if (url.endsWith('/trail')) return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
  api.post.mockResolvedValue({ data: {} });
}

/**
 * Render CaseDetails with the correct route param supplied via Routes/Route.
 */
function renderCaseDetails(caseId) {
  return render(
    <MemoryRouter initialEntries={[`/cases/${caseId}`]}>
      <Routes>
        <Route path="/cases/:id" element={<CaseDetails />} />
      </Routes>
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CaseDetails — Found Person Photo section (Req 3.2)', () => {
  it('shows placeholder "No found-person photo has been uploaded yet" when status is "found" and foundPhotos is empty', async () => {
    mockCaseDetailsApi({ caseData: foundCaseNoPhotos, foundPhotos: [] });

    renderCaseDetails(CASE_ID);

    // Wait for the case to load and the component to render the found-photo section
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(`/cases/${CASE_ID}`);
    });

    // Wait for the found-photos endpoint to be called (triggered when status === 'found')
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(`/cases/${CASE_ID}/found-photos`);
    });

    // The "Found Person Photo" section heading must be present
    expect(screen.getByText('Found Person Photo')).toBeInTheDocument();

    // The placeholder message must be visible
    expect(
      screen.getByText('No found-person photo has been uploaded yet.')
    ).toBeInTheDocument();
  });

  it('does NOT show the placeholder when foundPhotos has at least one photo', async () => {
    const photos = [
      {
        id: 'photo-uuid-1',
        image_url: 'https://res.cloudinary.com/example/found-persons/photo1.jpg',
        public_id: 'missing-diary/found-persons/photo1',
        created_at: '2025-01-15T10:30:00.000Z',
      },
    ];

    mockCaseDetailsApi({ caseData: foundCaseNoPhotos, foundPhotos: photos });

    renderCaseDetails(CASE_ID);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(`/cases/${CASE_ID}/found-photos`);
    });

    // The placeholder must NOT be present when photos exist
    expect(
      screen.queryByText('No found-person photo has been uploaded yet.')
    ).not.toBeInTheDocument();

    // The photo image must be rendered instead
    const img = await screen.findByAltText('Found person');
    expect(img).toHaveAttribute('src', photos[0].image_url);
  });

  it('does NOT show the "Found Person Photo" section when case status is not "found"', async () => {
    const nonFoundCase = { ...foundCaseNoPhotos, status: 'active' };
    mockCaseDetailsApi({ caseData: nonFoundCase, foundPhotos: [] });

    renderCaseDetails(CASE_ID);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(`/cases/${CASE_ID}`);
    });

    // The "Found Person Photo" section must not be rendered for non-found cases
    expect(screen.queryByText('Found Person Photo')).not.toBeInTheDocument();
    expect(
      screen.queryByText('No found-person photo has been uploaded yet.')
    ).not.toBeInTheDocument();
  });

  it('shows placeholder when API returns an empty array for found-photos', async () => {
    // Explicitly test the API returning [] (not just a default)
    mockCaseDetailsApi({ caseData: foundCaseNoPhotos, foundPhotos: [] });

    renderCaseDetails(CASE_ID);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(`/cases/${CASE_ID}/found-photos`);
    });

    expect(
      screen.getByText('No found-person photo has been uploaded yet.')
    ).toBeInTheDocument();
  });

  it('shows placeholder when found-photos API call fails (error fallback to empty array)', async () => {
    // When the API call fails, foundPhotos falls back to [] and placeholder should show
    api.get.mockImplementation((url) => {
      if (url === `/cases/${CASE_ID}`) return Promise.resolve({ data: foundCaseNoPhotos });
      if (url === `/cases/${CASE_ID}/timeline`) return Promise.resolve({ data: [] });
      if (url === `/cases/${CASE_ID}/found-photos`) return Promise.reject(new Error('Network error'));
      if (url.endsWith('/trail')) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderCaseDetails(CASE_ID);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(`/cases/${CASE_ID}/found-photos`);
    });

    // After the error, foundPhotos is set to [] and placeholder should be shown
    await waitFor(() => {
      expect(
        screen.getByText('No found-person photo has been uploaded yet.')
      ).toBeInTheDocument();
    });
  });
});

// ── Task 11.2 helpers ─────────────────────────────────────────────────────────

const POLICE_USER = { id: 'officer-1', name: 'Officer Smith', role: 'police' };

const ACTIVE_CASE = {
  id: 'case-active-001',
  name: 'John Missing',
  status: 'active',
  age: 25,
  gender: 'male',
  last_seen_location: 'Dhaka, Gulshan',
  last_seen_lat: 23.79,
  last_seen_lng: 90.41,
  images: [],
  description: 'Active case for upload form test',
  reporter_name: 'Reporter A',
  reporter_phone: '01700000000',
};

/**
 * Set up api.get mock for Dashboard with a police user and a list of cases.
 */
function mockDashboardApi(cases = [ACTIVE_CASE]) {
  api.get.mockImplementation((url) => {
    if (url === '/cases') return Promise.resolve({ data: cases });
    if (url === '/sightings') return Promise.resolve({ data: [] });
    if (url === '/notifications') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
}

/**
 * Render Dashboard inside a MemoryRouter (Dashboard uses <Link>).
 */
function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Dashboard />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

/**
 * Validates: Requirements 4.1 and 4.2
 */
describe('Dashboard — Mark as Found button and inline upload form (Req 4.1, 4.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLang.mockReturnValue({ t: (key) => key });
    useAuth.mockReturnValue({ user: POLICE_USER });
  });

  it('shows "Mark as Found" button for a case with status !== "found"', async () => {
    mockDashboardApi([ACTIVE_CASE]);

    renderDashboard();

    // Wait for cases to load and the button to appear
    const markAsFoundBtn = await screen.findByRole('button', { name: /mark as found/i });
    expect(markAsFoundBtn).toBeInTheDocument();
  });

  it('shows inline upload form with file input and Submit button after clicking "Mark as Found"', async () => {
    const user = userEvent.setup();
    mockDashboardApi([ACTIVE_CASE]);

    renderDashboard();

    // Wait for the "Mark as Found" button to appear
    const markAsFoundBtn = await screen.findByRole('button', { name: /mark as found/i });
    expect(markAsFoundBtn).toBeInTheDocument();

    // The upload form should NOT be visible before clicking
    expect(screen.queryByRole('button', { name: /^submit$/i })).not.toBeInTheDocument();

    // Click "Mark as Found"
    await user.click(markAsFoundBtn);

    // The inline upload form should now be visible
    // Verify the file input is present and accepts the correct MIME types
    const fileInputEl = document.querySelector('input[type="file"]');
    expect(fileInputEl).toBeInTheDocument();
    expect(fileInputEl).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');

    // Verify the Submit button is present
    const submitBtn = screen.getByRole('button', { name: /^submit$/i });
    expect(submitBtn).toBeInTheDocument();
  });

  it('does NOT show "Mark as Found" button for a case with status === "found"', async () => {
    const foundCase = { ...ACTIVE_CASE, status: 'found' };
    mockDashboardApi([foundCase]);

    renderDashboard();

    // Wait for cases to load
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/cases');
    });

    // "Mark as Found" button must NOT appear for already-found cases
    expect(screen.queryByRole('button', { name: /mark as found/i })).not.toBeInTheDocument();

    // "View Found Photo" link should appear instead
    const viewLink = await screen.findByRole('link', { name: /view found photo/i });
    expect(viewLink).toBeInTheDocument();
  });

  it('hides the inline upload form when "Mark as Found" is clicked again (toggle)', async () => {
    const user = userEvent.setup();
    mockDashboardApi([ACTIVE_CASE]);

    renderDashboard();

    const markAsFoundBtn = await screen.findByRole('button', { name: /mark as found/i });

    // First click — form opens
    await user.click(markAsFoundBtn);
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument();

    // Second click — form closes (toggle behaviour)
    await user.click(markAsFoundBtn);
    expect(document.querySelector('input[type="file"]')).not.toBeInTheDocument();
  });
});

// ── Task 11.3 ─────────────────────────────────────────────────────────────────

/**
 * Validates: Requirements 4.3
 *
 * WHEN a Police_Officer submits the inline upload form with a valid image,
 * THE Dashboard SHALL call POST /api/cases/:id/found-photo with the selected
 * file as multipart/form-data, update the Case row status to 'found' in local
 * state, and hide the upload form.
 */
describe('Dashboard — successful found-photo form submission (Req 4.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLang.mockReturnValue({ t: (key) => key });
    useAuth.mockReturnValue({ user: POLICE_USER });
  });

  it('calls POST /api/cases/:id/found-photo with FormData, updates status to "found", and hides the upload form', async () => {
    const user = userEvent.setup();

    // api.post resolves successfully for the upload
    api.post.mockResolvedValue({ data: { message: 'Photo uploaded successfully' } });
    mockDashboardApi([ACTIVE_CASE]);

    renderDashboard();

    // Step 1: Wait for the "Mark as Found" button to appear (cases loaded)
    const markAsFoundBtn = await screen.findByRole('button', { name: /mark as found/i });
    expect(markAsFoundBtn).toBeInTheDocument();

    // Step 2: Click "Mark as Found" to open the inline upload form
    await user.click(markAsFoundBtn);

    // Verify the upload form is now visible
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: /^submit$/i });
    expect(submitBtn).toBeInTheDocument();

    // Step 3: Select a file using the file input
    const testFile = new File(['fake image content'], 'found-person.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, testFile);

    // Step 4: Click Submit
    await user.click(submitBtn);

    // Step 5: Verify api.post was called with the correct URL and FormData
    // Note: the api client has a baseURL that includes /api, so the path passed
    // to api.post is /cases/:id/found-photo (without the /api prefix).
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        `/cases/${ACTIVE_CASE.id}/found-photo`,
        expect.any(FormData)
      );
    });

    // Verify the FormData contains the image file
    const [, formDataArg] = api.post.mock.calls[0];
    expect(formDataArg.get('image')).toBe(testFile);

    // Step 6: Verify the case status is updated to 'found' in the UI
    // "View Found Photo" link should appear
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /view found photo/i })).toBeInTheDocument();
    });

    // "Mark as Found" button should disappear
    expect(screen.queryByRole('button', { name: /mark as found/i })).not.toBeInTheDocument();

    // Step 7: Verify the upload form is hidden after success
    expect(document.querySelector('input[type="file"]')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^submit$/i })).not.toBeInTheDocument();
  });
});

// ── Task 11.4 ─────────────────────────────────────────────────────────────────

/**
 * Validates: Requirements 4.4
 *
 * WHEN a Police_Officer submits the inline upload form without selecting a file,
 * THE Dashboard SHALL display the validation message
 * "Please select a photo before submitting" and SHALL NOT call the API.
 */
describe('Dashboard — validation error when submitting without a file (Req 4.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLang.mockReturnValue({ t: (key) => key });
    useAuth.mockReturnValue({ user: POLICE_USER });
  });

  it('shows "Please select a photo before submitting" and does NOT call api.post when Submit is clicked without a file', async () => {
    const user = userEvent.setup();
    mockDashboardApi([ACTIVE_CASE]);

    renderDashboard();

    // Step 1: Wait for the "Mark as Found" button to appear (cases loaded)
    const markAsFoundBtn = await screen.findByRole('button', { name: /mark as found/i });
    expect(markAsFoundBtn).toBeInTheDocument();

    // Step 2: Click "Mark as Found" to open the inline upload form
    await user.click(markAsFoundBtn);

    // Verify the upload form is visible with a file input and Submit button
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: /^submit$/i });
    expect(submitBtn).toBeInTheDocument();

    // Step 3: Click Submit WITHOUT selecting a file
    await user.click(submitBtn);

    // Step 4: Verify the validation message is shown
    expect(
      screen.getByText('Please select a photo before submitting')
    ).toBeInTheDocument();

    // Step 5: Verify api.post was NOT called
    expect(api.post).not.toHaveBeenCalled();
  });
});

// ── Task 11.5 ─────────────────────────────────────────────────────────────────

/**
 * Validates: Requirements 4.5
 *
 * IF the API call to POST /api/cases/:id/found-photo returns an error,
 * THEN THE Dashboard SHALL display the error message returned by the API
 * without navigating away.
 *
 * Additional assertions:
 * - The upload form remains visible so the officer can retry.
 * - The case status is NOT updated to 'found' (the "Mark as Found" button
 *   is still present and the case still shows as active).
 */
describe('Dashboard — API error message displayed when upload fails (Req 4.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLang.mockReturnValue({ t: (key) => key });
    useAuth.mockReturnValue({ user: POLICE_USER });
  });

  it('displays the API error message, keeps the upload form open, and does not update case status to "found"', async () => {
    const user = userEvent.setup();

    // api.post rejects with an error response containing a message
    const apiError = {
      response: {
        data: {
          message: 'File too large. Maximum size is 5 MB',
        },
      },
    };
    api.post.mockRejectedValue(apiError);
    mockDashboardApi([ACTIVE_CASE]);

    renderDashboard();

    // Step 1: Wait for the "Mark as Found" button to appear (cases loaded)
    const markAsFoundBtn = await screen.findByRole('button', { name: /mark as found/i });
    expect(markAsFoundBtn).toBeInTheDocument();

    // Step 2: Click "Mark as Found" to open the inline upload form
    await user.click(markAsFoundBtn);

    // Verify the upload form is visible
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: /^submit$/i });
    expect(submitBtn).toBeInTheDocument();

    // Step 3: Select a file
    const testFile = new File(['fake image content'], 'found-person.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, testFile);

    // Step 4: Click Submit
    await user.click(submitBtn);

    // Step 5: Verify the API error message is displayed in the UI
    await waitFor(() => {
      expect(
        screen.getByText('File too large. Maximum size is 5 MB')
      ).toBeInTheDocument();
    });

    // Step 6: Verify the upload form is still visible (not hidden) so the officer can retry
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^submit$/i })).toBeInTheDocument();

    // Step 7: Verify the case status is NOT updated to 'found'
    // The "Mark as Found" button should still be present (case is still active)
    expect(screen.getByRole('button', { name: /mark as found/i })).toBeInTheDocument();
    // The "View Found Photo" link should NOT appear
    expect(screen.queryByRole('link', { name: /view found photo/i })).not.toBeInTheDocument();
  });

  it('displays a fallback error message when the API error has no response body', async () => {
    const user = userEvent.setup();

    // api.post rejects with a network-level error (no response.data.message)
    const networkError = new Error('Network Error');
    api.post.mockRejectedValue(networkError);
    mockDashboardApi([ACTIVE_CASE]);

    renderDashboard();

    // Open the upload form
    const markAsFoundBtn = await screen.findByRole('button', { name: /mark as found/i });
    await user.click(markAsFoundBtn);

    // Select a file and submit
    const fileInput = document.querySelector('input[type="file"]');
    const testFile = new File(['fake image content'], 'found-person.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, testFile);
    await user.click(screen.getByRole('button', { name: /^submit$/i }));

    // Verify the fallback error message is shown
    await waitFor(() => {
      expect(screen.getByText('Failed to upload photo.')).toBeInTheDocument();
    });

    // The upload form must still be visible for retry
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument();
  });
});
