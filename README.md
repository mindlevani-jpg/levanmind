# 🧘 Mindful — Georgian Mindfulness & Meditation App

A full-stack mobile mindfulness application built with **Expo (React Native)** and **FastAPI**. Features meditation sessions, sleep stories, breathing exercises, and progress tracking — fully localized in Georgian (ქართული).

![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20Web-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📱 Features

- 🔐 **JWT Authentication** (register / login) with bcrypt password hashing
- 🧘 **11 meditation sessions** in Georgian with public audio (Pixabay)
- 💨 **Animated breathing coach** with countdown (4→3→2→1) and 4-7-8 technique
- 📚 **Library** — save your favorite sessions
- 😴 **Sleep** — sleep timer, stories, ambient sounds (rain, ocean, forest, fireplace)
- 🔍 **Discover** — search, quick links, recommendations
- 👤 **Profile** — stats tracking (mindful days, minutes, sessions, courses)
- 🎵 **Audio playback** with expo-av (loop, pause, skip ±15s)

---

## 🏗️ Architecture

```
┌──────────────────────────┐          ┌──────────────────────────┐
│  Expo React Native App   │   HTTPS  │   FastAPI Backend        │
│  (iOS / Android / Web)   │◄────────►│   (Python 3.11+)         │
│                          │  JWT     │                          │
│  - expo-router           │  Bearer  │  - JWT auth (PyJWT)      │
│  - AsyncStorage (token)  │          │  - bcrypt password hash  │
│  - axios client          │          │  - Pydantic models       │
│  - expo-av (audio)       │          │  - CORS middleware       │
└──────────────────────────┘          └────────────┬─────────────┘
                                                   │ motor (async)
                                                   ▼
                                      ┌──────────────────────────┐
                                      │   MongoDB                │
                                      │   - users collection     │
                                      │   (saved_sessions,       │
                                      │    history embedded)     │
                                      └──────────────────────────┘
```

---

## 📁 Project Structure

```
.
├── backend/
│   ├── server.py              # FastAPI app, auth, sessions, stats
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # MONGO_URL, DB_NAME, JWT_SECRET, ADMIN_*
│
├── frontend/
│   ├── app/                   # Expo Router (file-based routing)
│   │   ├── _layout.tsx        # Root layout + auth guard
│   │   ├── index.tsx          # Redirect to (tabs)
│   │   ├── (auth)/
│   │   │   ├── _layout.tsx
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx    # Bottom tab nav (5 tabs)
│   │   │   ├── index.tsx      # Home (მედიტაცია)
│   │   │   ├── library.tsx    # ბიბლიოთეკა
│   │   │   ├── sleep.tsx      # ძილი
│   │   │   ├── discover.tsx   # აღმოაჩინე
│   │   │   └── profile.tsx    # პროფილი
│   │   └── player.tsx         # Modal player w/ breath animation
│   │
│   ├── src/
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   ├── services/
│   │   │   └── api.ts         # axios instance + token interceptor
│   │   └── theme.ts           # Dark-blue design tokens
│   │
│   ├── package.json
│   ├── app.json               # Expo config
│   ├── tsconfig.json
│   └── .env                   # EXPO_PUBLIC_BACKEND_URL
│
├── README.md                  # This file
└── .gitignore
```

---

## 🚀 Local Setup

### Prerequisites
- **Node.js** ≥ 20 and **Yarn**
- **Python** 3.11+
- **MongoDB** running locally on `27017` (or a remote Atlas URI)
- **Expo Go** app on your phone (optional, for device testing)

### 1. Clone
```bash
git clone <your-repo-url>
cd <repo>
```

### 2. Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Create .env
cat > .env <<EOF
MONGO_URL="mongodb://localhost:27017"
DB_NAME="mindful_db"
JWT_SECRET="$(python -c 'import secrets;print(secrets.token_hex(32))')"
ADMIN_EMAIL="test@test.com"
ADMIN_PASSWORD="test123"
EOF

# Run
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Backend runs on `http://localhost:8001` — all routes prefixed with `/api`.

### 3. Frontend (Expo)
```bash
cd frontend
yarn install

# Create .env
cat > .env <<EOF
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
EOF

# Run
yarn start            # then press w (web), i (iOS), or a (Android)
# or
yarn web
yarn ios
yarn android
```

---

## 🔑 Test Credentials (auto-seeded)

| Email            | Password   |
|------------------|------------|
| `test@test.com`  | `test123`  |

Seeded on first backend startup. You can also register a new account via the Register screen.

---

## 🔌 API Reference

All endpoints are prefixed with `/api`.

### Auth
| Method | Endpoint              | Body                          | Auth   |
|--------|-----------------------|-------------------------------|--------|
| POST   | `/api/auth/register`  | `{email, password, name}`     | ❌     |
| POST   | `/api/auth/login`     | `{email, password}`           | ❌     |
| GET    | `/api/auth/me`        | —                             | ✅     |

Response for register/login:
```json
{
  "user": { "id": "...", "email": "...", "name": "...", "created_at": "..." },
  "token": "<jwt-access-token>"
}
```

### Sessions
| Method | Endpoint                     | Description                             | Auth |
|--------|------------------------------|-----------------------------------------|------|
| GET    | `/api/sessions`              | List all 11 sessions (`?category=...`)  | ❌   |
| GET    | `/api/sessions/{id}`         | Session detail + instructions + audio   | ❌   |
| GET    | `/api/discover`              | Quick links + recs + featured           | ❌   |
| POST   | `/api/sessions/complete`     | `{session_id, duration_minutes}`        | ✅   |
| POST   | `/api/sessions/toggle_saved` | `{session_id}` → `{saved: bool}`        | ✅   |

### User
| Method | Endpoint          | Description                                                | Auth |
|--------|-------------------|------------------------------------------------------------|------|
| GET    | `/api/user/saved` | `{sessions[], count, total_minutes}`                       | ✅   |
| GET    | `/api/user/stats` | `{mindful_days, mindful_minutes, total_sessions, ...}`     | ✅   |

Send `Authorization: Bearer <token>` for authenticated routes.

---

## 🗄️ Data Model

### `users` collection
```js
{
  id: "<uuid>",               // string UUID (we don't expose _id)
  email: "user@example.com",  // unique index
  name: "Username",
  password_hash: "<bcrypt>",
  created_at: "<iso>",
  saved_sessions: ["session-id-1", ...],
  history: [
    { session_id: "...", duration_minutes: 10, completed_at: "<iso>" }
  ]
}
```

Sessions themselves are **seed data** inside `backend/server.py` (`SESSIONS` array) — no DB table needed. Easy to extend by adding new objects with `id`, `title`, `duration_min`, `audio_url`, `instructions[]`, etc.

---

## 🎨 Design System (`frontend/src/theme.ts`)

```ts
colors:   bg #0B1A2C  bgDeep #081525  card #142B44  accent #1FA7BF
radius:   sm 10  md 14  lg 18  xl 24  pill 999
spacing:  xs 4  sm 8  md 12  lg 16  xl 24  xxl 32
```

Fully dark blue aesthetic inspired by night-sky meditation apps. Icons from `@expo/vector-icons` (Ionicons, MaterialCommunityIcons, FontAwesome5).

---

## 🧪 Testing

### Backend
```bash
cd backend
pytest tests/backend_test.py -v
```
Covers auth, sessions CRUD, discover, saved toggle, stats, session completion.

### Frontend
```bash
cd frontend
yarn lint
```

---

## 🛠️ Tech Stack

| Layer     | Tech                                                                    |
|-----------|-------------------------------------------------------------------------|
| Mobile    | Expo SDK 54, React Native 0.81, expo-router 6, TypeScript               |
| State     | React Context (AuthContext)                                             |
| Storage   | `@react-native-async-storage/async-storage` (JWT token)                 |
| HTTP      | `axios` with request interceptor                                        |
| Audio     | `expo-av` (will migrate to `expo-audio` in future)                      |
| Animation | `react-native-reanimated`, `Animated` API                               |
| Backend   | FastAPI, Uvicorn, Motor (async Mongo), PyJWT, bcrypt, Pydantic          |
| Database  | MongoDB 6+                                                              |

---

## 🚢 Deployment

### Backend (Render / Fly.io / Railway)
1. Push repo to GitHub
2. Set env vars: `MONGO_URL` (Atlas URI), `DB_NAME`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
3. Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`

### Frontend (Expo EAS)
```bash
cd frontend
npx eas-cli build --platform ios
npx eas-cli build --platform android
```
Set `EXPO_PUBLIC_BACKEND_URL` to your deployed backend URL before building.

For a **web build**:
```bash
yarn expo export --platform web
# deploy /dist folder to Vercel / Netlify / Cloudflare Pages
```

---

## 📝 License

MIT — do whatever you want, attribution appreciated.

---

## 🙏 Credits

- Audio: [Pixabay](https://pixabay.com/music/) (CC0)
- Icons: [@expo/vector-icons](https://icons.expo.fyi)
- Built with ❤️ for the Georgian mindfulness community
