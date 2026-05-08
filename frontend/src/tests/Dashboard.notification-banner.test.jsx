/**
 * Unit Tests for Dashboard — Notification Banner (Task 5)
 *
 * Feature: found-person-photo-notify
 * Requirements: 2.3
 *
 * Covers:
 *   5.1 — Notifications are fetched from GET /api/notifications on Dashboard mount
 *   5.2 — Notification banner renders for unread found_person_photo notifications
 *          showing case name and a link to /cases/:id
 *   5.3 — Dismiss button calls PATCH /api/notifications/:id/read and marks
 *          notification as read in local state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// ── Mock the api client ──────────────────────────────────────────────────────
vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

// ── Mock AuthContext ─────────────────────────────────────────────────────────
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// ── Mock LangContext ─────────────────────────────────────────────────────────
vi.mock('../context/LangContext', () => ({
  useLang: vi.fn(),
}));

// ── Mock Navbar ──────────────────────────────────────────────────────────────
vi.mock('../components/Navbar', () => ({
  default: () => <nav data-testid="navbar-stub" />,
}));

// ── Mock MapView ─────────────────────────────────────────────────────────────
vi.mock('../components/MapView', () => ({
  default: () => <div data-testid="map-view-stub" />,
}));

// ── Imports that depend on the mocks above ───────────────────────────────────
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import Dashboard from '../pages/Dashboard';

// ── Fixtures ─────────────────────────────────────────────────────────────────
const GUARDIAN_USER = { id: 'user-1', name: 'Guardian User', role: 'guardian' };

const UNREAD_FOUND_PHOTO_NOTIFICATION = {
  id: 'notif-1',
  user_id: 'user-1',
  case_id: 'case-abc',
  type: 'found_person_photo',
  message: 'A found-person photo has been uploaded for case: John Doe',
  read: false,
  created_at: '2025-01-01T12:00:00.000Z',
  case_name: 'John Doe',
};

const READ_FOUND_PHOTO_NOTIFICATION = {
  ...UNREAD_FOUND_PHOTO_NOTIFICATION,
  id: 'notif-2',
  read: true,
};

const OTHER_TYPE_NOTIFICATION = {
  id: 'notif-3',
  user_id: 'user-1',
  case_id: 'case-xyz',
  type: 'request_info',
  message: 'Someone requested more info about your case.',
  read: false,
  created_at: '2025-01-01T11:00:00.000Z',
};

// ── Helper ────────────────────────────────────────────────────────────────────
function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

// ── Setup ─────────────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();

  useAuth.mockReturnValue({ user: GUARDIAN_USER });
  useLang.mockReturnValue({ t: (key) => key });

  // Default: no cases, no notifications
  api.get.mockImplementation((url) => {
    if (url === '/cases?mine=true') return Promise.resolve({ data: [] });
    if (url === '/notifications') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });

  api.patch.mockResolvedValue({ data: {} });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 5.1 — Notifications are fetched from GET /api/notifications on mount
// ─────────────────────────────────────────────────────────────────────────────
describe('Dashboard — 5.1: fetches notifications on mount', () => {
  it('calls GET /api/notifications when the Dashboard mounts', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/notifications');
    });
  });

  it('fetches notifications even when there are no cases', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/cases?mine=true') return Promise.resolve({ data: [] });
      if (url === '/notifications') return Promise.resolve({ data: [UNREAD_FOUND_PHOTO_NOTIFICATION] });
      return Promise.resolve({ data: [] });
    });

    renderDashboard();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/notifications');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 5.2 — Notification banner renders for unread found_person_photo
//            notifications with case name and link to /cases/:id
// ─────────────────────────────────────────────────────────────────────────────
describe('Dashboard — 5.2: notification banner rendering', () => {
  it('renders a banner for an unread found_person_photo notification', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/cases?mine=true') return Promise.resolve({ data: [] });
      if (url === '/notifications') return Promise.resolve({ data: [UNREAD_FOUND_PHOTO_NOTIFICATION] });
      return Promise.resolve({ data: [] });
    });

    renderDashboard();

    await waitFor(() => {
      // The notification message should appear in the banner
      expect(
        screen.getByText(/A found-person photo has been uploaded for case: John Doe/i)
      ).toBeInTheDocument();
    });
  });

  it('renders a link to /cases/:case_id in the banner', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/cases?mine=true') return Promise.resolve({ data: [] });
      if (url === '/notifications') return Promise.resolve({ data: [UNREAD_FOUND_PHOTO_NOTIFICATION] });
      return Promise.resolve({ data: [] });
    });

    renderDashboard();

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /View Case/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', `/cases/${UNREAD_FOUND_PHOTO_NOTIFICATION.case_id}`);
    });
  });

  it('does NOT render a banner for a read found_person_photo notification', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/cases?mine=true') return Promise.resolve({ data: [] });
      if (url === '/notifications') return Promise.resolve({ data: [READ_FOUND_PHOTO_NOTIFICATION] });
      return Promise.resolve({ data: [] });
    });

    renderDashboard();

    // Give the component time to render
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/notifications');
    });

    // No banner should appear for a read notification
    expect(screen.queryByText(/A found-person photo has been uploaded/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /View Case/i })).not.toBeInTheDocument();
  });

  it('does NOT render a banner for a notification with a different type', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/cases?mine=true') return Promise.resolve({ data: [] });
      if (url === '/notifications') return Promise.resolve({ data: [OTHER_TYPE_NOTIFICATION] });
      return Promise.resolve({ data: [] });
    });

    renderDashboard();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/notifications');
    });

    // The request_info notification message should not appear as a banner
    expect(screen.queryByRole('link', { name: /View Case/i })).not.toBeInTheDocument();
  });

  it('renders multiple banners when there are multiple unread found_person_photo notifications', async () => {
    const secondNotif = {
      id: 'notif-4',
      user_id: 'user-1',
      case_id: 'case-def',
      type: 'found_person_photo',
      message: 'A found-person photo has been uploaded for case: Jane Smith',
      read: false,
      created_at: '2025-01-02T10:00:00.000Z',
    };

    api.get.mockImplementation((url) => {
      if (url === '/cases?mine=true') return Promise.resolve({ data: [] });
      if (url === '/notifications')
        return Promise.resolve({ data: [UNREAD_FOUND_PHOTO_NOTIFICATION, secondNotif] });
      return Promise.resolve({ data: [] });
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      expect(screen.getByText(/Jane Smith/i)).toBeInTheDocument();
    });

    // Two "View Case" links should be present
    const links = screen.getAllByRole('link', { name: /View Case/i });
    expect(links).toHaveLength(2);
  });

  it('renders no banners when notifications array is empty', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/cases?mine=true') return Promise.resolve({ data: [] });
      if (url === '/notifications') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderDashboard();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/notifications');
    });

    expect(screen.queryByRole('link', { name: /View Case/i })).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 5.3 — Dismiss button calls PATCH /api/notifications/:id/read and
//            marks notification as read in local state
// ─────────────────────────────────────────────────────────────────────────────
describe('Dashboard — 5.3: dismiss button behaviour', () => {
  beforeEach(() => {
    api.get.mockImplementation((url) => {
      if (url === '/cases?mine=true') return Promise.resolve({ data: [] });
      if (url === '/notifications') return Promise.resolve({ data: [UNREAD_FOUND_PHOTO_NOTIFICATION] });
      return Promise.resolve({ data: [] });
    });
  });

  it('renders a Dismiss button on the notification banner', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Dismiss/i })).toBeInTheDocument();
    });
  });

  it('calls PATCH /api/notifications/:id/read when Dismiss is clicked', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Dismiss/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Dismiss/i }));

    expect(api.patch).toHaveBeenCalledWith(
      `/notifications/${UNREAD_FOUND_PHOTO_NOTIFICATION.id}/read`
    );
  });

  it('removes the banner from the UI after dismissing (marks as read in local state)', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Dismiss/i })).toBeInTheDocument();
    });

    // Banner is visible before dismiss
    expect(screen.getByText(/A found-person photo has been uploaded for case: John Doe/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Dismiss/i }));

    // After dismiss, the banner should disappear (notification.read = true)
    await waitFor(() => {
      expect(
        screen.queryByText(/A found-person photo has been uploaded for case: John Doe/i)
      ).not.toBeInTheDocument();
    });
  });

  it('silently ignores PATCH failures and keeps the banner visible', async () => {
    const user = userEvent.setup();

    // Simulate a network error on the PATCH call
    api.patch.mockRejectedValue(new Error('Network Error'));

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Dismiss/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Dismiss/i }));

    // The banner should still be visible because the PATCH failed
    await waitFor(() => {
      expect(
        screen.getByText(/A found-person photo has been uploaded for case: John Doe/i)
      ).toBeInTheDocument();
    });
  });
});
