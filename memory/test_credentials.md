# Test Credentials

## Seeded Test User (email/password)
- **Email:** test@test.com
- **Password:** test123
- **Name:** ტესტ მომხმარებელი
- **Role:** user

## Auth Endpoints (prefix: /api)
- POST `/api/auth/register` — { email, password, name }
- POST `/api/auth/login` — { email, password }
- POST `/api/auth/google` — { session_id }  (Emergent Google Auth)
- GET  `/api/auth/me` — Bearer token

## Google Auth (Emergent-managed)
- Auth URL: `https://auth.emergentagent.com/?redirect=<encoded_redirect_url>`
- After redirect the URL contains `#session_id=...`
- Frontend extracts `session_id` and POSTs to `/api/auth/google` to receive our JWT.
- No password is stored for Google users (`provider: "google"`).

## App data endpoints (require Bearer)
- GET `/api/sessions` (?category=)
- GET `/api/sessions/{id}`
- GET `/api/discover`
- POST `/api/sessions/complete`
- POST `/api/sessions/toggle_saved`
- GET `/api/user/saved`
- GET `/api/user/stats` (returns streak + 9 achievements)
- POST/GET `/api/user/mood`
- POST/GET `/api/user/journal`
- POST `/api/user/theme` (dark|light)

Tokens are JWT access tokens (7-day expiry) sent via `Authorization: Bearer <token>`.
