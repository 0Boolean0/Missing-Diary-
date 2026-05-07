/**
 * Unit Tests for PoliceDashboard
 *
 * Feature: police-role-restriction
 * Requirements: 4.1, 4.3, 4.4, 4.5, 4.6, 5.2, 5.3, 5.4, 5.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// ── Mock the api client ──────────────────────────────────────────────────────
// We mock the entire module so api.get / api.patch are vi.fn() instances
// that we can configure per-test.
vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

// ── Mock AuthContext ─────────────────────────────────────────────────────────
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// ── Mock Navbar ──────────────────────────────────────────────────────────────
// Navbar pulls in router hooks, LangContext, AuthContext, and an image asset.
// A lightweight stub keeps tests focused on PoliceDashboard behaviour.
vi.mock('../components/Navbar', () => ({
  default: () => <nav data-testid="navbar-stub" />,
}));

// ── Imports that depend on the mocks above ───────────────────────────────────
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import PoliceDashboard from '../pages/PoliceDashboard';

// ── Fixtures ─────────────────────────────────────────────────────────────────
const POLICE_USER = { id: 42, name: 'Officer Rahim', role: 'police' };

const ACTIVE_CASES = [
  {
    id: 1,
    name: 'Karim Uddin',
    age: 34,
    last_seen_location: 'Dhaka, Mirpur',
    status: 'active',
    images: [],
  },
  {
    id: 2,
    name: 'Fatema Begum',
    age: 27,
    last_seen_location: 'Chittagong, Agrabad',
    status: 'verified',
    images: ['https://example.com/photo.jpg'],
  },
];

// ── Helper ────────────────────────────────────────────────────────────────────
function renderDashboard() {
  return render(
    <MemoryRouter>
      <PoliceDashboard />
    </MemoryRouter>
  );
}

// ── Setup ─────────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  // Default: police user is logged in
  useAuth.mockReturnValue({ user: POLICE_USER });
  // Default: GET /cases returns the two active cases
  api.get.mockResolvedValue({ data: ACTIVE_CASES });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Renders a card grid (not a <table>) for a police user
// Validates: Requirement 4.1
// ─────────────────────────────────────────────────────────────────────────────
describe('PoliceDashboard — card grid layout', () => {
  it('renders case cards and no <table> element', async () => {
    const { container } = renderDashboard();

    // Wait for the async GET /cases to resolve and cards to appear
    await waitFor(() => {
      expect(screen.getByText('Karim Uddin')).toBeInTheDocument();
    });

    // Should NOT contain a table
    expect(container.querySelector('table')).toBeNull();

    // Both case names should be visible
    expect(screen.getByText('Karim Uddin')).toBeInTheDocument();
    expect(screen.getByText('Fatema Begum')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Sightings tab is absent
// Validates: Requirement 4.3
// ─────────────────────────────────────────────────────────────────────────────
describe('PoliceDashboard — no sightings tab', () => {
  it('does not render a sightings navigation tab', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Karim Uddin')).toBeInTheDocument();
    });

    // No element whose text is "Sightings" (case-insensitive)
    expect(screen.queryByRole('button', { name: /sightings/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /sightings/i })).toBeNull();
    expect(screen.queryByText(/sightings/i)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Map tab is absent
// Validates: Requirement 4.4
// ─────────────────────────────────────────────────────────────────────────────
describe('PoliceDashboard — no map tab', () => {
  it('does not render a map navigation tab', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Karim Uddin')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /map/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /map/i })).toBeNull();
    // "Map" as a standalone nav label should not appear
    expect(screen.queryByText(/^\s*map\s*$/i)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. "Total Users" admin stat is absent
// Validates: Requirement 4.5
// ─────────────────────────────────────────────────────────────────────────────
describe('PoliceDashboard — no admin statistics', () => {
  it('does not render a "Total Users" statistic', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Karim Uddin')).toBeInTheDocument();
    });

    expect(screen.queryByText(/total users/i)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. "Report Missing Person" button is absent
// Validates: Requirement 4.6
// ─────────────────────────────────────────────────────────────────────────────
describe('PoliceDashboard — no Report Missing Person button', () => {
  it('does not render a "Report Missing Person" button or link', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Karim Uddin')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /report missing person/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /report missing person/i })).toBeNull();
    expect(screen.queryByText(/report missing person/i)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Found / Not Found buttons are present on each card
// Validates: Requirement 5.1
// ─────────────────────────────────────────────────────────────────────────────
describe('PoliceDashboard — Found / Not Found buttons on each card', () => {
  it('renders ✅ Found and 🔍 Not Found buttons for every case card', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Karim Uddin')).toBeInTheDocument();
    });

    // There should be one "✅ Found" button per case
    const foundButtons = screen.getAllByRole('button', { name: /✅ Found/i });
    expect(foundButtons).toHaveLength(ACTIVE_CASES.length);

    // There should be one "🔍 Not Found" button per case
    const notFoundButtons = screen.getAllByRole('button', { name: /🔍 Not Found/i });
    expect(notFoundButtons).toHaveLength(ACTIVE_CASES.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Clicking "✅ Found" sends PATCH /cases/:id/status { status: 'found' }
//    and updates the badge
// Validates: Requirement 5.2
// ─────────────────────────────────────────────────────────────────────────────
describe('PoliceDashboard — clicking ✅ Found', () => {
  it('sends PATCH /cases/1/status with { status: "found" } and updates the badge', async () => {
    const user = userEvent.setup();

    // Simulate a successful PATCH response
    api.patch.mockResolvedValue({ data: { id: 1, status: 'found' } });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Karim Uddin')).toBeInTheDocument();
    });

    // Click the first "✅ Found" button (belongs to case id=1)
    const foundButtons = screen.getAllByRole('button', { name: /✅ Found/i });
    await user.click(foundButtons[0]);

    // Verify the PATCH call
    expect(api.patch).toHaveBeenCalledWith('/cases/1/status', { status: 'found' });

    // After success the badge for case 1 should show "Found"
    await waitFor(() => {
      // The badge element has class "badge found"
      const badge = document.querySelector('.badge.found');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('Found');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Clicking "🔍 Not Found" sends PATCH /cases/:id/status { status: 'active' }
// Validates: Requirement 5.3
// ─────────────────────────────────────────────────────────────────────────────
describe('PoliceDashboard — clicking 🔍 Not Found', () => {
  it('sends PATCH /cases/1/status with { status: "active" }', async () => {
    const user = userEvent.setup();

    api.patch.mockResolvedValue({ data: { id: 1, status: 'active' } });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Karim Uddin')).toBeInTheDocument();
    });

    const notFoundButtons = screen.getAllByRole('button', { name: /🔍 Not Found/i });
    await user.click(notFoundButtons[0]);

    expect(api.patch).toHaveBeenCalledWith('/cases/1/status', { status: 'active' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. API failure shows error message and badge is unchanged
// Validates: Requirements 5.4, 5.5
// ─────────────────────────────────────────────────────────────────────────────
describe('PoliceDashboard — API failure handling', () => {
  it('shows an error banner and leaves the badge unchanged when PATCH fails', async () => {
    const user = userEvent.setup();

    // Simulate a server error
    api.patch.mockRejectedValue({
      response: { data: { message: 'Server error' } },
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Karim Uddin')).toBeInTheDocument();
    });

    // The first case starts with status 'active' — record the badge text before clicking
    const foundButtons = screen.getAllByRole('button', { name: /✅ Found/i });
    await user.click(foundButtons[0]);

    // Error banner should appear
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Server error');
    });

    // The badge for case 1 should still show 'Active' (unchanged)
    const activeBadges = document.querySelectorAll('.badge.active');
    expect(activeBadges.length).toBeGreaterThan(0);
  });

  it('shows a fallback error message when the API error has no message', async () => {
    const user = userEvent.setup();

    // Error with no response body
    api.patch.mockRejectedValue(new Error('Network Error'));

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Karim Uddin')).toBeInTheDocument();
    });

    const foundButtons = screen.getAllByRole('button', { name: /✅ Found/i });
    await user.click(foundButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to update status');
    });
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// Dashboard role branching tests (Task 11.2)
// Validates: Requirements 4.1, 7.2
// ─────────────────────────────────────────────────────────────────────────────

// ── Additional mocks needed for Dashboard ────────────────────────────────────

// Mock LangContext — Dashboard calls useLang() for translated strings.
// Note: vi.mock calls are hoisted to the top of the file by Vitest, so this
// mock is active for all tests in the file. The existing PoliceDashboard tests
// do not use useLang directly, so this has no effect on them.
vi.mock('../context/LangContext', () => ({
  useLang: vi.fn(),
}));

import { useLang } from '../context/LangContext';
import Dashboard from '../pages/Dashboard';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const ADMIN_USER = { id: 1, name: 'Admin User', role: 'admin' };

// A case with enough fields to trigger the table row rendering in Dashboard
const ADMIN_CASE = {
  id: 99,
  name: 'Test Person',
  age: 30,
  last_seen_location: 'Dhaka',
  status: 'active',
  images: [],
  ai_verification_score: null,
  ai_flags: null,
};

// Minimal translation function — returns the key so assertions can match on it
const tStub = (key) => key;

// ── Helper ────────────────────────────────────────────────────────────────────
function renderDashboardPage() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Dashboard renders PoliceDashboard for police role
// Validates: Requirement 4.1
// ─────────────────────────────────────────────────────────────────────────────
describe('Dashboard — police role branching', () => {
  it('renders PoliceDashboard (not a table) when user.role === "police"', async () => {
    useAuth.mockReturnValue({ user: POLICE_USER });
    useLang.mockReturnValue({ t: tStub });
    // api.get is already set up in beforeEach to return ACTIVE_CASES for PoliceDashboard

    renderDashboardPage();

    // PoliceDashboard renders a card grid — wait for case names to appear
    await waitFor(() => {
      expect(screen.getByText('Karim Uddin')).toBeInTheDocument();
    });

    // No table should be present — police gets the card grid, not the admin table
    expect(document.querySelector('table')).toBeNull();

    // The card grid (not a table) should be present
    expect(screen.getByText('Karim Uddin')).toBeInTheDocument();
    expect(screen.getByText('Fatema Begum')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Dashboard renders table view for admin role (non-regression)
// Validates: Requirement 7.2
// ─────────────────────────────────────────────────────────────────────────────
describe('Dashboard — admin role non-regression', () => {
  it('renders the table view (not PoliceDashboard card grid) when user.role === "admin"', async () => {
    useAuth.mockReturnValue({ user: ADMIN_USER });
    useLang.mockReturnValue({ t: tStub });

    // Admin dashboard fetches /cases, /sightings, and /admin/stats
    api.get.mockImplementation((url) => {
      if (url === '/cases') return Promise.resolve({ data: [ADMIN_CASE] });
      if (url === '/sightings') return Promise.resolve({ data: [] });
      if (url === '/admin/stats') return Promise.resolve({ data: { totalUsers: 5 } });
      return Promise.resolve({ data: [] });
    });

    renderDashboardPage();

    // The admin dashboard renders a <table> for the cases tab once data loads
    await waitFor(() => {
      expect(document.querySelector('table')).toBeInTheDocument();
    });

    // The case name should appear in the table row
    expect(screen.getByText('Test Person')).toBeInTheDocument();

    // PoliceDashboard-specific content (card grid buttons) should NOT be present
    expect(screen.queryByRole('button', { name: /✅ Found/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /🔍 Not Found/i })).toBeNull();
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// CaseDetails police view tests (Task 12.2)
// Validates: Requirement 6.3
// ─────────────────────────────────────────────────────────────────────────────

// ── Additional mocks needed for CaseDetails ──────────────────────────────────

// Mock react-router-dom's useParams so CaseDetails gets a case id without a
// real router match. MemoryRouter is still used for <Link> rendering.
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

// Mock MapView to avoid leaflet DOM issues in jsdom
vi.mock('../components/MapView', () => ({
  default: () => <div data-testid="map-view-stub" />,
}));

// Mock QRCodeSVG to avoid canvas/SVG rendering issues in jsdom
vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => <div data-testid="qrcode-stub" />,
}));

// Mock locationTracker to prevent setInterval / geolocation side-effects
vi.mock('../utils/locationTracker', () => ({
  startTracking: vi.fn(),
  stopTracking: vi.fn(),
}));

import { useParams } from 'react-router-dom';
import CaseDetails from '../pages/CaseDetails';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const ACTIVE_CASE_DETAIL = {
  id: 'abc-123',
  name: 'Rahim Mia',
  age: 40,
  gender: 'Male',
  height: '170cm',
  last_seen_location: 'Dhaka, Gulshan',
  last_seen_lat: 23.79,
  last_seen_lng: 90.41,
  clothing: 'Blue shirt',
  medical_info: 'None',
  description: 'Last seen near the market.',
  status: 'active',
  images: [],
  sightings: [],
  reported_by: 99,
};

// ── Helper ────────────────────────────────────────────────────────────────────
function renderCaseDetails() {
  return render(
    <MemoryRouter>
      <CaseDetails />
    </MemoryRouter>
  );
}

// ── Setup for CaseDetails tests ───────────────────────────────────────────────
// useParams and api.get are configured per-describe block below.

// ─────────────────────────────────────────────────────────────────────────────
// 13. Police user does NOT see the "Add Timeline Entry" form
// Validates: Requirement 6.3
// ─────────────────────────────────────────────────────────────────────────────
describe('CaseDetails — police user: no timeline entry form', () => {
  beforeEach(() => {
    useParams.mockReturnValue({ id: 'abc-123' });
    useAuth.mockReturnValue({ user: POLICE_USER });
    useLang.mockReturnValue({ t: tStub });

    // api.get handles /cases/:id, /cases/:id/timeline, /cases/:id/trail
    api.get.mockImplementation((url) => {
      if (url === '/cases/abc-123') return Promise.resolve({ data: ACTIVE_CASE_DETAIL });
      if (url === '/cases/abc-123/timeline') return Promise.resolve({ data: [] });
      if (url === '/cases/abc-123/trail') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
  });

  it('does not render the "Add Timeline Entry" form for a police user', async () => {
    renderCaseDetails();

    // Wait for the case to load
    await waitFor(() => {
      expect(screen.getByText('Rahim Mia')).toBeInTheDocument();
    });

    // The timeline entry form section should NOT be present
    expect(document.querySelector('.timeline-entry-form')).toBeNull();
    expect(screen.queryByText('Add Timeline Entry')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. Admin user DOES see the "Add Timeline Entry" form (non-regression)
// Validates: Requirement 6.3 (non-regression for admin)
// ─────────────────────────────────────────────────────────────────────────────
describe('CaseDetails — admin user: timeline entry form is rendered', () => {
  beforeEach(() => {
    useParams.mockReturnValue({ id: 'abc-123' });
    useAuth.mockReturnValue({ user: ADMIN_USER });
    useLang.mockReturnValue({ t: tStub });

    api.get.mockImplementation((url) => {
      if (url === '/cases/abc-123') return Promise.resolve({ data: ACTIVE_CASE_DETAIL });
      if (url === '/cases/abc-123/timeline') return Promise.resolve({ data: [] });
      if (url === '/cases/abc-123/trail') return Promise.resolve({ data: [] });
      if (url.startsWith('/sightings/match/')) return Promise.resolve({ data: { matches: [] } });
      return Promise.resolve({ data: [] });
    });
  });

  it('renders the "Add Timeline Entry" form for an admin user', async () => {
    renderCaseDetails();

    // Wait for the case to load
    await waitFor(() => {
      expect(screen.getByText('Rahim Mia')).toBeInTheDocument();
    });

    // The timeline entry form section SHOULD be present
    await waitFor(() => {
      expect(document.querySelector('.timeline-entry-form')).toBeInTheDocument();
      expect(screen.getByText('Add Timeline Entry')).toBeInTheDocument();
    });
  });
});
