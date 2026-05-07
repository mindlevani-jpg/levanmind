from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import bcrypt
import jwt
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest, CheckoutSessionResponse, CheckoutStatusResponse,
)


# ---------------------------------------------------------------------------
# DB setup
# ---------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionInput(BaseModel):
    session_id: str


class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    is_premium: bool = False
    created_at: str


class AuthResponse(BaseModel):
    user: UserPublic
    token: str


class SessionCompleteInput(BaseModel):
    session_id: str
    duration_minutes: int


class ToggleSavedInput(BaseModel):
    session_id: str


class MoodInput(BaseModel):
    mood: str  # great | good | ok | low | bad
    note: Optional[str] = None


class JournalInput(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    mood: Optional[str] = None


# ---------------------------------------------------------------------------
# Sessions seed data — 32 sessions
# ---------------------------------------------------------------------------
def s(id, title, category, category_label, dur, desc, audio, instr, color="#1FA7BF"):
    return {
        "id": id, "title": title, "category": category, "category_label": category_label,
        "duration_min": dur, "description": desc, "color": color, "audio_url": audio,
        "instructions": instr,
    }

PIX = "https://cdn.pixabay.com/download/audio/"

SESSIONS = [
    # Meditation
    s("morning-meditation", "დილის მედიტაცია", "meditation", "მედიტაცია", 10,
      "დაიწყე დღე სიმშვიდითა და ფოკუსით",
      f"{PIX}2022/03/15/audio_1c7a7f2bd7.mp3",
      ["მოხერხებულად დაჯექი და თვალები დახუჭე.",
       "ღრმად ჩაისუნთქე ცხვირით 4 წამი.",
       "შეინარჩუნე სუნთქვა 4 წამი.",
       "ნელა ამოისუნთქე პირით 6 წამი."]),
    s("evening-meditation", "საღამოს მედიტაცია", "meditation", "მედიტაცია", 12,
      "დღის ბოლოში გონების გასუფთავება",
      f"{PIX}2022/10/30/audio_347111d654.mp3",
      ["დაუშვი დღევანდელი ფიქრები.", "ფოკუსირდი სუნთქვაზე.", "მიეცი თავი მოდუნებას."]),
    s("loving-kindness", "სიყვარულის მედიტაცია", "meditation", "მედიტაცია", 15,
      "გაიზარდე სითბო და თანაგრძნობა",
      f"{PIX}2022/03/10/audio_2dde668ca0.mp3",
      ["ჩაისუნთქე ღრმად.", "გაუგზავნე სიყვარული საკუთარ თავს.", "შემდეგ — ახლობლებს, ბოლოს — ყველას."]),
    s("gratitude", "მადლიერების პრაქტიკა", "meditation", "მედიტაცია", 8,
      "გახსოვდეს რის გამო ხარ მადლიერი",
      f"{PIX}2023/06/17/audio_03d3bf1392.mp3",
      ["დაფიქრდი 3 რამეზე რის გამო ხარ მადლიერი.", "გრძნობდე თითოეულს სხეულში.", "ღიმილით დაასრულე."]),
    s("self-awareness", "თვითშეცნობა", "meditation", "მედიტაცია", 20,
      "ღრმა თვითშეცნობის სავარჯიშო",
      f"{PIX}2022/03/15/audio_1c7a7f2bd7.mp3",
      ["დააკვირდი აზრებს განსჯის გარეშე.", "შენიშნე ემოციები.", "მიიღე ისინი როგორც ღრუბლები ცაში."]),
    s("body-scan", "სხეულის სკანირება", "meditation", "მედიტაცია", 18,
      "სხეულის ნაწილების მოდუნება",
      f"{PIX}2022/03/10/audio_2dde668ca0.mp3",
      ["დაიწყე ფეხებიდან.", "ნელ-ნელა მოახდინე ფოკუსის გადატანა ყოველ ნაწილზე.", "ჩაისუნთქე და ამოისუნთქე ყოველი ზონისთვის."]),
    s("walking-meditation", "მოსიარულე მედიტაცია", "meditation", "მედიტაცია", 15,
      "მედიტაცია მოძრაობაში",
      f"{PIX}2022/11/22/audio_febc508a42.mp3",
      ["ნელ-ნელა გაიარე.", "შენიშნე ფეხის შეხება მიწასთან.", "გრძნობდე ჰაერის მოძრაობას."]),
    s("mindful-eating", "გონებისმიერი ჭამა", "meditation", "მედიტაცია", 7,
      "გრძნობდე ყოველ ლუკმას",
      f"{PIX}2022/03/15/audio_1c7a7f2bd7.mp3",
      ["აიღე საჭმელი მცირედ.", "გრძნობდე ფერს, სუნს, ტექსტურას.", "დაღეჭე ნელა და გონებითად."]),

    # Stress / Focus
    s("stress-relief", "სტრესის შემსუბუქება (4-7-8)", "stress", "სტრესი", 5,
      "სწრაფი ხერხი სტრესის მოსახსნელად",
      f"{PIX}2023/06/17/audio_03d3bf1392.mp3",
      ["ჩაისუნთქე ცხვირით 4 წამი.",
       "შეინარჩუნე სუნთქვა 7 წამი.",
       "ამოისუნთქე პირით 8 წამი.",
       "გაიმეორე ოთხჯერ."]),
    s("anxiety-relief", "შფოთვის შემსუბუქება", "stress", "სტრესი", 10,
      "დაიმშვიდე ნერვული სისტემა",
      f"{PIX}2022/05/27/audio_1808fbf07a.mp3",
      ["იპოვე 5 რამე რასაც ხედავ.", "4 რასაც ისმენ.", "3 რასაც გრძნობ.", "2 რის სუნი იცი.", "1 რის გემო იცი."]),
    s("focus-concentration", "ფოკუსირება", "focus", "კონცენტრაცია", 8,
      "გამოიმუშავე კონცენტრაცია",
      f"{PIX}2022/03/10/audio_2dde668ca0.mp3",
      ["აირჩიე ერთი ობიექტი ან სუნთქვა.",
       "ყურადღება შეინარჩუნე მასზე.",
       "თუ გონება გადაიხრა - ნაზად დააბრუნე."]),
    s("deep-work", "ღრმა სამუშაო", "focus", "კონცენტრაცია", 25,
      "Deep work რეჟიმისთვის",
      f"{PIX}2023/05/24/audio_78a87e8f42.mp3",
      ["გათიშე შეფერხებები.", "ჩართე ფოკუსირებული რეჟიმი.", "მუშაობდე 25 წუთი ერთ ამოცანაზე."]),
    s("breathing-box", "ბოქს სუნთქვა", "stress", "სუნთქვა", 5,
      "4-4-4-4 ბოქს ტექნიკა",
      f"{PIX}2022/03/15/audio_1c7a7f2bd7.mp3",
      ["ჩაისუნთქე 4 წამი.", "შეინარჩუნე 4 წამი.", "ამოისუნთქე 4 წამი.", "შეიკავე 4 წამი."]),

    # Sleep
    s("night-relax", "ღამის რელაქსაცია", "sleep", "ძილი", 15,
      "მოიშორე დღის დაძაბულობა",
      f"{PIX}2022/10/30/audio_347111d654.mp3",
      ["დაწექი კომფორტულად.", "დაუშვი სხეული რელაქსაციისკენ.", "გრძელი, ნელი სუნთქვა."]),
    s("night-sky", "ღამის ცა", "sleep", "ძილი", 25,
      "ვარსკვლავიანი ცის ვიზუალიზაცია",
      f"{PIX}2022/11/17/audio_dcd97f32a0.mp3",
      ["დაწექი და შეხედე ცას გონებით.", "წარმოიდგინე ვარსკვლავები.", "დაუშვი ღამის სიმშვიდე."]),
    s("sleep-story-forest", "ძილის ამბავი: ტყე", "sleep", "ძილი", 30,
      "ნაზი ამბავი ტყის სიმშვიდეზე",
      f"{PIX}2022/03/09/audio_c8c8a73467.mp3",
      ["წარმოიდგინე უძრავი ტყე.", "სუნთქე ნელა.", "მიიყვანე გონება ხეებთან."]),
    s("sleep-story-ocean", "ძილის ამბავი: ოკეანე", "sleep", "ძილი", 25,
      "უსასრულო ოკეანის ხმა",
      f"{PIX}2021/09/06/audio_37ee1d4f6b.mp3",
      ["იყავი ნაპირზე.", "ისმინე ტალღების ხმა.", "ყოველი ტალღა მოდუნებაა."]),
    s("deep-sleep", "ღრმა ძილი", "sleep", "ძილი", 45,
      "მოდუნება ღრმა ძილისთვის",
      f"{PIX}2022/05/27/audio_1808fbf07a.mp3",
      ["სუნთქე ნელა.", "დაუშვი თითოეული კუნთი.", "მისდევდე გრძელ ამოსუნთქვებს."]),

    # Nature sounds
    s("forest-sounds", "ტყის ხმები", "sounds", "ბუნება", 30,
      "ტყის სიმშვიდე და ფრინველები",
      f"{PIX}2022/03/09/audio_c8c8a73467.mp3",
      ["დახუჭე თვალები.", "მოუსმინე ფრინველთა ხმას."]),
    s("ocean-waves", "ზღვის ტალღები", "sounds", "ბუნება", 45,
      "ზღვის ტალღების რიტმული ხმა",
      f"{PIX}2021/09/06/audio_37ee1d4f6b.mp3",
      ["კომფორტულად განთავსდი.", "სუნთქე ტალღების ტემპთან."]),
    s("rain-sounds", "წვიმის ხმა", "sounds", "ბუნება", 60,
      "დამამშვიდებელი წვიმა",
      f"{PIX}2022/05/27/audio_1808fbf07a.mp3",
      ["იგრძენი წვიმის სიმშვიდე.", "დაუშვი აზრები გაცურდნენ."]),
    s("thunderstorm", "ჭექა-ქუხილი", "sounds", "ბუნება", 50,
      "ძლიერი ჭექა-ქუხილის ხმა",
      f"{PIX}2022/05/27/audio_1808fbf07a.mp3",
      ["კომფორტული ადგილი იპოვე.", "მოუსმინე ჭექა-ქუხილის ძალას."]),
    s("wind", "ქარის ხმა", "sounds", "ბუნება", 40,
      "მსუბუქი ქარის შრიალი",
      f"{PIX}2023/05/24/audio_78a87e8f42.mp3",
      ["წარმოიდგინე გორაკები.", "იგრძენი ქარის შეხება."]),
    s("river-stream", "მდინარის ჩახჩახი", "sounds", "ბუნება", 35,
      "მდინარის წყნარი დინება",
      f"{PIX}2021/09/06/audio_37ee1d4f6b.mp3",
      ["წარმოიდგინე მდინარე.", "ისმინე წყლის მუსიკა."]),
    s("birds", "ფრინველები", "sounds", "ბუნება", 20,
      "დილის ფრინველების ჟღურტული",
      f"{PIX}2022/11/22/audio_febc508a42.mp3",
      ["მოდუნდი.", "მოუსმინე ფრინველთა ხმას."]),
    s("crickets", "ჭრიჭინები ღამე", "sounds", "ბუნება", 60,
      "საღამოს ჭრიჭინების ხმა",
      f"{PIX}2022/11/22/audio_febc508a42.mp3",
      ["დაუშვი ღამის ხმები.", "სუნთქე მათთან ერთად."]),
    s("fireplace", "ბუხრის ხმა", "sounds", "ბუნება", 45,
      "ბუხრის მყუდრო ხრიალი",
      f"{PIX}2022/10/18/audio_e10db13891.mp3",
      ["წარმოიდგინე თბილი ოთახი.", "დაუშვი სითბო გადმოიღვაროს."]),
    s("white-noise", "თეთრი ხმაური", "sounds", "ბუნება", 60,
      "ფოკუსისა და ძილისთვის",
      f"{PIX}2023/05/24/audio_78a87e8f42.mp3",
      ["ჩართე თეთრი ხმაური ფონად.", "მიეცი ფოკუსს."]),
    s("brown-noise", "ყავისფერი ხმაური", "sounds", "ბუნება", 60,
      "ღრმა ყავისფერი ხმაური ფოკუსისთვის",
      f"{PIX}2023/05/24/audio_78a87e8f42.mp3",
      ["ჩართე ღრმა ხმაური.", "ის ფარავს გარეშე ხმებს."]),
    s("cafe-ambience", "კაფე ატმოსფერო", "sounds", "ბუნება", 50,
      "კაფეს ფონური ხმა მუშაობისთვის",
      f"{PIX}2023/05/24/audio_78a87e8f42.mp3",
      ["წარმოიდგინე საყვარელი კაფე.", "მოუსმინე ფონს."]),
    s("tibetan-bowl", "ტიბეტური თასი", "sounds", "ბუნება", 20,
      "ტიბეტური სიმღერის თასი",
      f"{PIX}2022/03/15/audio_1c7a7f2bd7.mp3",
      ["გრძნობდე ვიბრაციას.", "დაუშვი მსოფლიო რეზონანსი."]),
    s("om-chant", "ომ მანტრა", "sounds", "ბუნება", 15,
      "ომ მანტრის გამეორება",
      f"{PIX}2022/03/10/audio_2dde668ca0.mp3",
      ["გაიმეორე 'ომ' წყნარად.", "გრძნობდე ხმის ვიბრაციას."]),
]


DISCOVER_QUICK_LINKS = [
    {"id": "sleep-stories", "title": "ძილის ამბები", "icon": "moon", "category": "sleep"},
    {"id": "for-work", "title": "სამუშაოსთვის", "icon": "briefcase", "category": "focus"},
    {"id": "sounds", "title": "ხმები", "icon": "music", "category": "sounds"},
]

DISCOVER_RECOMMENDATIONS = [
    {"id": "stress-test", "title": "სტრესის ტესტი", "subtitle": "10 მარტივი კითხვა", "icon": "help"},
    {"id": "breathing-relax", "title": "სუნთქვის რელაქსაცია", "subtitle": "2 წუთი", "icon": "wind"},
]


# ---------------------------------------------------------------------------
# Achievements logic
# ---------------------------------------------------------------------------
ACHIEVEMENTS = [
    {"id": "first-step", "title": "პირველი ნაბიჯი", "desc": "დაასრულე პირველი სესია", "icon": "rocket-outline", "threshold_sessions": 1},
    {"id": "early-bird", "title": "დილის ფრინველი", "desc": "5 დილის სესია", "icon": "sunny-outline", "threshold_sessions": 5},
    {"id": "consistent", "title": "მტკიცედ", "desc": "3 დღიანი სერია", "icon": "flame-outline", "threshold_streak": 3},
    {"id": "weekly-warrior", "title": "კვირეული მებრძოლი", "desc": "7 დღიანი სერია", "icon": "trophy-outline", "threshold_streak": 7},
    {"id": "month-master", "title": "თვის ოსტატი", "desc": "30 დღიანი სერია", "icon": "medal-outline", "threshold_streak": 30},
    {"id": "century", "title": "ასი", "desc": "100 დასრულებული სესია", "icon": "star-outline", "threshold_sessions": 100},
    {"id": "hour-zen", "title": "Zen საათი", "desc": "60 წუთი სულ", "icon": "time-outline", "threshold_minutes": 60},
    {"id": "deep-diver", "title": "ღრმად ჩაყვინთული", "desc": "500 წუთი სულ", "icon": "infinite-outline", "threshold_minutes": 500},
    {"id": "explorer", "title": "მკვლევარი", "desc": "10 სხვადასხვა სესია", "icon": "compass-outline", "threshold_unique": 10},
]


def calculate_streak(history: list) -> int:
    if not history:
        return 0
    days = sorted({h.get("completed_at", "")[:10] for h in history if h.get("completed_at")}, reverse=True)
    if not days:
        return 0
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yest = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    if days[0] not in (today, yest):
        return 0
    streak = 1
    for i in range(1, len(days)):
        prev = datetime.strptime(days[i - 1], "%Y-%m-%d")
        cur = datetime.strptime(days[i], "%Y-%m-%d")
        if (prev - cur).days == 1:
            streak += 1
        else:
            break
    return streak


def compute_achievements(history: list, streak: int) -> list:
    total_sessions = len(history)
    total_minutes = sum(h.get("duration_minutes", 0) for h in history)
    unique = len({h.get("session_id") for h in history})
    earned = []
    for a in ACHIEVEMENTS:
        ok = (
            (a.get("threshold_sessions") and total_sessions >= a["threshold_sessions"]) or
            (a.get("threshold_minutes") and total_minutes >= a["threshold_minutes"]) or
            (a.get("threshold_streak") and streak >= a["threshold_streak"]) or
            (a.get("threshold_unique") and unique >= a["threshold_unique"])
        )
        earned.append({**a, "earned": bool(ok)})
    return earned


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
def user_to_public(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u["name"],
        "picture": u.get("picture"),
        "is_premium": bool(u.get("is_premium", False)),
        "created_at": u["created_at"] if isinstance(u["created_at"], str) else u["created_at"].isoformat(),
    }


@api_router.post("/auth/register", response_model=AuthResponse)
async def register(data: RegisterInput):
    email = data.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="ამ ელფოსტით უკვე არის დარეგისტრირებული")
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": user_id, "email": email, "name": data.name.strip(),
        "password_hash": hash_password(data.password), "created_at": now,
        "saved_sessions": [], "history": [], "moods": [], "journal": [],
        "preferences": {"theme": "dark"}, "provider": "email",
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email)
    return {"user": user_to_public(doc), "token": token}


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(data: LoginInput):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="არასწორი ელფოსტა ან პაროლი")
    token = create_access_token(user["id"], email)
    return {"user": user_to_public(user), "token": token}


