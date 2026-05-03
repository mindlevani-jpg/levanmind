# Mindfulness App (Georgian) - PRD

## Overview
Mobile meditation/mindfulness app in Georgian language matching reference UI screenshots. Dark blue theme, 5-tab bottom navigation.

## Auth
- JWT-based custom auth (Bearer token) stored in AsyncStorage on device
- Seeded test account: `test@test.com` / `test123`
- Register and Login screens

## Screens
- **(auth)/login, (auth)/register** — email/password forms
- **(tabs)/index** — Home: greeting, special-offer countdown banner, breathing card, beginner course, evening course
- **(tabs)/library** — Saved sessions count + minutes + list
- **(tabs)/sleep** — Sleep timer, 4-7-8 breathing, sleep stories (horizontal), sleep sounds list
- **(tabs)/discover** — Search, 3 quick links, 2 recommendations, new & featured list
- **(tabs)/profile** — Avatar, stats grid (days/minutes/sessions/courses), logout
- **player** — Animated breath circle with 4→3→2→1 countdown, play/pause, skip ±15s, save (heart), audio via expo-av, completes session to record history

## Sessions (11 total, Georgian)
Morning Meditation, Night Relaxation, Stress Relief (4-7-8), Focus, Forest Sounds, Ocean Waves, Rain, Night Sky, White Noise, Fireplace, Birds — all with public pixabay audio URLs.

## API (FastAPI + MongoDB)
- /api/auth/register, /api/auth/login, /api/auth/me
- /api/sessions, /api/sessions/{id}, /api/discover
- /api/sessions/toggle_saved, /api/user/saved
- /api/sessions/complete, /api/user/stats

## Smart enhancement
Saved sessions + completion history drive a gamified profile dashboard (mindful days streak, total minutes, sessions, courses) — increases daily engagement/retention.
