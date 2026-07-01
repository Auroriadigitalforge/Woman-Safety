# Helping-Code | Women's Safety Service

A browser-based women safety web app with emergency tools, AI-assisted distress detection, account authentication, and review management.

The project is built with a lightweight stack (HTML/CSS/JavaScript + PHP + JSON storage), making it easy to run locally on XAMPP or shared hosting.

## Features

- SOS hold-to-activate button (3-second press and hold).
- AI Guardian module with:
  - On-device acoustic threat detection using TensorFlow.js + YAMNet.
  - Optional voice code-word trigger (repeat phrase 3 times for instant alert).
  - 30-second fail-safe countdown before auto-SOS for acoustic detections.
- Live geolocation sharing with Google Maps link.
- Emergency contacts management (add, call simulation, delete) stored locally.
- Fake call simulation with ringtone, accept/decline, and end call states.
- User registration/login with PHP backend and password hashing.
- Global review system with owner-only edit/delete authorization.
- Offline fallback mode for reviews using localStorage when API is unavailable.

## Tech Stack

- Frontend: HTML5, CSS3, Vanilla JavaScript
- AI Runtime: TensorFlow.js (loaded via CDN)
- Backend: PHP (Apache/XAMPP compatible)
- Storage:
  - Server-side JSON files (`api/users.json`, `api/reviews.json`)
  - Browser localStorage (`currentUser`, `contacts`, `reviews`, `aiGuardianSettings`)

## Project Structure

```text
women-safety/
├── index.html                 # Main safety app (SOS, location, contacts, fake call, AI Guardian)
├── brand.html                 # Brand/review page
├── login.html                 # Login page
├── register.html              # Registration page
├── style.css                  # Shared styling
├── script.js                  # Core app logic (SOS, location, contacts, calls, reviews, auth guard)
├── reviews_api.php            # Legacy/alternate reviews endpoint writing to data/reviews.json
├── SRS_DOCUMENT.md            # Detailed software requirements spec
├── LICENSE
├── api/
│   ├── auth.php               # Register/Login API
│   ├── reviews_api.php        # Primary reviews CRUD API
│   ├── users.json             # User records (with password hashes)
│   └── reviews.json           # Review records
├── data/
│   └── reviews.json           # Data file used by root reviews_api.php
└── js/
    ├── acoustic-detector.js   # YAMNet acoustic threat detector
    ├── voice-trigger.js       # SpeechRecognition-based code-word trigger
    └── ai-guardian.js         # Orchestration + fail-safe countdown logic
```

## How It Works

1. User signs up or logs in via `api/auth.php`.
2. `currentUser` is stored in localStorage.
3. Protected pages (`index.html`, `brand.html`) redirect to login if no user session is present.
4. User can activate safety features manually (SOS, location, contacts, fake call).
5. If AI Guardian is enabled:
   - Acoustic events (scream/siren/gunshot classes) trigger a 30-second cancel window.
   - Confirmed voice code-word (3 repeats) triggers immediate SOS.

## Local Setup (XAMPP - Windows)

1. Place this project folder inside your XAMPP htdocs directory:
   - Example path: `d:/xampp/htdocs/women-safety`
2. Start Apache from XAMPP Control Panel.
3. Open in browser:
   - `http://localhost/women-safety/login.html`
4. Register a user, then log in.
5. Use `index.html` for safety tools and `brand.html` for reviews.

No database setup is required. JSON files are used for persistence.

## API Reference

### `POST api/auth.php`

Authentication endpoint.

- Register payload:

```json
{
	"action": "register",
	"name": "User Name",
	"email": "user@example.com",
	"password": "secret"
}
```

- Login payload:

```json
{
	"action": "login",
	"email": "user@example.com",
	"password": "secret"
}
```

### `GET api/reviews_api.php`

Fetch all reviews sorted by newest first.

### `POST api/reviews_api.php`

Review CRUD actions via `action` field:

- Create:

```json
{
	"action": "create",
	"userId": "usr_...",
	"rating": 5,
	"text": "Very helpful app"
}
```

- Update:

```json
{
	"action": "update",
	"id": "rev_...",
	"userId": "usr_...",
	"rating": 4,
	"text": "Updated review"
}
```

- Delete:

```json
{
	"action": "delete",
	"id": "rev_...",
	"userId": "usr_..."
}
```

Only the review owner can update/delete a review.

## Security and Privacy Notes

- Passwords are hashed with `password_hash()` and verified with `password_verify()`.
- Acoustic threat detection runs locally in-browser (on-device processing).
- Voice code-word detection relies on browser SpeechRecognition APIs, which may use cloud speech services depending on browser implementation.
- Geolocation and microphone access are permission-gated by the browser.

## Important Repository Note

This repository currently includes JSON data files (`api/users.json`, `api/reviews.json`) that may contain local test data.
Before publishing publicly, clear test data and avoid committing real user information.

## Documentation

- Software requirements and functional specification: `SRS_DOCUMENT.md`

## License

This project is distributed under the terms defined in `LICENSE`.
