# Missing Diary — Project Error & Issue Report

> Scanned: May 4, 2026  
> Scope: Full codebase — `backend/` and `frontend/`

---

## 🔴 Critical (Must Fix Before Production)

### 1. Real credentials committed to `.env`
**File:** `backend/.env`

The `.env` file contains live database credentials, a Cloudinary API secret, and a JWT secret. This file appears to be tracked by git (no `.gitignore` entry confirmed). Anyone with repo access can read the database password and impersonate any user.

**Fix:**
- Add `backend/.env` to `.gitignore` immediately
- Rotate the database password, JWT secret, and Cloudinary API key
- Use `.env.example` (already present) as the only committed reference

---

### 2. Weak JWT secret
**File:** `backend/.env`, `backend/src/middleware/auth.js`

```
JWT_SECRET=missing_diary_secret_key_12345
```

This is a short, guessable string. Anyone who knows it can forge tokens and authenticate as any user including admins.

**Fix:** Generate a strong secret and replace it:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### 3. `requireRole` crashes when `req.user` is undefined
**File:** `backend/src/middleware/auth.js` (line 35)

```js
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) // ← crashes if req.user is null
```

`requireRole` is always used after `requireAuth`, so `req.user` should be set — but if the middleware chain is ever reordered or `optionalAuth` is mistakenly paired with `requireRole`, this will throw an unhandled `TypeError: Cannot read properties of null`.

**Fix:**
```js
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role))
      return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}
```

---

### 4. `matchSightings` endpoint has no authentication
**File:** `backend/src/routes/sightingRoutes.js` (line 3)

```js
router.get('/match/:caseId', matchSightings); // no auth middleware
```

The AI match endpoint is completely public. Anyone can query sighting descriptions and case details for any case ID without logging in.

**Fix:** Add `requireAuth, requireRole('admin', 'police')` to this route.

---

## 🟠 High (Bugs That Break Functionality)

### 5. Route ordering conflict: `/mine` vs `/:id`
**File:** `backend/src/routes/caseRoutes.js`

```js
router.get('/', optionalAuth, listCases);
router.get('/mine', requireAuth, myCases);   // ← defined after /:id
router.get('/:id', optionalAuth, getCase);
```

`/mine` is defined **after** `/:id`. Express matches routes in order, so `GET /cases/mine` will be caught by `/:id` with `id = "mine"`, which will then fail the UUID lookup and return a 404 instead of the user's cases.

**Fix:** Move the `/mine` route **before** `/:id`:
```js
router.get('/', optionalAuth, listCases);
router.get('/mine', requireAuth, myCases);  // must come before /:id
router.get('/:id', optionalAuth, getCase);
```

---

### 6. `listSightings` uses INNER JOIN — orphaned sightings are silently dropped
**File:** `backend/src/controllers/sightingController.js` (line 30)

```js
const result = await query(`SELECT s.*, mp.name AS person_name FROM sightings s
  JOIN missing_persons mp ON mp.id=s.missing_person_id ...`);
```

If a missing person case is deleted, all associated sightings disappear from the admin list silently. This is a data integrity issue.

**Fix:** Use `LEFT JOIN`:
```sql
SELECT s.*, mp.name AS person_name FROM sightings s
LEFT JOIN missing_persons mp ON mp.id = s.missing_person_id
ORDER BY s.created_at DESC
```

---

### 7. `Home.jsx` sets `stats.active` but initializes `stats` without it
**File:** `frontend/src/pages/Home.jsx` (lines 14, 22)

```js
const [stats, setStats] = useState({ total: 0, found: 0, sightings: 0 }); // no 'active'

setStats({
  total: data.length,
  found: data.filter(c => c.status === 'found').length,
  active: data.filter(...).length,  // set here
});
```

The initial state has `sightings: 0` but no `active` key. Before the API call resolves, `stats.active` is `undefined`, rendering `undefined` in the stats bar. The `sightings` key is initialized but never populated.

**Fix:**
```js
const [stats, setStats] = useState({ total: 0, found: 0, active: 0 });
```

---

### 8. `CaseCard` sighting link points to wrong route
**File:** `frontend/src/components/CaseCard.jsx`

```jsx
<Link className="btn outline" to={`/sighting/${item.id}`}>I Saw him/her</Link>
```

