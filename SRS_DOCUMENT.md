# Software Requirements Specification (SRS)
## Helping-Code | Women's Safety Service

**Document Version:** 1.3  
**Date:** July 1, 2026  
**Project Name:** Women Safety Web Application  
**Author:** Development Team  

---

## 1. INTRODUCTION

### 1.1 Purpose
This document defines functional and non-functional requirements for Helping-Code | Women's Safety Service, a web-based safety platform providing emergency tools, AI-assisted distress detection, account-based access, and ownership-controlled review management.

### 1.2 Scope
The solution includes:
- Login and registration pages
- localStorage-based access gate for protected application pages
- SOS hold-to-activate emergency flow
- AI Guardian with acoustic detection and voice code-word trigger
- 30-second fail-safe countdown and cancel flow for AI-detected events
- Live location sharing with Google Maps link
- Emergency contact management
- Fake call simulation
- 5-star review module with owner-only edit/delete
- Server-side APIs for authentication and reviews
- Mobile-first responsive UI and loading indicators

### 1.3 Intended Users
- Women using safety tools and emergency support features
- Registered users submitting and managing feedback
- Developers/maintainers operating local PHP deployment

---

## 2. OVERALL DESCRIPTION

### 2.1 Product Overview
Helping-Code is a browser-based safety application. Users must register/login before accessing protected pages. The app combines client-side interactions (SOS, AI Guardian, contacts, fake call, UI state) with server APIs for account and review persistence.

### 2.2 Product Components
- **Main App:** `index.html` (SOS, location, contacts, fake call, AI Guardian)
- **Brand and Reviews:** `brand.html` (ratings and feedback)
- **Authentication:** `login.html`, `register.html`
- **Core Client Logic:** `script.js`
- **AI Modules:** `js/ai-guardian.js`, `js/acoustic-detector.js`, `js/voice-trigger.js`
- **Server APIs:** `api/auth.php`, `api/reviews_api.php`
- **Server Data Files:** `api/users.json`, `api/reviews.json`
- **Legacy Compatibility Endpoint:** `reviews_api.php` with `data/reviews.json`

### 2.3 Operating Environment
- Frontend: HTML5, CSS3, Vanilla JavaScript
- AI Runtime: TensorFlow.js (CDN loaded)
- Backend: PHP 8+ (XAMPP/Apache)
- Storage:
  - Browser localStorage (session and local feature state)
  - JSON file persistence on server
- Browsers: Chrome, Edge, Firefox, Safari (modern versions; AI voice behavior depends on browser support)

---

## 3. FUNCTIONAL REQUIREMENTS

### 3.1 Authentication and Access Control (REQ-001)
**Requirement:** Users must authenticate before using protected pages.

- **REQ-001.1:** System shall provide registration form with Name, Email, Password.
- **REQ-001.2:** System shall provide login form with Email and Password.
- **REQ-001.3:** Registration and login must call `api/auth.php` via POST JSON.
- **REQ-001.4:** On successful login, client stores current user object in `localStorage.currentUser`.
- **REQ-001.5:** If `currentUser` is missing, protected pages redirect to `login.html`.
- **REQ-001.6:** Header shall show signed-in user label and logout action on protected pages.
- **REQ-001.7:** Logout shall clear local session and redirect to login page.

### 3.2 SOS System (REQ-002)
**Requirement:** Users can trigger emergency SOS by pressing and holding.

- **REQ-002.1:** SOS activates only after a continuous 3-second hold.
- **REQ-002.2:** Progress ring shall visualize hold duration.
- **REQ-002.3:** Releasing early shall cancel activation.
- **REQ-002.4:** Activation shall show user-facing confirmation message.
- **REQ-002.5:** Emergency protocol shall be callable programmatically (`window.activateEmergencyProtocol`) for AI modules.

### 3.3 Location Sharing (REQ-003)
**Requirement:** Users can request and view current geolocation.

