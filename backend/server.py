from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import json
import base64
import logging
import bcrypt
import jwt
import requests
from io import BytesIO
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
GEMINI_MODEL = ("gemini", "gemini-3.1-pro-preview")

JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret')
JWT_ALGO = "HS256"

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ---------- Models ----------
class HabitatPost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    image_base64: str
    score: int
    summary: str
    ecosystem: str = ""
    location_name: str = "Unknown location"
    latitude: float
    longitude: float
    flags: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AnalyzeRequest(BaseModel):
    image_base64: str


class SavePostRequest(BaseModel):
    image_base64: str
    score: int
    summary: str
    ecosystem: str = ""
    location_name: str = "Unknown location"
    latitude: float
    longitude: float


# ---------- Helpers ----------
def _strip_data_url(b64: str) -> str:
    if "," in b64 and b64.strip().startswith("data:"):
        return b64.split(",", 1)[1]
    return b64


def _parse_json(text: str) -> dict:
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        text = match.group(0)
    return json.loads(text)


def _to_degrees(value):
    d, m, s = value
    return float(d) + float(m) / 60.0 + float(s) / 3600.0


def extract_gps(raw_bytes: bytes):
    try:
        img = Image.open(BytesIO(raw_bytes))
        exif = img._getexif()
        if not exif:
            return None
        gps_info = {}
        for tag, val in exif.items():
            if TAGS.get(tag) == "GPSInfo":
                for t in val:
                    gps_info[GPSTAGS.get(t, t)] = val[t]
        if not gps_info or "GPSLatitude" not in gps_info or "GPSLongitude" not in gps_info:
            return None
        lat = _to_degrees(gps_info["GPSLatitude"])
        if gps_info.get("GPSLatitudeRef") == "S":
            lat = -lat
        lng = _to_degrees(gps_info["GPSLongitude"])
        if gps_info.get("GPSLongitudeRef") == "W":
            lng = -lng
        return {"latitude": round(lat, 6), "longitude": round(lng, 6)}
    except Exception as e:
        logger.info(f"EXIF parse failed: {e}")
        return None


async def gemini_vision(system_message: str, prompt: str, image_b64: str) -> str:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=str(uuid.uuid4()),
        system_message=system_message,
    ).with_model(*GEMINI_MODEL)
    msg = UserMessage(text=prompt, file_contents=[ImageContent(image_base64=image_b64)])
    resp = await chat.send_message(msg)
    return resp


# ---------- Auth ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


class LoginRequest(BaseModel):
    email: str
    password: str


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "BioDash API"}


@api_router.post("/auth/login")
async def login(req: LoginRequest):
    email = req.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], email)
    return {"token": token, "user": {"id": user["id"], "email": email, "name": user.get("name", "Ranger")}}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api_router.get("/image-proxy")
async def image_proxy(url: str):
    if not url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid url")
    try:
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        mime = r.headers.get("Content-Type", "image/jpeg").split(";")[0]
        b64 = base64.b64encode(r.content).decode("utf-8")
        return {"data_url": f"data:{mime};base64,{b64}"}
    except Exception as e:
        logger.error(f"image proxy failed: {e}")
        raise HTTPException(status_code=502, detail="Could not fetch image")