The route in `main.jsx` is defined as `/sighting/:id?` (singular), but the `Sightings` page component at `/sightings` (plural) is a separate full-page form. The `SubmitSighting` component at `/sighting/:id?` does exist and is correct — but the link text "I Saw him/her" uses gendered language that may not suit all cases.

**Note:** The route itself is correct. The UX issue is the hardcoded gendered text.

---

### 9. `Dashboard.jsx` crashes if `user` is null
**File:** `frontend/src/pages/Dashboard.jsx` (line 17)

```js
const endpoint = ['admin', 'police'].includes(user.role) ? '/cases' : '/cases/mine';
```

`Dashboard` is wrapped in `<Protected>` which redirects unauthenticated users, so `user` should always be set. However, if `AuthContext` hasn't rehydrated from `localStorage` yet (e.g., on a slow first render), `user` could briefly be `null`, causing a crash.

**Fix:** Add a null guard:
```js
if (!user) return null;
```
at the top of the component, before the `useEffect`.

---

### 10. `CaseDetails.jsx` — no error handling on case load
**File:** `frontend/src/pages/CaseDetails.jsx` (line 17)

```js
useEffect(() => {
  api.get(`/cases/${id}`).then(r => setItem(r.data));
  // no .catch()
}, [id]);
```

If the API returns 403 (access denied) or 404, the promise rejects silently. The page stays on "Loading..." forever with no feedback to the user.

**Fix:**
```js
useEffect(() => {
  api.get(`/cases/${id}`)
    .then(r => setItem(r.data))
    .catch(err => setError(err.response?.data?.message || 'Failed to load case'));
}, [id]);
```

---

### 11. `SubmitSighting.jsx` — cases list fetch has no error handling
**File:** `frontend/src/pages/SubmitSighting.jsx` (line 28)

```js
useEffect(() => {
  api.get('/cases').then(r => setCases(r.data));
  // no .catch()
}, []);
```

If the request fails, the select dropdown stays empty and the user cannot submit a sighting. No error is shown.

**Fix:** Add `.catch(() => {})` at minimum, or show an error message.

---

## 🟡 Medium (Code Quality & Security Hardening)

### 12. No rate limiting on auth endpoints
**File:** `backend/src/routes/authRoutes.js`

The global rate limiter (300 req / 15 min) is too permissive for login/register. Brute-force attacks on passwords are feasible. `express-rate-limit` is already installed.

**Fix:** Add a stricter limiter to auth routes:
```js
import rateLimit from 'express-rate-limit';
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
router.post('/login', authLimiter, login);
router.post('/register', authLimiter, register);
```

---

### 13. Hardcoded localhost ports in production CORS config
**File:** `backend/src/server.js` (lines 16–18)

```js
.concat(['http://localhost:5174','http://localhost:5175','http://localhost:5176','http://localhost:5177']);
```

These development ports are hardcoded into the production server. In production, only the real frontend domain should be allowed.

**Fix:** Move dev origins to a `CORS_DEV_ORIGINS` env variable and only include them when `NODE_ENV !== 'production'`.

---

### 14. File upload size mismatch
**File:** `backend/src/utils/upload.js` vs `frontend/src/pages/ReportCase.jsx`

- Backend multer limit: **5 MB**
- Frontend UI label: **"Max 10MB"**

Users who upload a 6–10 MB file will get a confusing server error instead of a clear client-side message.

**Fix:** Either raise the backend limit to 10 MB, or change the frontend label to "Max 5MB" and add client-side validation:
```js
if (f.size > 5 * 1024 * 1024) { alert('File must be under 5MB'); return; }
```

---

### 15. `upload.js` does not accept `image/gif` or `video/*` but frontend allows video uploads
**File:** `backend/src/utils/upload.js`, `frontend/src/pages/ReportCase.jsx`

The frontend `ReportCase` form has a video upload field (`accept="video/*"`), but the backend `fileFilter` only allows `image/jpeg`, `image/png`, `image/webp`. Video uploads will be silently rejected by multer.

**Fix:** Either remove the video upload UI, or add a separate multer instance for video with appropriate MIME types and a higher size limit.

---

### 16. `errorHandler` middleware does not call `next`
**File:** `backend/src/middleware/error.js`

