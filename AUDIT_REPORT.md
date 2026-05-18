# 🔍 ServiGo — Comprehensive Codebase Audit Report

**Audit Date:** 2026-05-18  
**Scope:** Full-stack (backend + frontend + configuration)  
**Stack:** Node.js/Express 5.2.1, MongoDB/Mongoose 9.6.1, Socket.io 4.8.3, React 19.2.5, Vite 8.0.10

---

## 📊 Summary

| Severity      | Count |
|---------------|-------|
| 🔴 Critical   | 12    |
| 🟠 High       | 14    |
| 🟡 Medium     | 16    |
| 🟢 Low        | 12    |
| **Total**     | **54** |

---

## 🔴 CRITICAL SEVERITY (Immediate Risk)

### 1. No Authentication on Booking Routes
- **File:** [`backend/routes/api.js`](backend/routes/api.js)
- **Lines:** POST `/bookings` (~line 92), PATCH `/bookings/:id/status` (~line 108)
- **Issue:** Anyone can create bookings and change any booking status without authentication. This means a malicious actor can create fake bookings, change statuses arbitrarily, or disrupt the entire booking system.
- **Cause:** No `auth` middleware applied to these routes.
- **Effect:** Data integrity completely compromised. Attackers can manipulate any booking in the system.

### 2. No Authentication on Messaging Routes
- **File:** [`backend/routes/api.js`](backend/routes/api.js)
- **Lines:** GET/POST `/messages` (~lines 119–154)
- **Issue:** Anyone can read all messages and send messages impersonating any user without authentication.
- **Cause:** Missing `auth` middleware.
- **Effect:** Complete compromise of private communications between customers and workers.

### 3. No Authentication on Notification Routes
- **File:** [`backend/routes/api.js`](backend/routes/api.js)
- **Lines:** GET `/notifications/:userId`, PATCH `/notifications/:id/read`
- **Issue:** Anyone can read any user's notifications and mark them as read without authentication.
- **Cause:** No `auth` middleware applied.
- **Effect:** Privacy breach. Notifications contain sensitive booking and messaging metadata.

### 4. Mock User Endpoint Exposes Real JWT Tokens
- **File:** [`backend/routes/api.js`](backend/routes/api.js)
- **Lines:** GET `/mock-user/:role` (~line 293)
- **Issue:** Returns real, signed JWT tokens for demo accounts without any authentication or rate limiting. Anyone can obtain valid tokens for any role (customer/worker/admin).
- **Cause:** Demo/testing endpoint left in production code.
- **Effect:** Complete authentication bypass. Attackers can impersonate any user role.

### 5. Quick-Login Buttons in Production UI
- **File:** [`frontend/src/App.jsx`](frontend/src/App.jsx)
- **Lines:** 22–36
- **Issue:** The login page has prominent "Quick Login" buttons that call the `/api/mock-user/:role` endpoint, completely bypassing real credential authentication.
- **Cause:** Demo UX pattern left in production code.
- **Effect:** Anyone can log in as customer, worker, or admin with one click.

### 6. JWT Token Stored in localStorage — XSS Vulnerability
- **File:** [`frontend/src/App.jsx`](frontend/src/App.jsx)
- **Lines:** Login handlers at ~lines 34, 57, and localStorage reads throughout
- **Issue:** The entire user object including the JWT token is stored in `localStorage`, making it accessible to any JavaScript running on the page (including injected scripts via XSS).
- **Cause:** Using localStorage for sensitive tokens instead of httpOnly cookies.
- **Effect:** Any XSS vulnerability (stored or reflected) can steal JWT tokens from all users.

### 7. CORS Configured as Wildcard
- **File:** [`backend/server.js`](backend/server.js)
- **Lines:** 5 (`app.use(cors())`) and 14–17 (Socket.io `cors: { origin: "*" }`)
- **Issue:** Express `cors()` with no options accepts requests from any origin. Socket.io also allows any origin.
- **Cause:** Development convenience not restricted for production.
- **Effect:** Any website can make authenticated requests to the API using the user's credentials (CSRF-like attacks).