@api_router.post("/auth/google", response_model=AuthResponse)
async def google_session(data: GoogleSessionInput):
    """Exchange Emergent Auth session_id for our JWT token."""
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    async with httpx.AsyncClient(timeout=10.0) as http:
        try:
            r = await http.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": data.session_id},
            )
        except Exception:
            raise HTTPException(status_code=502, detail="Auth provider unavailable")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google session")
    info = r.json()
    email = (info.get("email") or "").lower().strip()
    name = info.get("name") or "Google User"
    picture = info.get("picture")
    if not email:
        raise HTTPException(status_code=400, detail="Email missing from Google profile")

    existing = await db.users.find_one({"email": email})
    if existing:
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture, "provider": existing.get("provider", "google")}},
        )
        existing = await db.users.find_one({"email": email}, {"_id": 0})
        token = create_access_token(existing["id"], email)
        return {"user": user_to_public(existing), "token": token}

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": user_id, "email": email, "name": name, "picture": picture,
        "password_hash": None, "created_at": now,
        "saved_sessions": [], "history": [], "moods": [], "journal": [],
        "preferences": {"theme": "dark"}, "provider": "google",
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email)
    return {"user": user_to_public(doc), "token": token}


@api_router.get("/auth/me", response_model=UserPublic)
async def me(current_user: dict = Depends(get_current_user)):
    return user_to_public(current_user)