```js
export function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
  // next is never called — fine for a terminal handler, but Zod errors
  // expose full validation details to the client
}
```

Zod validation errors (thrown by `.parse()`) are passed to `next(e)` throughout the controllers. The error handler sends `err.message` directly, which for Zod errors is a verbose JSON string exposing your full schema. This leaks internal validation logic.

**Fix:** Detect Zod errors and return a clean 400:
```js
import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ message: 'Validation error', errors: err.errors });
  }
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
}
```

---

### 17. `Dashboard.jsx` — silent error swallowing
**File:** `frontend/src/pages/Dashboard.jsx` (lines 18–20)

```js
api.get(endpoint).then(r => setCases(r.data)).catch(() => {});
api.get('/sightings').then(r => setSightings(r.data)).catch(() => {});
api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
```

All three API calls silently swallow errors. If any fail, the dashboard shows empty data with no indication of a problem.

**Fix:** At minimum log errors; ideally show a toast or inline error message.

---

### 18. `Dashboard.jsx` — optimistic UI update without rollback
**File:** `frontend/src/pages/Dashboard.jsx` (lines 24–27, 30–33)

```js
async function updateCase(id, status) {
  await api.patch(`/cases/${id}/status`, { status });
  setCases(cases.map(c => c.id === id ? { ...c, status } : c)); // only runs if no throw
}
```

Actually this is fine — the `setCases` call is after the `await`, so it only runs on success. However, there is no `try/catch`, so a failed PATCH will throw an unhandled promise rejection with no user feedback.

**Fix:** Wrap in try/catch and show an error message on failure.

---

### 19. `AuthContext` — `useMemo` dependency array missing `login`, `register`, `logout`
**File:** `frontend/src/context/AuthContext.jsx` (line 28)

```js
const value = useMemo(() => ({ user, login, register, logout }), [user]);
```

`login`, `register`, and `logout` are defined inside the component without `useCallback`, so they are recreated on every render. The `useMemo` only re-runs when `user` changes, but the stale function references are captured. In practice this is harmless because the functions close over `setUser` (stable), but it's technically incorrect and will cause lint warnings.

**Fix:** Either add the functions to the dependency array, or wrap each with `useCallback`.

---

### 20. `package.json` files use `"latest"` for all dependencies
**Files:** `backend/package.json`, `frontend/package.json`

```json
"dependencies": {
  "express": "latest",
  "bcryptjs": "latest",
  ...
}
```

Using `"latest"` means `npm install` will pull whatever is newest at install time. A breaking change in any dependency will silently break the app on the next install.

**Fix:** Pin all dependencies to exact versions after running `npm install`:
```bash
npm install --save-exact
```
Or at minimum use caret ranges (`^`) with a lockfile committed to git.

---

### 21. Test credentials hardcoded in Login page
**File:** `frontend/src/pages/Login.jsx` (line 82)

```jsx
<div className="auth-hint">
  <p>Test accounts: <code>admin@missingdiary.test</code> / <code>password123</code></p>
</div>
```

This hint is visible to all users in production. If these accounts exist in the production database, they are a direct security hole.

**Fix:** Remove this block before deploying to production, or gate it behind `import.meta.env.DEV`.

---

## 🟢 Low / Improvements

### 22. No pagination on case/sighting list endpoints
**Files:** `backend/src/controllers/caseController.js`, `sightingController.js`

All cases and sightings are returned in a single query with no `LIMIT`/`OFFSET`. With hundreds of cases this will slow down significantly.

**Fix:** Add `limit` and `offset` query params with sensible defaults (e.g., 50 per page).

---

### 23. `createCase` does not return images in the response
**File:** `backend/src/controllers/caseController.js` (line 80)

```js
res.status(201).json(created); // images are inserted separately but not included
```

After creating a case, the response is the raw `missing_persons` row without the uploaded image URLs. The frontend redirects to `/cases/:id` immediately, which then fetches the full case — so it works, but the initial response is incomplete.

---

### 24. `MissingCases.jsx` — URL search param `?q=` is not consumed
**File:** `frontend/src/pages/MissingCases.jsx`

`Home.jsx` navigates to `/cases?q=<search>` on search, but `MissingCases.jsx` never reads `useSearchParams()`. The search query from the home page is silently ignored.