### 8. Missing Security Headers
- **File:** [`backend/server.js`](backend/server.js)
- **Issue:** No `helmet` middleware. The server doesn't set `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, or other critical security headers.
- **Cause:** Helmet package not installed or configured.
- **Effect:** Increased vulnerability to clickjacking, MIME sniffing, XSS, and MITM attacks.

### 9. No Rate Limiting
- **File:** [`backend/server.js`](backend/server.js)
- **Issue:** No rate limiting on any endpoint (login, register, API routes). No `express-rate-limit` or similar.
- **Cause:** Not implemented.
- **Effect:** Brute-force attacks on login, registration spam, and DDoS via repeated API calls are trivial.

### 10. No Input Validation
- **Files:** [`backend/routes/api.js`](backend/routes/api.js) (all routes)
- **Issue:** No validation library (Joi, express-validator, Zod) used on any route. All user input is accepted blindly — names, emails, passwords, booking data, message content.
- **Cause:** Validation never implemented.
- **Effect:** NoSQL injection possible through unsanitized inputs. Cross-site scripting via stored message content. Malformed data in database.

### 11. mongodb-memory-server as Production Fallback
- **File:** [`backend/server.js`](backend/server.js)
- **Lines:** 61–85 (`startServer` function)
- **Issue:** When MongoDB connection fails, the server falls back to an in-memory MongoDB instance. All data is ephemeral and lost on restart.
- **Cause:** Development convenience pattern.
- **Effect:** Silent data loss in production when MongoDB is temporarily unavailable. Users' bookings, messages, and accounts can vanish.

### 12. Socket Room Name Mismatch — Chat & Tracking Broken
- **Files:** [`frontend/src/components/ChatBox.jsx`](frontend/src/components/ChatBox.jsx):48, [`frontend/src/components/LiveTrackingMap.jsx`](frontend/src/components/dashboard/LiveTrackingMap.jsx):48, [`backend/server.js`](backend/server.js):34
- **Issue:** The frontend emits `join_booking` to join a booking room, but the server only listens for `join_user` (not `join_booking`). The `join_user` event expects a `userId`, not a `bookingId`.
- **Cause:** Inconsistent event naming between client and server.
- **Effect:** Real-time chat messages and live location tracking **do not work at all**. Messages are only delivered via REST API polling, not via sockets. Location updates broadcast but nobody receives them because rooms are never joined.

---

## 🟠 HIGH SEVERITY

### 13. JWT Auth Middleware Returns 500 Instead of 401
- **File:** [`backend/middleware/auth.js`](backend/middleware/auth.js)
- **Line:** 19 (`res.status(500).json({ error: err.message })`)
- **Issue:** When JWT verification fails (expired token, invalid signature), the middleware returns HTTP 500 (Internal Server Error) instead of 401 (Unauthorized). It also exposes the internal error message to the client.
- **Cause:** Catch block uses wrong status code and leaks error details.
- **Effect:** Clients can't distinguish between auth failures and server crashes. Error messages may leak implementation details.

