/**
 * Frontend Property-Based Tests — found-person-photo-notify
 *
 * Feature: found-person-photo-notify
 *
 * Properties covered:
 *   Property 7:  Dashboard banner appears for all unread found_person_photo notifications
 *   Property 8:  Found-photo section is absent for all non-found case statuses
 *   Property 9:  All returned found-photos are displayed with their timestamps
 *   Property 12: "Mark as Found" button and "View Found Photo" link are mutually exclusive
 *
 * Testing framework: Vitest + fast-check
 * Minimum iterations per property: 100
 */

import { describe, it, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as fc from 'fast-check';

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
import Dashboard from '../pages/Dashboard';
import CaseDetails from '../pages/CaseDetails';

// ── Shared setup ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useLang.mockReturnValue({ t: (key) => key });
});

// ── Arbitraries ───────────────────────────────────────────────────────────────

/** Notification type: either the target type or a different one */
const notifTypeArb = fc.oneof(
  fc.constant('found_person_photo'),
  fc.constant('request_info'),
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => s !== 'found_person_photo'),
);

/** A single notification object with random read/type values */
const notificationArb = fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  case_id: fc.uuid(),
  type: notifTypeArb,
  message: fc.string({ minLength: 1, maxLength: 100 }),
  read: fc.boolean(),
  created_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') })
    .filter(d => !isNaN(d.getTime()))
    .map(d => d.toISOString()),
});

/** Non-found case statuses */
const nonFoundStatusArb = fc.constantFrom(
  'pending',
  'verified',
  'active',
  'closed',
  'rejected',
);

/** A minimal case object for CaseDetails — id must be a simple alphanumeric string
 *  so it works as a URL segment and doesn't confuse the mock URL matching. */
const caseIdArb = fc.stringMatching(/^[a-z][a-z0-9]{4,11}$/);

const baseCaseArb = fc.record({
  id: caseIdArb,
  name: fc.string({ minLength: 1, maxLength: 60 }).filter(s => s.trim().length > 0),
  age: fc.integer({ min: 1, max: 120 }),
  gender: fc.constantFrom('male', 'female', 'other'),
  last_seen_location: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  last_seen_lat: fc.float({ min: -90, max: 90, noNaN: true }),
  last_seen_lng: fc.float({ min: -180, max: 180, noNaN: true }),
  images: fc.constant([]),
  sightings: fc.constant([]),
  description: fc.constant(''),
});

/** A found-photo object */
const foundPhotoArb = fc.record({
  id: fc.uuid(),
  image_url: fc.webUrl(),
  public_id: fc.string({ minLength: 1, maxLength: 60 }),
  created_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') })
    .filter(d => !isNaN(d.getTime()))
    .map(d => d.toISOString()),
});