# ---------------------------------------------------------------------------
# App data routes
# ---------------------------------------------------------------------------
@api_router.get("/sessions")
async def list_sessions(category: Optional[str] = None):
    if category:
        return [s for s in SESSIONS if s["category"] == category]
    return SESSIONS


@api_router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    for s in SESSIONS:
        if s["id"] == session_id:
            return s
    raise HTTPException(status_code=404, detail="სესია ვერ მოიძებნა")


@api_router.get("/discover")
async def discover():
    return {
        "quick_links": DISCOVER_QUICK_LINKS,
        "recommendations": DISCOVER_RECOMMENDATIONS,
        "new_and_featured": SESSIONS[:8],
    }


@api_router.post("/sessions/complete")
async def complete_session(data: SessionCompleteInput, current_user: dict = Depends(get_current_user)):
    entry = {
        "session_id": data.session_id, "duration_minutes": data.duration_minutes,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.update_one({"id": current_user["id"]}, {"$push": {"history": entry}})
    return {"ok": True}


@api_router.post("/sessions/toggle_saved")
async def toggle_saved(data: ToggleSavedInput, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "saved_sessions": 1})
    saved = user.get("saved_sessions", [])
    if data.session_id in saved:
        await db.users.update_one({"id": current_user["id"]}, {"$pull": {"saved_sessions": data.session_id}})
        return {"saved": False}
    await db.users.update_one({"id": current_user["id"]}, {"$addToSet": {"saved_sessions": data.session_id}})
    return {"saved": True}


