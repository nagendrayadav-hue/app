from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import json
import base64
import logging
from io import BytesIO
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone

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


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "BioDash API"}


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
        '"threats" (array of 3 short threat driver strings). '
        'If no animal is clearly visible, set species to "No animal detected".'
    )
    try:
        text = await gemini_vision(system, prompt, b64)
        data = _parse_json(text)
        threats = data.get("threats", [])
        if not isinstance(threats, list):
            threats = [str(threats)]
        result = {
            "species": str(data.get("species", "Unknown")).strip(),
            "scientific_name": str(data.get("scientific_name", "")).strip(),
            "conservation_status": str(data.get("conservation_status", "Unknown")).strip(),
            "habitat_loss_summary": str(data.get("habitat_loss_summary", "")).strip(),
            "threats": [str(t).strip() for t in threats][:5],
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