/** A minimal case object for Dashboard */
const dashboardCaseArb = fc.record({
  id: caseIdArb,
  name: fc.string({ minLength: 1, maxLength: 60 }).filter(s => s.trim().length > 0),
  age: fc.integer({ min: 1, max: 120 }),
  gender: fc.constantFrom('male', 'female', 'other'),
  last_seen_location: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  last_seen_lat: fc.float({ min: -90, max: 90, noNaN: true }),
  last_seen_lng: fc.float({ min: -180, max: 180, noNaN: true }),
  images: fc.constant([]),
  status: fc.constantFrom('pending', 'verified', 'active', 'found', 'closed', 'rejected'),
  description: fc.constant(''),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Set up api.get mock for Dashboard:
 *   - /cases?mine=true  → cases
 *   - /notifications    → notifications
 *   - everything else   → []
 */
function mockDashboardApi({ cases = [], notifications = [] } = {}) {
  api.get.mockImplementation((url) => {
    if (url === '/cases?mine=true' || url === '/cases') return Promise.resolve({ data: cases });
    if (url === '/notifications') return Promise.resolve({ data: notifications });
    return Promise.resolve({ data: [] });
  });
  api.patch.mockResolvedValue({ data: {} });
  api.post.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({ data: {} });
}

/**
 * Set up api.get mock for CaseDetails:
 *   - /cases/:id           → caseData
 *   - /cases/:id/timeline  → []
 *   - /cases/:id/found-photos → foundPhotos
 *   - everything else      → []
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

// ─────────────────────────────────────────────────────────────────────────────
// Property 7: Dashboard banner appears for all unread found_person_photo
//             notifications
// Validates: Requirements 2.3
// ─────────────────────────────────────────────────────────────────────────────

describe(
  'Feature: found-person-photo-notify, Property 7: Dashboard banner appears for all unread found_person_photo notifications',
  () => {
    it(
      'renders a banner for every !read && type===found_person_photo notification, and no banner for others',
      async () => {
        useAuth.mockReturnValue({
          user: { id: 'user-1', name: 'Test User', role: 'police' },
        });

        await fc.assert(
          fc.asyncProperty(
            fc.array(notificationArb, { minLength: 0, maxLength: 8 }),
            async (notifications) => {
              mockDashboardApi({ cases: [], notifications });

              const { container, unmount } = render(
                <MemoryRouter>
                  <Dashboard />
                </MemoryRouter>
              );

              // Wait for the component to finish fetching
              await waitFor(() => {
                expect(api.get).toHaveBeenCalledWith('/notifications');
              });

              // Give React one more tick to flush state updates
              await new Promise(r => setTimeout(r, 0));

              const expectedBanners = notifications.filter(
                n => !n.read && n.type === 'found_person_photo',
              );

              // Each expected banner must have a "View Case →" link pointing to /cases/:id
              for (const n of expectedBanners) {
                const link = container.querySelector(`a[href="/cases/${n.case_id}"]`);
                if (!link) {
                  unmount();
                  throw new Error(
                    `Expected a "View Case →" link for notification ${n.id} (case_id=${n.case_id}) but found none.\n` +
                    `Notification: ${JSON.stringify(n)}`,
                  );
                }
              }

              // Notifications that should NOT produce a banner
              const unexpectedBanners = notifications.filter(
                n => n.read || n.type !== 'found_person_photo',
              );

              // For each notification that should NOT have a banner, verify its
              // case_id link is absent (unless another notification for the same
              // case_id legitimately produced a banner).
              const expectedCaseIds = new Set(expectedBanners.map(n => n.case_id));

              for (const n of unexpectedBanners) {
                // Only check if no other notification for this case_id should show a banner
                if (!expectedCaseIds.has(n.case_id)) {
                  const link = container.querySelector(`a[href="/cases/${n.case_id}"]`);
                  if (link) {
                    unmount();
                    throw new Error(
                      `Unexpected "View Case →" link found for notification ${n.id} ` +
                      `(read=${n.read}, type=${n.type}, case_id=${n.case_id}).\n` +
                      `Notification: ${JSON.stringify(n)}`,
                    );
                  }
                }
              }

              unmount();
            },
          ),
          { numRuns: 100 },
        );
      },
      30000, // 30s timeout for 100 async iterations
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Property 8: Found-photo section is absent for all non-found case statuses
// Validates: Requirements 3.3
// ─────────────────────────────────────────────────────────────────────────────

describe(
  'Feature: found-person-photo-notify, Property 8: found-photo section is absent for all non-found case statuses',
  () => {
    it(
      'does not render the "Found Person Photo" section for any non-found status',
      async () => {
        useAuth.mockReturnValue({ user: null });

        await fc.assert(
          fc.asyncProperty(
            fc.tuple(baseCaseArb, nonFoundStatusArb),
            async ([baseCase, status]) => {
              const caseData = { ...baseCase, status };

              mockCaseDetailsApi({ caseData, foundPhotos: [] });

              const { container, unmount } = renderCaseDetails(caseData.id);

              // Wait for the case to load
              await waitFor(() => {
                expect(api.get).toHaveBeenCalledWith(`/cases/${caseData.id}`);
              });

              // Give React time to render the loaded state
              await new Promise(r => setTimeout(r, 0));

              // The "Found Person Photo" heading must NOT be present
              const bodyText = container.textContent || '';
              if (bodyText.includes('Found Person Photo')) {
                unmount();
                throw new Error(
                  `"Found Person Photo" section was rendered for case with status="${status}", ` +
                  `but it should only appear for status="found".\n` +
                  `Case: ${JSON.stringify(caseData)}`,
                );
              }

              unmount();
            },
          ),
          { numRuns: 100 },
        );
      },
      30000, // 30s timeout for 100 async iterations
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Property 9: All returned found-photos are displayed with their timestamps
// Validates: Requirements 3.4, 3.5
// ─────────────────────────────────────────────────────────────────────────────

describe(
  'Feature: found-person-photo-notify, Property 9: all returned found-photos are displayed with their timestamps',
  () => {
    it(
      'renders an img element and a visible timestamp for every photo in the found-photos array',
      async () => {
        useAuth.mockReturnValue({ user: null });

        await fc.assert(
          fc.asyncProperty(
            fc.tuple(
              baseCaseArb,
              fc.array(foundPhotoArb, { minLength: 1, maxLength: 5 }),
            ),
            async ([baseCase, foundPhotos]) => {
              const caseData = { ...baseCase, status: 'found' };

              mockCaseDetailsApi({ caseData, foundPhotos });

              const { container, unmount } = renderCaseDetails(caseData.id);

              // Wait for the case to load
              await waitFor(() => {
                expect(api.get).toHaveBeenCalledWith(`/cases/${caseData.id}`);
              });

              // Wait for found-photos to be fetched and rendered
              await waitFor(() => {
                expect(api.get).toHaveBeenCalledWith(`/cases/${caseData.id}/found-photos`);
              });

              // Give React time to render the photos
              await new Promise(r => setTimeout(r, 0));

              const bodyText = container.textContent || '';

              // Collect all img elements once for efficient lookup
              const allImgs = Array.from(container.querySelectorAll('img'));

              for (const photo of foundPhotos) {
                // Each photo must have an img element with the correct src.
                // Use getAttribute('src') rather than a CSS attribute selector so that
                // URLs containing special characters (e.g. '&') are matched correctly
                // without triggering CSS selector parse errors.
                const imgEl = allImgs.find(
                  img => img.getAttribute('src') === photo.image_url,
                );
                if (!imgEl) {
                  unmount();
                  throw new Error(
                    `Expected an <img> with src="${photo.image_url}" but found none.\n` +
                    `Photo: ${JSON.stringify(photo)}`,
                  );
                }

                // Each photo must have a visible timestamp derived from created_at.
                // The component renders: new Date(photo.created_at).toLocaleString(...)
                // We check that at least the year portion of the date is visible.
                const year = new Date(photo.created_at).getFullYear().toString();
                if (!bodyText.includes(year)) {
                  unmount();
                  throw new Error(
                    `Expected timestamp year "${year}" for photo ${photo.id} to be visible in the document, ` +
                    `but it was not found.\nPhoto: ${JSON.stringify(photo)}`,
                  );
                }
              }

              unmount();
            },
          ),
          { numRuns: 100 },
        );
      },
      30000, // 30s timeout for 100 async iterations
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Property 12: "Mark as Found" button and "View Found Photo" link are
//              mutually exclusive based on case status
// Validates: Requirements 4.1, 4.6
// ─────────────────────────────────────────────────────────────────────────────

describe(
  'Feature: found-person-photo-notify, Property 12: "Mark as Found" button and "View Found Photo" link are mutually exclusive based on case status',
  () => {
    it(
      'shows "Mark as Found" for non-found cases and "View Found Photo" for found cases, never both',
      async () => {
        // Use a police user so the action buttons are rendered
        useAuth.mockReturnValue({
          user: { id: 'user-1', name: 'Test User', role: 'police' },
        });

        await fc.assert(
          fc.asyncProperty(
            fc.array(dashboardCaseArb, { minLength: 1, maxLength: 6 }),
            async (cases) => {
              mockDashboardApi({ cases, notifications: [] });

              const { container, unmount } = render(
                <MemoryRouter>
                  <Dashboard />
                </MemoryRouter>
              );

              // Wait for cases to load
              await waitFor(() => {
                expect(api.get).toHaveBeenCalled();
              });

              // Give React time to render
              await new Promise(r => setTimeout(r, 0));

              // Collect all buttons and links in the rendered output
              const buttons = Array.from(container.querySelectorAll('button'));
              const links = Array.from(container.querySelectorAll('a'));

              const markAsFoundButtons = buttons.filter(b =>
                /mark as found/i.test(b.textContent || ''),
              );
              const viewFoundPhotoLinks = links.filter(a =>
                /view found photo/i.test(a.textContent || ''),
              );

              const nonFoundCases = cases.filter(c => c.status !== 'found');
              const foundCases = cases.filter(c => c.status === 'found');

              // For non-found cases: "Mark as Found" button count must equal the
              // number of non-found cases, and "View Found Photo" links must not
              // appear for those cases.
              if (markAsFoundButtons.length !== nonFoundCases.length) {
                unmount();
                throw new Error(
                  `Expected ${nonFoundCases.length} "Mark as Found" button(s) for non-found cases, ` +
                  `but found ${markAsFoundButtons.length}.\n` +
                  `Cases: ${JSON.stringify(cases.map(c => ({ id: c.id, status: c.status })))}`,
                );
              }

              // For found cases: "View Found Photo" link count must equal the
              // number of found cases, and "Mark as Found" buttons must not
              // appear for those cases.
              if (viewFoundPhotoLinks.length !== foundCases.length) {
                unmount();
                throw new Error(
                  `Expected ${foundCases.length} "View Found Photo" link(s) for found cases, ` +
                  `but found ${viewFoundPhotoLinks.length}.\n` +
                  `Cases: ${JSON.stringify(cases.map(c => ({ id: c.id, status: c.status })))}`,
                );
              }

              // Mutual exclusion: total interactive controls = total cases
              // (each case has exactly one of the two)
              const totalControls = markAsFoundButtons.length + viewFoundPhotoLinks.length;
              if (totalControls !== cases.length) {
                unmount();
                throw new Error(
                  `Expected exactly ${cases.length} total action controls (Mark as Found + View Found Photo), ` +
                  `but found ${totalControls}.\n` +
                  `Cases: ${JSON.stringify(cases.map(c => ({ id: c.id, status: c.status })))}`,
                );
              }

              unmount();
            },
          ),
          { numRuns: 100 },
        );
      },
      30000, // 30s timeout for 100 async iterations
    );
  },
);