@api_router.get("/user/saved")
async def get_saved(current_user: dict = Depends(get_current_user)):
    saved_ids = current_user.get("saved_sessions", [])
    items = [s for s in SESSIONS if s["id"] in saved_ids]
    total_minutes = sum(s["duration_min"] for s in items)
    return {"sessions": items, "count": len(items), "total_minutes": total_minutes}


@api_router.get("/user/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    history = current_user.get("history", [])
    total_minutes = sum(h.get("duration_minutes", 0) for h in history)
    unique_days = len({h.get("completed_at", "")[:10] for h in history if h.get("completed_at")})
    streak = calculate_streak(history)
    achievements = compute_achievements(history, streak)
    earned_count = sum(1 for a in achievements if a["earned"])
    return {
        "mindful_days": unique_days,
        "mindful_minutes": total_minutes,
        "total_sessions": len(history),
        "total_courses": len({h.get("session_id") for h in history}),
        "streak": streak,
        "achievements": achievements,
        "achievements_earned": earned_count,
        "achievements_total": len(ACHIEVEMENTS),
        "history": history[-30:][::-1],
    }


# ---------------------------------------------------------------------------
# Mood + Journal
# ---------------------------------------------------------------------------
@api_router.post("/user/mood")
async def add_mood(data: MoodInput, current_user: dict = Depends(get_current_user)):
    entry = {"mood": data.mood, "note": data.note, "at": datetime.now(timezone.utc).isoformat()}
    await db.users.update_one({"id": current_user["id"]}, {"$push": {"moods": entry}})
    return {"ok": True, "mood": entry}


@api_router.get("/user/mood")
async def get_moods(current_user: dict = Depends(get_current_user)):
    moods = current_user.get("moods", [])
    return {"moods": moods[-30:][::-1], "today": next((m for m in reversed(moods) if m["at"][:10] == datetime.now(timezone.utc).strftime("%Y-%m-%d")), None)}


@api_router.post("/user/journal")
async def add_journal(data: JournalInput, current_user: dict = Depends(get_current_user)):
    entry = {
        "id": str(uuid.uuid4()), "text": data.text, "mood": data.mood,
        "at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.update_one({"id": current_user["id"]}, {"$push": {"journal": entry}})
    return entry


@api_router.get("/user/journal")
async def get_journal(current_user: dict = Depends(get_current_user)):
    entries = current_user.get("journal", [])
    return {"entries": entries[::-1]}


# ---------------------------------------------------------------------------
# Preferences (theme)
# ---------------------------------------------------------------------------
class ThemeInput(BaseModel):
    theme: str  # "dark" | "light"

@api_router.post("/user/theme")
async def set_theme(data: ThemeInput, current_user: dict = Depends(get_current_user)):
    if data.theme not in ("dark", "light"):
        raise HTTPException(status_code=400, detail="Invalid theme")
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"preferences.theme": data.theme}})
    return {"theme": data.theme}