- **REQ-003.1:** Share Location button shall request browser geolocation permission.
- **REQ-003.2:** UI shall display latitude, longitude, and accuracy.
- **REQ-003.3:** UI shall show Google Maps link using returned coordinates.
- **REQ-003.4:** System shall handle denied, timeout, and unavailable errors.
- **REQ-003.5:** Button shall show loading state while location request is in progress.

### 3.4 Emergency Contacts (REQ-004)
**Requirement:** Users can add, list, call simulation, and delete local emergency contacts.

- **REQ-004.1:** Contact requires Name and Number validation.
- **REQ-004.2:** Contacts persist in `localStorage.contacts`.
- **REQ-004.3:** Contacts render with Call and Delete actions.
- **REQ-004.4:** Local static emergency contact is displayed separately.

### 3.5 Fake Call Simulation (REQ-005)
**Requirement:** Users can trigger and control fake incoming call flow.

- **REQ-005.1:** Fake call screen shows caller, ring state, and Accept/Decline actions.
- **REQ-005.2:** Accept transitions to connected state with End Call.
- **REQ-005.3:** Decline/End exits fake call mode.
- **REQ-005.4:** Audio ringtone simulation shall play while ringing.

### 3.6 Reviews and Ownership Authorization (REQ-006)
**Requirement:** Registered users can create reviews; only owner can edit/delete.

- **REQ-006.1:** Review requires star rating and non-empty text.
- **REQ-006.2:** Review create/update/delete payload includes authenticated `userId`.
- **REQ-006.3:** Reviews are fetched from `api/reviews_api.php` in global mode.
- **REQ-006.4:** Edit/Delete controls are displayed only when `review.userId === currentUser.id`.
- **REQ-006.5:** Server shall reject update/delete when request `userId` does not match review owner.
- **REQ-006.6:** Unauthorized edit/delete returns HTTP 403 with error payload.
- **REQ-006.7:** Client shall show explicit error message (`Not allowed!`) on unauthorized response.
- **REQ-006.8:** Review submit/update/delete buttons shall show loading state during API requests.
- **REQ-006.9:** If review API is unavailable, system shall fallback to local review cache mode (`localStorage.reviews`).

### 3.7 Navigation (REQ-007)
**Requirement:** Users can move clearly between login, app, and reviews pages.

- **REQ-007.1:** Login page links to registration.
- **REQ-007.2:** Registration page links to login.
- **REQ-007.3:** Main page provides Brand and Reviews navigation.
- **REQ-007.4:** Brand page provides Back to Safety App navigation.
- **REQ-007.5:** Shared header includes signed-in user pill and logout button on protected pages.

### 3.8 Data Persistence (REQ-008)
**Requirement:** Session and application data persist as designed.

- **REQ-008.1:** Auth users are persisted in `api/users.json`.
- **REQ-008.2:** Reviews are persisted in `api/reviews.json`.
- **REQ-008.3:** Current session user is stored in `localStorage.currentUser`.
- **REQ-008.4:** Local fallback review cache is stored in `localStorage.reviews`.
- **REQ-008.5:** Contacts are stored in `localStorage.contacts`.
- **REQ-008.6:** AI Guardian settings are stored in `localStorage.aiGuardianSettings`.

### 3.9 AI Guardian (REQ-009)
**Requirement:** System shall provide AI-assisted distress detection and controlled escalation.

- **REQ-009.1:** User can enable/disable AI Guardian from the main app.
- **REQ-009.2:** Acoustic detector shall run YAMNet-based classification in-browser using microphone input.
- **REQ-009.3:** Distress classes (for example scream, shout, siren, gunshot) shall be threshold-checked.
- **REQ-009.4:** Acoustic threat shall trigger a 30-second fail-safe countdown modal before SOS activation.
- **REQ-009.5:** User can cancel fail-safe countdown to suppress false alarms.
- **REQ-009.6:** Voice code-word can be configured by user and saved.
- **REQ-009.7:** Repeating the configured code-word 3 times within time window shall trigger immediate SOS (bypassing countdown).
- **REQ-009.8:** After trigger/cancel, detector shall apply cooldown to reduce immediate re-trigger loops.
- **REQ-009.9:** If countdown UI is unavailable, acoustic detection path shall fail-safe by directly invoking emergency protocol.

