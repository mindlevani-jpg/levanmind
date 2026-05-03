# Test Credentials

## Seeded Test User
- **Email:** test@test.com
- **Password:** test123
- **Name:** ტესტ მომხმარებელი
- **Role:** user

## Auth Endpoints (prefix: /api)
- POST `/api/auth/register` — { email, password, name }
- POST `/api/auth/login` — { email, password }
- GET  `/api/auth/me` — requires Authorization: Bearer <token>

Tokens returned as JSON { token } and are JWT access tokens (7-day expiry) sent to mobile client via Authorization header.