# ---------------------------------------------------------------------------
# Stripe Checkout (premium upgrade)
# ---------------------------------------------------------------------------
# Server-defined fixed packages — never trust client amount
PACKAGES = {
    "premium-lifetime": {"amount": 6.99, "currency": "gel", "label": "Premium Lifetime", "grants": "premium"},
}


class CheckoutCreateInput(BaseModel):
    package_id: str
    origin_url: str  # frontend origin for success/cancel URLs
    metadata: Optional[dict] = None


@api_router.post("/payments/checkout/session")
async def create_checkout(data: CheckoutCreateInput, current_user: dict = Depends(get_current_user)):
    if data.package_id not in PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    pkg = PACKAGES[data.package_id]
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    origin = data.origin_url.rstrip("/")
    success_url = f"{origin}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/(tabs)"

    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=f"{origin}/api/webhook/stripe")
    metadata = {
        "user_id": current_user["id"],
        "user_email": current_user["email"],
        "package_id": data.package_id,
        "grants": pkg["grants"],
        **(data.metadata or {}),
    }
    req = CheckoutSessionRequest(
        amount=float(pkg["amount"]),
        currency=pkg["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(req)

    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": current_user["id"],
        "user_email": current_user["email"],
        "package_id": data.package_id,
        "amount": float(pkg["amount"]),
        "currency": pkg["currency"],
        "metadata": metadata,
        "status": "initiated",
        "payment_status": "unpaid",
        "grants_applied": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": session.url, "session_id": session.session_id}


@api_router.get("/payments/checkout/status/{session_id}")
async def checkout_status(session_id: str, current_user: dict = Depends(get_current_user)):
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)

    new_doc = {
        "status": status.status,
        "payment_status": status.payment_status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    # Idempotent: only grant once
    if status.payment_status == "paid" and not tx.get("grants_applied"):
        grants = tx.get("metadata", {}).get("grants")
        if grants == "premium":
            await db.users.update_one(
                {"id": tx["user_id"]},
                {"$set": {"is_premium": True, "premium_since": datetime.now(timezone.utc).isoformat()}},
            )
        new_doc["grants_applied"] = True
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": new_doc})

    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
        "metadata": status.metadata,
    }


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
        event = await stripe_checkout.handle_webhook(body, sig)
    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook")
    if event.payment_status == "paid":
        tx = await db.payment_transactions.find_one({"session_id": event.session_id})
        if tx and not tx.get("grants_applied"):
            grants = (tx.get("metadata") or {}).get("grants")
            if grants == "premium":
                await db.users.update_one(
                    {"id": tx["user_id"]},
                    {"$set": {"is_premium": True, "premium_since": datetime.now(timezone.utc).isoformat()}},
                )
            await db.payment_transactions.update_one(
                {"session_id": event.session_id},
                {"$set": {
                    "status": "complete",
                    "payment_status": "paid",
                    "grants_applied": True,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
    return {"received": True}


@api_router.get("/payments/packages")
async def list_packages():
    return PACKAGES


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    admin_email = os.environ.get("ADMIN_EMAIL", "test@test.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "test123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": admin_email,
            "name": "ტესტ მომხმარებელი",
            "password_hash": hash_password(admin_password),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "saved_sessions": [], "history": [], "moods": [], "journal": [],
            "preferences": {"theme": "dark"}, "provider": "email",
        })
    elif not verify_password(admin_password, existing.get("password_hash") or ""):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