### 14. Dead-Code JWT Check
- **File:** [`backend/middleware/auth.js`](backend/middleware/auth.js)
- **Line:** 17 (`if (!verified)`)
- **Issue:** `jwt.verify()` throws an exception on failure and never returns a falsy value. The `if (!verified)` check is unreachable dead code.
- **Cause:** Misunderstanding of `jwt.verify()` API (it doesn't return null on failure).
- **Effect:** Misleading code that suggests auth might silently pass if verification returns null.

### 15. Password Field Not Required
- **File:** [`backend/models/User.js`](backend/models/User.js)
- **Lines:** 4–20
- **Issue:** The `password` field is `type: String` without `required: true`. Passwordless accounts can be created.
- **Cause:** Missing schema constraint.
- **Effect:** Users can be created without passwords, leading to authentication failures and potential unauthorized access.

### 16. Email Sparse Unique Allows Multiple Null Emails
- **File:** [`backend/models/User.js`](backend/models/User.js)
- **Lines:** Email field
- **Issue:** `unique: true` combined with `sparse: true` means multiple documents with `email: null` or `email: undefined` can coexist, bypassing uniqueness.
- **Cause:** Incorrect index configuration.
- **Effect:** Duplicate user accounts without emails, confusing queries and lookups.

### 17. Notification Enum Missing `booking_declined`
- **File:** [`backend/models/Notification.js`](backend/models/Notification.js)
- **Lines:** 13–17 (enum values)
- **Issue:** The notification `type` enum specifies: `['new_booking', 'booking_confirmed', 'new_message', 'general']`, but [`backend/routes/api.js`](backend/routes/api.js):133 creates notifications with type `'booking_declined'`, which fails Mongoose validation.
- **Cause:** Enum not updated when `booking_declined` notification type was added.
- **Effect:** Booking declined notifications silently fail to save. Workers never get notified of declined bookings via the notification system.

### 18. Message senderId Type Mismatch
- **File:** [`backend/models/Message.js`](backend/models/Message.js)
- **Line:** 9 (`senderId: { type: String }`)
- **Issue:** `senderId` is `String` while all other references to users use `mongoose.Schema.Types.ObjectId`. Can't populate sender data.
- **Cause:** Inconsistent typing — likely leftover from initial prototyping.
- **Effect:** Cannot join/populate sender information when querying messages. Manual queries needed to resolve sender names.

### 19. Customer Profile Update Uses Worker Endpoint
- **File:** [`frontend/src/pages/CustomerProfileSettings.jsx`](frontend/src/pages/CustomerProfileSettings.jsx)
- **Line:** 50 (`await api.put(\`/workers/${currentUser._id}\`, ...)`)
- **Issue:** Customer profile settings page calls the worker update endpoint (`PUT /workers/:id`), which is designed to update worker-specific fields (category, skills, pricePerHour, etc.).
- **Cause:** Wrong API endpoint used — no `/customers/:id` endpoint exists.
- **Effect:** Customer profile updates either fail or incorrectly overwrite fields that should only be on worker documents.

### 20. NotificationCenter Import Path Wrong
- **File:** [`frontend/src/components/dashboard/NotificationCenter.jsx`](frontend/src/components/dashboard/NotificationCenter.jsx)
- **Line:** 3 (`import api from '../services/api'`)
- **Issue:** The relative path `../services/api` resolves to `frontend/src/components/services/api`, which doesn't exist. The correct path is `../../services/api` (go up two levels from `components/dashboard/`).
- **Cause:** Incorrect relative path calculation.
- **Effect:** The NotificationCenter component crashes at runtime with a module import error. **All notification functionality is broken.**

### 21. Worker Availability Toggle Is Local-Only
- **File:** [`frontend/src/pages/WorkerDashboard.jsx`](frontend/src/pages/WorkerDashboard.jsx)
- **Lines:** ~120–130 (toggle handler)
- **Issue:** The "Available for Work" toggle only updates React local state. No API call is made to update `isAvailable` on the backend.
- **Cause:** Incomplete feature implementation.
- **Effect:** Workers appear available to customers when they've toggled themselves offline. Leads to bookings for unavailable workers.

### 22. No Token Invalidation on Logout
- **File:** [`frontend/src/components/Navbar.jsx`](frontend/src/components/Navbar.jsx):8–11, [`frontend/src/components/dashboard/Sidebar.jsx`](frontend/src/components/dashboard/Sidebar.jsx):71–75
- **Issue:** Logout only clears the localStorage user object and navigates away. The JWT token remains valid until it expires (30 days). No server-side blacklist or invalidation.
- **Cause:** No token blacklist or short-lived token + refresh token pattern.
- **Effect:** Stolen tokens remain valid even after user "logs out." No way to force-logout compromised sessions.

### 23. No Response Interceptor for Expired Tokens
- **File:** [`frontend/src/services/api.js`](frontend/src/services/api.js)
- **Lines:** 1–19
- **Issue:** Axios instance has no response interceptor. When the API returns 401 (but it currently returns 500 — see #13), the frontend doesn't auto-redirect to login or clear the stored token.
- **Cause:** Not implemented.
- **Effect:** Users continue seeing the authenticated UI with an expired token, then encounter cryptic errors when API calls fail.

### 24. No Cascade Delete on User Removal
- **File:** [`frontend/src/pages/AdminDashboard.jsx`](frontend/src/pages/AdminDashboard.jsx):48–57
- **Issue:** Admin delete user calls `DELETE /admin/users/:id` but there's no backend cascade logic to delete associated bookings, messages, notifications.
- **Cause:** Incomplete delete implementation.
- **Effect:** Orphaned records in Booking, Message, and Notification collections referencing deleted users.

### 25. Admin Cannot Update Worker Profiles
- **File:** [`backend/routes/api.js`](backend/routes/api.js) (PUT `/workers/:id`)
- **Issue:** Worker update route only checks `req.user.id !== req.params.id` — admin users are blocked from updating worker profiles.
- **Cause:** No `adminOnly` middleware bypass.
- **Effect:** Administrators cannot moderate or fix worker profile data.

### 26. ChatBox & ChatWindow — Duplicate Components
- **Files:** [`frontend/src/components/ChatBox.jsx`](frontend/src/components/ChatBox.jsx), [`frontend/src/components/ChatWindow.jsx`](frontend/src/components/ChatWindow.jsx)
- **Issue:** Two nearly identical chat components (~170 lines each). ChatWindow appears to be the older version; ChatBox is the polished version. Only ChatBox is actively used.
- **Cause:** Refactoring without removing old component.
- **Effect:** Code duplication, maintenance burden, potential confusion about which component to use.

---

## 🟡 MEDIUM SEVERITY

### 27. Hardcoded Chart & System Health Data
- **File:** [`frontend/src/pages/AdminDashboard.jsx`](frontend/src/pages/AdminDashboard.jsx)
- **Lines:** 82–89 (chartData), ~160–165 (system health: "24ms", "99.9%", "2.1GB")
- **Issue:** Dashboard charts and system health metrics are static hardcoded values, never fetched from the backend. The admin sees the same fake data regardless of actual system state.
- **Cause:** Placeholder data never replaced with real API integration.
- **Effect:** Misleading admin dashboard. Zero operational visibility.

### 28. DashboardCharts — All Data Hardcoded
- **File:** [`frontend/src/components/dashboard/DashboardCharts.jsx`](frontend/src/components/dashboard/DashboardCharts.jsx)
- **Lines:** 30–37 (SVG path), 45–49 (days array), 66–68 (donut segments), 77–81 (category distribution)
- **Issue:** The Line Chart SVG path is static, the day labels are hardcoded, the donut chart segments are static (`strokeDasharray="180 251"`), and category distribution percentages are hardcoded ("45%", "30%", "25%").
- **Cause:** No dynamic data binding implemented.
- **Effect:** Charts always show the same fake data regardless of actual booking trends.

### 29. Fixed Price Estimate — No Worker Rate Used
- **File:** [`frontend/src/pages/Booking.jsx`](frontend/src/pages/Booking.jsx)
- **Lines:** 17 (`estimatedPrice: 1000`), ~80 (display)
- **Issue:** Booking price is always a fixed 2-hour estimate at a hardcoded rate, ignoring the worker's actual `pricePerHour`. The estimate is calculated as `2 * 500 = 1000` regardless of the worker's rate (which ranges from 300–800 in seed data).
- **Cause:** Simplified implementation without worker rate integration.
- **Effect:** Customers see wrong price estimates. Workers may be underpaid or customers overcharged.

### 30. No Pagination on Any List Endpoint
- **File:** [`backend/routes/api.js`](backend/routes/api.js) — GET `/workers`, GET `/messages`, etc.
- **Issue:** All list endpoints return the complete dataset without pagination, limit, or offset parameters.
- **Cause:** Not implemented.
- **Effect:** As the database grows, API responses become increasingly large, causing slow load times, high bandwidth usage, and potential browser/device memory issues.

### 31. No Database Indexes on Query Fields
- **Files:** All models in [`backend/models/`](backend/models/)
- **Issue:** No indexes defined on frequently queried fields: `Booking.status`, `Booking.customer`, `Booking.worker`, `User.role`, `User.category`, `Message.bookingId`, `Notification.recipientId`.
- **Cause:** Not configured in Mongoose schemas.
- **Effect:** Full collection scans on every query. Performance degrades linearly with data growth.

### 32. No Response Caching Headers
- **Issue:** No `Cache-Control`, `ETag`, or `Last-Modified` headers on any API response. Categories and worker lists are re-fetched on every page load.
- **Cause:** Not configured.
- **Effect:** Unnecessary network requests and backend load for data that rarely changes (categories, worker listings).

### 33. Seed Data Uses Hardcoded Passwords in Source Code
- **File:** [`backend/seed.js`](backend/seed.js)
- **Lines:** 31 (`password: 'adminpassword'`), 39 (`password: 'password123'`), 55–70 (workers all with `password123`)
- **Issue:** Plaintext passwords committed to source code. Even though they're hashed before storage, the raw strings are visible in version control history.
- **Cause:** Development convenience.
- **Effect:** If seed is run in any non-local environment, these credentials become real attack vectors.

### 34. Booking.insertMany Bypasses Mongoose Middleware
- **File:** [`backend/seed.js`](backend/seed.js)
- **Line:** 106
- **Issue:** `Booking.insertMany()` skips Mongoose `save` middleware (validation, pre-save hooks, etc.), unlike `Booking.create()` or `new Booking().save()`.
- **Cause:** Using `insertMany` for performance without considering side effects.
- **Effect:** Seed bookings aren't validated against the schema. If future middleware is added to Booking, seed data won't trigger it.

### 35. Worker Update Shows Admin Access Anomaly
- **File:** [`frontend/src/pages/WorkerProfileSettings.jsx`](frontend/src/pages/WorkerProfileSettings.jsx)
- **Lines:** 52–79
- **Issue:** Only self-update is supported. No admin panel integration to manage worker profiles.
- **Effect:** Workers can set unrealistic prices, misleading bios, or inappropriate content without moderation.

### 36. No Graceful Shutdown
- **File:** [`backend/server.js`](backend/server.js)
- **Issue:** No `SIGTERM`/`SIGINT` handler to close MongoDB connections, Socket.io server, or HTTP server gracefully.
- **Cause:** Not implemented.
- **Effect:** Abrupt process termination can leave Socket.io connections hanging and MongoDB connections in an inconsistent state.

### 37. Phone Input Uses Wrong Icon
- **File:** [`frontend/src/pages/CustomerProfileSettings.jsx`](frontend/src/pages/CustomerProfileSettings.jsx)
- **Line:** 122
- **Issue:** The "Phone" input field uses the `Mail` icon instead of a `Phone` icon.
- **Cause:** Copy-paste error from the email field.
- **Effect:** Confusing UI — users see a mail icon next to the phone number field.

### 38. alert() Used for User Feedback
- **Files:** [`frontend/src/pages/Register.jsx`](frontend/src/pages/Register.jsx):27, [`frontend/src/components/dashboard/RecentBookings.jsx`](frontend/src/components/dashboard/RecentBookings.jsx):~93, [`frontend/src/pages/Booking.jsx`](frontend/src/pages/Booking.jsx):~72
- **Issue:** Browser `alert()` dialogs used for success/error messages. They are blocking, unstyled, and provide poor UX.
- **Cause:** Quick implementation without a toast/notification system.
- **Effect:** Jarring user experience inconsistent with the premium UI design.

### 39. No Password Strength Validation
- **File:** [`frontend/src/pages/Register.jsx`](frontend/src/pages/Register.jsx), [`backend/routes/api.js`](backend/routes/api.js):POST `/auth/register`
- **Issue:** Registration accepts any password without minimum length, complexity, or common-password checks.
- **Cause:** Not implemented.
- **Effect:** Users can set passwords like "123" or "password", making accounts trivially hackable.

### 40. Empty backend/backend/ Directory
- **Path:** `backend/backend/`
- **Issue:** An empty nested directory with no files. Likely created accidentally during project setup.
- **Cause:** Unknown — possibly a mistaken `mkdir` or copy operation.
- **Effect:** Confusing directory structure. May cause issues with some tooling expecting a standard layout.

### 41. App.css Contains Unused Vite Boilerplate
- **File:** [`frontend/src/App.css`](frontend/src/App.css)
- **Lines:** 1–185 (entire file)
- **Issue:** The file contains default Vite template styles (`.counter`, `.hero`, `#center`, `#next-steps`, `.ticks`) that are not used anywhere in the application.
- **Cause:** Never cleaned up after initializing with Vite template.
- **Effect:** Dead CSS shipped to production (~5KB of unused styles).

### 42. LocationBroadcaster Multiple Geolocation Watches
- **File:** [`frontend/src/components/dashboard/LocationBroadcaster.jsx`](frontend/src/components/dashboard/LocationBroadcaster.jsx)
- **Lines:** 9–33
- **Issue:** Creates a separate `navigator.geolocation.watchPosition` for each active confirmed booking. If a worker has 5 active bookings, 5 simultaneous GPS watches run.
- **Cause:** Mapping watches over all active bookings without consolidation.
- **Effect:** Severe battery drain on mobile devices. Multiple location emissions for the same physical position.

---

## 🟢 LOW SEVERITY

### 43. Leaflet CSS Loaded Twice
- **Files:** [`frontend/index.html`](frontend/index.html):11 (CDN link), [`frontend/src/components/dashboard/LiveTrackingMap.jsx`](frontend/src/components/dashboard/LiveTrackingMap.jsx):4 (JS import)
- **Issue:** Leaflet CSS is loaded both via a CDN `<link>` tag in `index.html` and via ES module import in `LiveTrackingMap.jsx`.
- **Cause:** Redundant inclusion.
- **Effect:** Slightly larger bundle and potential CSS specificity issues.

### 44. Google Fonts External Dependency
- **File:** [`frontend/index.html`](frontend/index.html):10
- **Issue:** Fonts loaded from Google Fonts CDN. If the CDN is blocked or down, the entire app falls back to system fonts.
- **Cause:** Standard practice but no fallback font bundled.
- **Effect:** Degraded typography when Google Fonts is unreachable (e.g., in China, restrictive networks).

### 45. No Lazy Loading / Code Splitting
- **File:** [`frontend/src/App.jsx`](frontend/src/App.jsx)
- **Issue:** All page components are imported statically. No `React.lazy()` or dynamic imports for route-level code splitting.
- **Cause:** Not implemented.
- **Effect:** Larger initial bundle. All dashboard code (Leaflet, charts) loads even for users who never visit those pages.

### 46. No TypeScript
- **Issue:** Entire codebase is plain JavaScript with no type checking.
- **Cause:** Project started with JavaScript.
- **Effect:** No compile-time type safety. Refactoring is risky. IDE autocompletion is limited.

### 47. No Test Files
- **Issue:** Zero test files anywhere in the project (no `*.test.js`, `*.spec.js`, `__tests__/` directories).
- **Cause:** Tests never written.
- **Effect:** No regression protection. Every change risks breaking existing functionality without detection.

### 48. No Environment Variable Validation
- **File:** [`backend/server.js`](backend/server.js)
- **Issue:** Server starts without checking that required environment variables (`MONGODB_URI`, `JWT_SECRET`) are set. Falls back silently to in-memory DB and potentially weak/empty JWT secret.
- **Cause:** No startup validation.
- **Effect:** Production can silently run with in-memory storage and insecure JWT signing.

### 49. vite.config.js Has No Dev Proxy
- **File:** [`frontend/vite.config.js`](frontend/vite.config.js)
- **Issue:** No `server.proxy` configuration. The frontend makes direct cross-origin requests to `localhost:5001`, requiring CORS to be enabled even in development.
- **Cause:** Not configured.
- **Effect:** Development setup requires CORS middleware, complicating local development and making it harder to lock down CORS in production.

### 50. DangerouslySetInnerHTML for Scrollbar Hiding
- **File:** [`frontend/src/pages/Home.jsx`](frontend/src/pages/Home.jsx)
- **Lines:** 229–237
- **Issue:** `dangerouslySetInnerHTML` is used to inject a `<style>` tag for hiding scrollbars. This is unnecessary — a Tailwind utility class or CSS file would achieve the same without the XSS vector.
- **Cause:** Quick inline styling shortcut.
- **Effect:** Sets a dangerous pattern precedent. If user-generated content ever reaches this pattern, XSS is possible.

### 51. StatCard Color Class String Manipulation
- **File:** [`frontend/src/components/dashboard/StatCard.jsx`](frontend/src/components/dashboard/StatCard.jsx)
- **Line:** 15 (`colorClass.replace('bg-', 'text-')`)
- **Issue:** Fragile string manipulation to derive text color from background color class. Breaks if the naming convention changes (e.g., `bg-neon-blue/20` won't convert to a valid text class).
- **Cause:** Tight coupling to Tailwind naming convention.
- **Effect:** Potential rendering issues if color classes are refactored or opacity modifiers are used.

### 52. Inconsistent Error Handling Patterns
- **Files:** [`backend/routes/api.js`](backend/routes/api.js) (various routes)
- **Issue:** Some routes use try-catch with `res.status(500).json()`, others let errors propagate to Express's default error handler, and the auth middleware returns 500 for auth failures (see #13).
- **Cause:** No centralized error handling middleware.
- **Effect:** Inconsistent error response format across the API. Clients must handle multiple error shapes.

### 53. Socket Listeners Without Cleanup on Re-renders
- **File:** [`frontend/src/pages/WorkerDashboard.jsx`](frontend/src/pages/WorkerDashboard.jsx)
- **Issue:** Socket event listeners (`socket.on(...)`) are attached in `useEffect` but may accumulate if the component re-renders before cleanup.
- **Cause:** Effect dependencies not properly managed.
- **Effect:** Duplicate event handlers, each socket event triggers multiple callbacks.

### 54. No Payment Integration
- **Files:** [`frontend/src/pages/Booking.jsx`](frontend/src/pages/Booking.jsx):14–15, [`backend/models/Booking.js`](backend/models/Booking.js):~10
- **Issue:** Payment methods (bKash, Nagad, Cash) are stored as strings but there's no actual payment processing integration. No transaction verification, no payment gateway.
- **Cause:** UI-only implementation.
- **Effect:** The platform cannot process real payments. All bookings are effectively unpaid/honor-system.

---

## 🔧 RECOMMENDED FIX PRIORITIES

### Immediate (Before Any Deployment)
1. Add `auth` middleware to all unprotected routes (bookings, messages, notifications)
2. Remove or password-protect the `/mock-user/:role` endpoint
3. Remove quick-login buttons from the login page
4. Switch JWT storage from localStorage to httpOnly cookies
5. Configure CORS to whitelist only the frontend origin
6. Install and configure `helmet`
7. Install and configure `express-rate-limit`
8. Fix the socket event name mismatch (`join_booking` → `join_user` semantics)
9. Fix NotificationCenter import path (`../services/api` → `../../services/api`)
10. Add `'booking_declined'` to the Notification enum

### Short-Term (Before Production Use)
11. Fix JWT middleware to return 401 instead of 500
12. Add `required: true` to User password field
13. Remove `sparse: true` from email unique index
14. Fix `senderId` type from String to ObjectId in Message model
15. Add input validation with Joi or express-validator
16. Remove mongodb-memory-server from startup logic; fail fast on DB connection error
17. Implement token invalidation (blacklist or short-lived tokens)
18. Add Axios response interceptor for 401 handling
19. Fix customer profile update to use correct endpoint
20. Wire worker availability toggle to backend API
21. Add cascade deletes for user removal
22. Allow admin to update worker profiles

### Medium-Term
23. Implement pagination on all list endpoints
24. Add database indexes on query fields
25. Replace hardcoded chart data with real API data
26. Replace `alert()` calls with a toast notification system
27. Add password strength validation
28. Connect booking price to worker's `pricePerHour`
29. Remove duplicate `ChatWindow.jsx` component
30. Add graceful shutdown handlers
31. Implement lazy loading for routes
32. Add response caching headers

### Long-Term
33. Add comprehensive test suite
34. Consider TypeScript migration
35. Integrate real payment processing (bKash/Nagad)
36. Add centralized error handling middleware
37. Implement refresh token rotation
38. Add WebSocket authentication
39. Set up CI/CD pipeline with security scanning

---

*Report generated by automated codebase audit. All findings verified against source files in `/Users/rahul/ServiGo`.*