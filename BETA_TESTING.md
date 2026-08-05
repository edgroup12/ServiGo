# ServiGo Beta Test Guide

## Scope and known limitation

This checklist is for a controlled beta with 10–20 invited users. Worker profile settings currently represent one public service listing per worker. Password reset token generation and reset screens are implemented, but production reset-email delivery must be configured before password recovery can be considered production-ready.

## Tester setup

Split testers into these groups:

- 6–10 customers
- 4–8 workers/service providers
- 1–2 administrators

Ask testers to use a mix of iPhone, Android, tablet, and desktop devices, plus slow or unstable mobile connections where possible.

## Critical test checklist

### Account and authentication

- Register a customer with valid details.
- Register a worker with valid details.
- Verify invalid email, weak password, and invalid role requests are rejected.
- Sign in with correct credentials.
- Confirm incorrect credentials show a readable error and do not crash the page.
- Sign out, then confirm protected dashboard URLs redirect to sign-in.
- Request a password reset with both registered and unregistered email addresses.
- Follow a delivered reset link, set a strong password, and sign in with it.

### Customer journey

- Edit name, phone, address, and profile photo URL.
- Search workers by name.
- Filter workers by price, rating, availability, and category.
- Move between result pages and verify filters remain active.
- Open a worker profile.
- Attempt to book an unavailable worker and verify a readable error.
- Create a booking using a future date and all payment methods.
- Verify past dates and empty required fields are rejected.
- Confirm the booking appears in the customer dashboard.
- Receive booking confirmation, decline, and completion notifications.
- Open chat and exchange messages only within the related booking.

### Worker journey

- Edit and publish the service listing: name, bio, skills, hourly price, phone, and photo URL.
- Confirm invalid or excessive values show readable validation errors.
- Toggle availability and verify it changes public search results.
- Receive a new-booking notification.
- Confirm or decline a pending booking.
- Complete only a confirmed booking.
- Verify invalid status transitions are rejected.
- Exchange messages with the booking customer.

### Reliability and UX

- Repeat-submit login, registration, profile, and booking forms; confirm duplicate requests are prevented.
- Test every loading indicator on a slow connection.
- Disable the network during each primary page load and confirm an error/retry state appears.
- Test empty bookings, notifications, search results, and analytics states.
- Visit unknown URLs and protected URLs while signed out.
- Verify no white screen, frozen control, uncaught error overlay, or horizontal scrolling.
- Check all workflows at 320px, 375px, 768px, and desktop widths.

### Security checks

- Confirm users cannot request another user’s profile, bookings, analytics, messages, or notifications through modified API URLs.
- Confirm customers cannot choose another customer ID while booking.
- Confirm message sender IDs cannot be forged.
- Confirm public registration cannot create an administrator.
- Confirm repeated authentication requests eventually receive HTTP 429.
- Confirm API responses never contain password hashes or reset-token hashes.

## Bug report template

Copy this template for every distinct issue:

```text
Title:
Severity: Blocker / Critical / Major / Minor
Tester role: Customer / Worker / Admin
Device and OS:
Browser and version:
Production URL:
Date and time (Asia/Dhaka):

Preconditions:
1.

Steps to reproduce:
1.
2.
3.

Expected result:

Actual result:

Reproduction frequency: Always / Sometimes / Once
Network condition: Wi-Fi / Mobile / Offline / Throttled
Screenshot or screen recording: Attach if available
Console or API error: Paste text with secrets removed
Related booking/user ID: Include only the record ID, never passwords or tokens
```

## Release gate

Do not expand beyond the invited beta until all blocker and critical issues are fixed, password-reset email delivery is configured and tested, the complete quality pipeline passes, and the critical customer/worker journeys pass on at least one iPhone and one Android device.