**Fix:**
```js
import { useSearchParams } from 'react-router-dom';
const [searchParams] = useSearchParams();
const [search, setSearch] = useState(searchParams.get('q') || '');
```

---

### 25. `MapView.jsx` — marker keys use array index
**File:** `frontend/src/components/MapView.jsx` (line 22)

```jsx
{markers.map((m, i) => <Marker key={i} ...>)}
```

Using array index as `key` causes React reconciliation issues when markers are reordered or removed.

**Fix:** Use a stable unique identifier, e.g., `key={m.title + m.lat + m.lng}` or a proper ID if available.

---

### 26. No `.gitignore` for `node_modules` confirmed
**Files:** `backend/`, `frontend/`

No `.gitignore` file was found at the root or in subdirectories. Both `node_modules` folders should be excluded.

**Fix:** Create a root `.gitignore`:
```
node_modules/
backend/.env
frontend/.env
*.log
dist/
```

---

### 27. `schema.sql` should be reviewed for missing indexes
**File:** `backend/schema.sql`

High-frequency queries filter on `missing_persons.status`, `missing_persons.guardian_id`, and `sightings.missing_person_id`. Without indexes these become full table scans.

**Recommended indexes:**
```sql
CREATE INDEX IF NOT EXISTS idx_mp_status ON missing_persons(status);
CREATE INDEX IF NOT EXISTS idx_mp_guardian ON missing_persons(guardian_id);
CREATE INDEX IF NOT EXISTS idx_sightings_person ON sightings(missing_person_id);
```

---

## Summary Table

| # | Severity | File | Issue |
|---|----------|------|-------|
| 1 | 🔴 Critical | `backend/.env` | Live credentials committed to repo |
| 2 | 🔴 Critical | `.env` / `auth.js` | Weak JWT secret |
| 3 | 🔴 Critical | `middleware/auth.js` | `requireRole` crashes if `req.user` is null |
| 4 | 🔴 Critical | `sightingRoutes.js` | `matchSightings` endpoint is unauthenticated |
| 5 | 🟠 High | `caseRoutes.js` | `/mine` route shadowed by `/:id` — always 404s |
| 6 | 🟠 High | `sightingController.js` | INNER JOIN drops orphaned sightings |
| 7 | 🟠 High | `Home.jsx` | `stats.active` undefined on initial render |
| 8 | 🟠 High | `CaseDetails.jsx` | No error handling on case load — infinite loading |
| 9 | 🟠 High | `Dashboard.jsx` | Potential null crash on `user.role` before rehydration |
| 10 | 🟠 High | `SubmitSighting.jsx` | Cases fetch has no error handling |
| 11 | 🟡 Medium | `authRoutes.js` | No rate limiting on login/register |
| 12 | 🟡 Medium | `server.js` | Hardcoded localhost ports in CORS config |
| 13 | 🟡 Medium | `upload.js` / `ReportCase.jsx` | File size limit mismatch (5MB vs 10MB label) |
| 14 | 🟡 Medium | `upload.js` / `ReportCase.jsx` | Video upload UI but backend rejects video MIME types |
| 15 | 🟡 Medium | `middleware/error.js` | Zod errors expose full schema to client |
| 16 | 🟡 Medium | `Dashboard.jsx` | All API errors silently swallowed |
| 17 | 🟡 Medium | `Dashboard.jsx` | No try/catch on update/delete actions |
| 18 | 🟡 Medium | `AuthContext.jsx` | `useMemo` missing function dependencies |
| 19 | 🟡 Medium | `package.json` (both) | All deps pinned to `"latest"` — unstable builds |
| 20 | 🟡 Medium | `Login.jsx` | Test credentials visible in production UI |
| 21 | 🟢 Low | `caseController.js` | No pagination on list endpoints |
| 22 | 🟢 Low | `caseController.js` | `createCase` response missing image URLs |
| 23 | 🟢 Low | `MissingCases.jsx` | `?q=` search param from Home not consumed |
| 24 | 🟢 Low | `MapView.jsx` | Array index used as React key |
| 25 | 🟢 Low | root | No `.gitignore` confirmed |
| 26 | 🟢 Low | `schema.sql` | Missing database indexes on hot query columns |