---

## 4. NON-FUNCTIONAL REQUIREMENTS

### 4.1 Performance (NFR-001)
- App page should load within 3 seconds in normal network conditions.
- Geolocation request timeout shall be capped at 60 seconds.
- Client-side interactions should remain responsive with at least 100 contacts and 100 reviews.
- AI Guardian should begin listening within acceptable startup delay after model and microphone permissions are ready.

### 4.2 Usability and UX (NFR-002)
- UI must be mobile-first and responsive.
- Buttons must remain touch-friendly (minimum target size around 44x44px).
- Primary actions must have visible hover/active/focus states.
- Loading operations must provide visual feedback.
- Layout must remain readable on 320px to large desktop widths.

### 4.3 Security and Privacy (NFR-003)
- Passwords must be hashed server-side (`password_hash`).
- Login verification must use `password_verify`.
- Unauthorized review update/delete must be blocked server-side.
- Auth and reviews APIs must return structured error responses.
- Geolocation and microphone access are permission-gated by browser security policy.
- Acoustic detector processing should run fully in-browser.
- Voice trigger behavior shall include user-facing privacy note because SpeechRecognition may use cloud transcription depending on browser.

### 4.4 Reliability (NFR-004)
- Missing DOM elements must not crash script execution.
- API failures should degrade gracefully with user feedback.
- If review API is unavailable, app shall fallback to local review cache mode.
- AI Guardian start failures (model/microphone) shall not crash app and should surface status feedback.

### 4.5 Accessibility (NFR-005)
- Interactive controls should support keyboard focus.
- Form and status messages should provide clear textual feedback.
- Modal and dynamic states should keep appropriate ARIA attributes.

---

## 5. SYSTEM ARCHITECTURE

### 5.1 Technology Stack
| Layer | Technology |
|------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| AI Runtime | TensorFlow.js + YAMNet model |
| Backend | PHP (Apache/XAMPP) |
| Data Storage | JSON files + browser localStorage |
| Runtime | Localhost deployment via XAMPP |

### 5.2 Current File Structure
```text
women-safety/
|- index.html
|- brand.html
|- login.html
|- register.html
|- script.js
|- style.css
|- SRS_DOCUMENT.md
|- api/
|  |- auth.php
|  |- reviews_api.php
|  |- users.json
|  \- reviews.json
|- data/
|  \- reviews.json
|- js/
|  |- ai-guardian.js
|  |- acoustic-detector.js
|  \- voice-trigger.js
\- reviews_api.php
```

### 5.3 Data Models
```json
// localStorage.currentUser
{
  "id": "usr_...",
  "name": "User Name",
  "email": "user@example.com"
}
```

```json
// localStorage.aiGuardianSettings
{
  "enabled": true,
  "codeWord": "pineapple emergency"
}
```

```json
// api/users.json item
{
  "id": "usr_...",
  "name": "User Name",
  "email": "user@example.com",
  "passwordHash": "$2y$...",
  "createdAt": 1712832000
}
```

```json
// api/reviews.json item
{
  "id": "rev_...",
  "userId": "usr_...",
  "rating": 5,
  "text": "Great app",
  "createdAt": 1712832000,
  "updatedAt": 1712832000
}
```

---

## 6. USE CASES

### Use Case 1: Register and Login
**Actor:** New user  
**Precondition:** User opens `register.html`
1. User enters name, email, password and submits register form.
2. System stores new user in `api/users.json` with hashed password.
3. User goes to login page and submits credentials.
4. On success, client stores `currentUser` and redirects to `index.html`.

### Use Case 2: Access Protection
**Actor:** Unauthenticated visitor  
**Precondition:** No `localStorage.currentUser`
1. Visitor opens `index.html` or `brand.html`.
2. System checks auth state in `script.js`.
3. Visitor is redirected to `login.html`.

