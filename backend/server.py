from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# DB setup
# ---------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days (mobile-friendly)


# ---------------------------------------------------------------------------
# Password / JWT helpers
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


class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    created_at: str


class AuthResponse(BaseModel):
    user: UserPublic
    token: str


class SessionCompleteInput(BaseModel):
    session_id: str
    duration_minutes: int


class ToggleSavedInput(BaseModel):
    session_id: str


# ---------------------------------------------------------------------------
# Seed data: meditation sessions
# ---------------------------------------------------------------------------
SESSIONS = [
    {
        "id": "morning-meditation",
        "title": "დილის მედიტაცია",
        "category": "meditation",
        "category_label": "მედიტაცია",
        "duration_min": 10,
        "description": "დაიწყე დღე სიმშვიდითა და ფოკუსით",
        "icon": "meditation",
        "color": "#1FA7BF",
        "audio_url": "https://cdn.pixabay.com/download/audio/2022/03/15/audio_1c7a7f2bd7.mp3",
        "instructions": [
            "მოხერხებულად დაჯექი და თვალები დახუჭე.",
            "ღრმად ჩაისუნთქე ცხვირით 4 წამი.",
            "შეინარჩუნე სუნთქვა 4 წამი.",
            "ნელა ამოისუნთქე პირით 6 წამი.",
            "გრძნობ, თუ როგორ ხდები მშვიდი.",
        ],
    },
    {
        "id": "night-relax",
        "title": "ღამის რელაქსაცია",
        "category": "sleep",
        "category_label": "ძილი",
        "duration_min": 15,
        "description": "მოიშორე დღის დაძაბულობა",
        "icon": "moon",
        "color": "#4B6FA5",
        "audio_url": "https://cdn.pixabay.com/download/audio/2022/10/30/audio_347111d654.mp3",
        "instructions": [
            "დაწექი კომფორტულად.",
            "დაუშვი სხეული რელაქსაციისკენ.",
            "გრძელი, ნელი სუნთქვა.",
            "ყოველი ამოსუნთქვისას იგრძენი სიმშვიდე.",
            "მიაყოლე გონება ტალღების ხმას.",
        ],
    },
    {
        "id": "stress-relief",
        "title": "სტრესის შემსუბუქება",
        "category": "stress",
        "category_label": "სტრესი",
        "duration_min": 5,
        "description": "სწრაფი ხერხი სტრესის მოსახსნელად",
        "icon": "brain",
        "color": "#5E8DBA",
        "audio_url": "https://cdn.pixabay.com/download/audio/2023/06/17/audio_03d3bf1392.mp3",
        "instructions": [
            "გაჩერდი და ყურადღება მიაქციე სუნთქვას.",
            "ჩაისუნთქე 4 წამი, შეინარჩუნე 7, ამოისუნთქე 8.",
            "გაიმეორე ოთხჯერ.",
            "დაუშვი აზრები ნელა განვლონ.",
        ],
    },
    {
        "id": "focus-concentration",
        "title": "ფოკუსირება",
        "category": "focus",
        "category_label": "კონცენტრაცია",
        "duration_min": 8,
        "description": "გამოიმუშავე კონცენტრაციის უნარი",
        "icon": "target",
        "color": "#2E86AB",
        "audio_url": "https://cdn.pixabay.com/download/audio/2022/03/10/audio_2dde668ca0.mp3",
        "instructions": [
            "დაჯექი გამართულ მდგომარეობაში.",
            "აირჩიე ერთი ობიექტი ან სუნთქვა.",
            "ყურადღება შეინარჩუნე მასზე.",
            "თუ გონება გადაიხრა - ნაზად დააბრუნე.",
        ],
    },
    {
        "id": "forest-sounds",
        "title": "ტყის ხმები",
        "category": "sounds",
        "category_label": "ბუნება",
        "duration_min": 30,
        "description": "ტყის სიმშვიდე და ფრინველები",
        "icon": "leaf",
        "color": "#3D8B5C",
        "audio_url": "https://cdn.pixabay.com/download/audio/2022/03/09/audio_c8c8a73467.mp3",
        "instructions": [
            "დახუჭე თვალები.",
            "წარმოიდგინე ტყე შენს გარშემო.",
            "უსმინე ფრინველთა ჟღურტულს.",
            "დაუშვი გონებას დაისვენოს.",
        ],
    },
    {
        "id": "ocean-waves",
        "title": "ზღვის ტალღები",
        "category": "sounds",
        "category_label": "ბუნება",
        "duration_min": 45,
        "description": "ზღვის ტალღების რიტმული ხმა",
        "icon": "water",
        "color": "#1E6091",
        "audio_url": "https://cdn.pixabay.com/download/audio/2021/09/06/audio_37ee1d4f6b.mp3",
        "instructions": [
            "კომფორტულად განთავსდი.",
            "მოუსმინე ტალღების რიტმს.",
            "სუნთქე ტალღების ტემპთან ერთად.",
        ],
    },
    {
        "id": "rain-sounds",
        "title": "წვიმის ხმა",
        "category": "sounds",
        "category_label": "ბუნება",
        "duration_min": 60,
        "description": "დამამშვიდებელი წვიმის ხმა",
        "icon": "rain",
        "color": "#4A6572",
        "audio_url": "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
        "instructions": [
            "დაწექი ან კომფორტულად დაჯექი.",
            "იგრძენი წვიმის სიმშვიდე.",
            "დაუშვი აზრებს უშუქოდ გაცურდნენ.",
        ],
    },
    {
        "id": "night-sky",
        "title": "ღამის ცა",
        "category": "sleep",
        "category_label": "ძილი",
        "duration_min": 25,
        "description": "ვარსკვლავიანი ცის ვიზუალიზაცია",
        "icon": "stars",
        "color": "#2C3E6B",
        "audio_url": "https://cdn.pixabay.com/download/audio/2022/11/17/audio_dcd97f32a0.mp3",
        "instructions": [
            "დაწექი და შეხედე ცას გონებით.",
            "წარმოიდგინე ვარსკვლავები.",
            "დაუშვი ღამის სიმშვიდე გაიყვანოს ძილში.",
        ],
    },
    {
        "id": "white-noise",
        "title": "თეთრი ხმაური",
        "category": "sounds",
        "category_label": "ბუნება",
        "duration_min": 60,
        "description": "ფოკუსისა და ძილისთვის",
        "icon": "sound",
        "color": "#6B7280",
        "audio_url": "https://cdn.pixabay.com/download/audio/2023/05/24/audio_78a87e8f42.mp3",
        "instructions": [
            "ჩართე თეთრი ხმაური ფონად.",
            "მიეცი ფოკუსს ან მოდუნებას.",
        ],
    },
    {
        "id": "fireplace",
        "title": "ბუხრის ხმა",
        "category": "sounds",
        "category_label": "ბუნება",
        "duration_min": 45,
        "description": "ბუხრის მყუდრო ხრიალი",
        "icon": "fire",
        "color": "#A0522D",
        "audio_url": "https://cdn.pixabay.com/download/audio/2022/10/18/audio_e10db13891.mp3",
        "instructions": [
            "წარმოიდგინე თბილი ოთახი.",
            "მოუსმინე ბუხრის ხრიალს.",
            "დაუშვი სითბო გადმოიღვაროს.",
        ],
    },
    {
        "id": "birds",
        "title": "ფრინველები",
        "category": "sounds",
        "category_label": "ბუნება",
        "duration_min": 20,
        "description": "დილის ფრინველების ჟღურტული",
        "icon": "bird",
        "color": "#6A994E",
        "audio_url": "https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508a42.mp3",
        "instructions": [
            "მოდუნდი.",
            "მოუსმინე ფრინველების ჟღურტულს.",
            "დაუშვი დილა ნაზად შემოიჭრას.",
        ],
    },
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
# Auth routes
# ---------------------------------------------------------------------------
def user_to_public(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u["name"],
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
        "id": user_id,
        "email": email,
        "name": data.name.strip(),
        "password_hash": hash_password(data.password),
        "created_at": now,
        "saved_sessions": [],
        "history": [],
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email)
    return {"user": user_to_public(doc), "token": token}


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(data: LoginInput):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="არასწორი ელფოსტა ან პაროლი")
    token = create_access_token(user["id"], email)
    return {"user": user_to_public(user), "token": token}


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
        "new_and_featured": SESSIONS[:6],
    }


@api_router.post("/sessions/complete")
async def complete_session(data: SessionCompleteInput, current_user: dict = Depends(get_current_user)):
    entry = {
        "session_id": data.session_id,
        "duration_minutes": data.duration_minutes,
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
    total_sessions = len(history)
    courses = len({h.get("session_id") for h in history})
    return {
        "mindful_days": unique_days,
        "mindful_minutes": total_minutes,
        "total_sessions": total_sessions,
        "total_courses": courses,
        "history": history[-20:][::-1],
    }


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    # seed test user
    admin_email = os.environ.get("ADMIN_EMAIL", "test@test.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "test123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "ტესტ მომხმარებელი",
            "password_hash": hash_password(admin_password),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "saved_sessions": [],
            "history": [],
        })
    elif not verify_password(admin_password, existing["password_hash"]):
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