@api_router.post("/habitat/analyze")
async def analyze_habitat(req: AnalyzeRequest):
    b64 = _strip_data_url(req.image_base64)
    try:
        raw = base64.b64decode(b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image data")

    gps = extract_gps(raw)

    system = (
        "You are an expert conservation ecologist assessing habitat health from photographs. "
        "Respond ONLY with strict JSON, no prose, no markdown fences."
    )
    prompt = (
        "Analyze this habitat photo and assess its ecological health. Return JSON with keys: "
        '"score" (integer 0-100 where higher means healthier habitat), '
        '"summary" (2-3 sentence habitat health assessment), '
        '"ecosystem" (short label like "Tropical Rainforest", "Coastal Wetland", "Grassland"). '
        "Base the score on biodiversity indicators, vegetation density, signs of degradation, pollution or human disturbance."
    )
    try:
        text = await gemini_vision(system, prompt, b64)
        data = _parse_json(text)
        score = int(max(0, min(100, int(data.get("score", 50)))))
        result = {
            "score": score,
            "summary": str(data.get("summary", "")).strip(),
            "ecosystem": str(data.get("ecosystem", "")).strip(),
        }
    except Exception as e:
        logger.error(f"Habitat analyze failed: {e}")
        raise HTTPException(status_code=502, detail="AI analysis failed. Please try again.")

    result["gps"] = gps
    return result


@api_router.post("/animal/analyze")
async def analyze_animal(req: AnalyzeRequest):
    b64 = _strip_data_url(req.image_base64)
    try:
        base64.b64decode(b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image data")

    system = (
        "You are a wildlife biologist identifying animals and their conservation status. "
        "Respond ONLY with strict JSON, no prose, no markdown fences."
    )
    prompt = (
        "Identify the primary animal in this photo. Return JSON with keys: "
        '"species" (common name), '
        '"scientific_name" (Latin binomial), '
        '"conservation_status" (IUCN category like "Least Concern", "Vulnerable", "Endangered", "Critically Endangered", or "Unknown"), '
        '"habitat_loss_summary" (2-3 sentences on habitat loss and threats this species faces), '
        '"threats" (array of 3 short threat driver strings), '
        '"range_summary" (1 sentence describing the species real-world geographic range), '
        '"native_range" (array of 3-6 objects each with "region" (place name), "latitude" (number), "longitude" (number) marking representative points across the species natural global range). '
        'If no animal is clearly visible, set species to "No animal detected" and native_range to an empty array.'
    )
    try:
        text = await gemini_vision(system, prompt, b64)
        data = _parse_json(text)
        threats = data.get("threats", [])
        if not isinstance(threats, list):
            threats = [str(threats)]
        raw_range = data.get("native_range", [])
        native_range = []
        if isinstance(raw_range, list):
            for pt in raw_range:
                try:
                    native_range.append({
                        "region": str(pt.get("region", "")).strip(),
                        "latitude": float(pt.get("latitude")),
                        "longitude": float(pt.get("longitude")),
                    })
                except (TypeError, ValueError, AttributeError):
                    continue
        result = {
            "species": str(data.get("species", "Unknown")).strip(),
            "scientific_name": str(data.get("scientific_name", "")).strip(),
            "conservation_status": str(data.get("conservation_status", "Unknown")).strip(),
            "habitat_loss_summary": str(data.get("habitat_loss_summary", "")).strip(),
            "threats": [str(t).strip() for t in threats][:5],
            "range_summary": str(data.get("range_summary", "")).strip(),
            "native_range": native_range[:6],
        }
    except Exception as e:
        logger.error(f"Animal analyze failed: {e}")
        raise HTTPException(status_code=502, detail="AI analysis failed. Please try again.")

    return result


@api_router.post("/habitat/posts", response_model=HabitatPost)
async def create_post(req: SavePostRequest):
    post = HabitatPost(**req.model_dump())
    await db.habitat_posts.insert_one(post.model_dump())
    return post


@api_router.get("/habitat/posts", response_model=List[HabitatPost])
async def get_posts():
    docs = await db.habitat_posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [HabitatPost(**d) for d in docs]


@api_router.delete("/habitat/posts/{post_id}")
async def delete_post(post_id: str):
    res = await db.habitat_posts.delete_one({"id": post_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"deleted": post_id}


FLAG_REMOVE_THRESHOLD = 6


@api_router.post("/habitat/posts/{post_id}/flag")
async def flag_post(post_id: str):
    doc = await db.habitat_posts.find_one({"id": post_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Post not found")
    flags = int(doc.get("flags", 0)) + 1
    if flags >= FLAG_REMOVE_THRESHOLD:
        await db.habitat_posts.delete_one({"id": post_id})
        return {"removed": True, "flags": flags, "threshold": FLAG_REMOVE_THRESHOLD}
    await db.habitat_posts.update_one({"id": post_id}, {"$set": {"flags": flags}})
    return {"removed": False, "flags": flags, "threshold": FLAG_REMOVE_THRESHOLD}


# ---------- Seed ----------
SEED_POSTS = [
    {"score": 88, "summary": "Dense, undisturbed canopy with high biodiversity indicators and healthy understory growth. Minimal signs of human encroachment.", "ecosystem": "Tropical Rainforest", "location_name": "Amazon Basin, Brazil", "latitude": -3.4653, "longitude": -62.2159, "image_base64": "https://images.unsplash.com/photo-1674195649562-e44f30388acf?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
    {"score": 61, "summary": "Moderate vegetation cover with visible edge effects and fragmentation. Some recovery potential but human disturbance present.", "ecosystem": "Temperate Woodland", "location_name": "Bavarian Forest, Germany", "latitude": 48.9, "longitude": 13.4, "image_base64": "https://images.unsplash.com/photo-1629494939320-e36ef741dc36?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
    {"score": 32, "summary": "Significant degradation with sparse vegetation and evidence of erosion. Low biodiversity and clear signs of habitat stress.", "ecosystem": "Degraded Grassland", "location_name": "Sahel Region, Niger", "latitude": 17.6, "longitude": 8.0, "image_base64": "https://images.unsplash.com/photo-1785788685428-9ea6f28c7258?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
    {"score": 74, "summary": "Mossy old-growth ecosystem with rich ground cover and layered canopy. Strong ecological integrity with intact water cycles.", "ecosystem": "Temperate Rainforest", "location_name": "Olympic NP, USA", "latitude": 47.8, "longitude": -123.6, "image_base64": "https://images.unsplash.com/photo-1765833667313-2dbad5069581?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
    {"score": 45, "summary": "Coastal habitat with moderate mangrove coverage but visible signs of pollution and coastal development pressure.", "ecosystem": "Coastal Mangrove", "location_name": "Sundarbans, India", "latitude": 21.9, "longitude": 89.1, "image_base64": "https://images.unsplash.com/photo-1619476266550-bc9f04e57952?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"},
]


@app.on_event("startup")
async def seed_db():
    # seed admin user
    admin_email = os.environ.get("ADMIN_EMAIL", "ranger@biodash.app").strip().lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "wildlife123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Ranger",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Seeded admin user")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Updated admin password")

    # seed sample habitat posts
    count = await db.habitat_posts.count_documents({})
    if count == 0:
        for s in SEED_POSTS:
            post = HabitatPost(**s)
            await db.habitat_posts.insert_one(post.model_dump())
        logger.info("Seeded sample habitat posts")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