### Use Case 3: Create Review
**Actor:** Authenticated user
1. User opens brand page and selects rating and text.
2. Client sends create payload with `userId`.
3. Server stores review in `api/reviews.json`.
4. Review list and summary refresh.

### Use Case 4: Unauthorized Review Edit/Delete Attempt
**Actor:** Authenticated non-owner user
1. User attempts to modify review owned by another user.
2. Server validates `review.userId !== request.userId`.
3. Server returns 403 Unauthorized.
4. Client displays `Not allowed!`.

### Use Case 5: AI Acoustic Detection with Fail-safe
**Actor:** Authenticated user with AI Guardian enabled
1. User enables AI Guardian.
2. Acoustic model detects qualifying distress sound.
3. System opens 30-second fail-safe countdown modal.
4. If user cancels, alert is suppressed and cooldown is applied.
5. If user does not cancel, SOS emergency protocol is activated.

### Use Case 6: Voice Code-Word Instant Trigger
**Actor:** Authenticated user with code-word configured
1. User saves a custom code-word phrase.
2. User repeats phrase 3 times in allowed interval.
3. System confirms trigger and activates SOS immediately.

---

## 7. TESTING REQUIREMENTS

### 7.1 Authentication Tests
- Register user with valid data.
- Reject duplicate email registration.
- Login success with correct credentials.
- Login failure with incorrect credentials.
- Protected page redirect to login when session missing.
- Logout clears session and redirects.

### 7.2 Review Authorization Tests
- Owner can update own review.
- Owner can delete own review.
- Non-owner cannot update review (403).
- Non-owner cannot delete review (403).
- UI hides edit/delete for non-owner reviews.

### 7.3 UX and Responsive Tests
- Login and brand layouts render properly on mobile and desktop.
- Header action group remains readable at narrow widths.
- Loading state appears and disappears correctly on async actions.

### 7.4 Existing Feature Tests
- SOS hold behavior (3-second activation) works.
- Geolocation and error handling behavior works.
- Contact add/call/delete behavior works.
- Fake call flow (ring, accept, decline, end) works.

### 7.5 AI Guardian Tests
- Guardian toggle enables and disables detector pipeline.
- Model loading and microphone permission failure paths show safe error status.
- Acoustic distress detection triggers fail-safe modal.
- Canceling fail-safe prevents emergency activation.
- Failsafe timeout triggers emergency activation.
- Voice code-word repeated 3 times triggers immediate SOS.
- Cooldown prevents immediate repeated trigger loops.
- AI settings persist in localStorage across page reload.

---

## 8. DEPLOYMENT NOTES

### 8.1 Local XAMPP Setup
1. Place project in `d:\xampp\htdocs\women-safety`.
2. Start Apache in XAMPP Control Panel.
3. Open `http://localhost/women-safety/login.html`.

### 8.2 Runtime Paths
- Auth API: `http://localhost/women-safety/api/auth.php`
- Reviews API: `http://localhost/women-safety/api/reviews_api.php`

---

## 9. KNOWN LIMITATIONS

- Browser geolocation accuracy on desktop can be low (IP-based location fallback).
- Geolocation on non-localhost HTTP may be blocked by browser policy.
- Fake call is a simulation and does not initiate real telephony.
- Voice code-word support depends on browser SpeechRecognition implementation and may be unavailable in some browsers.
- Voice code-word transcription may use cloud service depending on browser implementation.
- JSON-file backend is suitable for local/small deployment and not intended for high concurrency production workloads.

---

## 10. DOCUMENT CONTROL

- Version 1.0: Initial baseline SRS
- Version 1.1: UI and review API updates
- Version 1.2: Authentication, owner-based review authorization, API folder restructuring, and UI/UX loading-state updates
- Version 1.3: AI Guardian introduction (acoustic detection, voice code-word trigger, fail-safe countdown, settings persistence) and SRS alignment with JS module architecture
- Next Review: After integrated QA cycle
