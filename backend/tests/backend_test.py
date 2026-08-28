"""
BioDash backend API tests.
Covers:
- /api/habitat/analyze (AI habitat scoring)
- /api/animal/analyze (AI species ID)
- /api/habitat/posts CRUD (GET/POST/DELETE)
"""
import os
import io
import base64
import random
import pytest
import requests
from PIL import Image, ImageDraw

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/') if os.environ.get('REACT_APP_BACKEND_URL') else None
if not BASE_URL:
    # fall back to frontend/.env
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
                break

API = f"{BASE_URL}/api"


def _make_realistic_jpeg_b64(kind="habitat"):
    """Create a JPEG with actual visual features (not solid color)."""
    rnd = random.Random(42 if kind == "habitat" else 7)
    img = Image.new("RGB", (512, 384), (34, 80, 40) if kind == "habitat" else (120, 100, 80))
    draw = ImageDraw.Draw(img)
    # Add texture / shapes so it isn't uniform
    for _ in range(400):
        x = rnd.randint(0, 511); y = rnd.randint(0, 383)
        r = rnd.randint(2, 25)
        if kind == "habitat":
            c = (rnd.randint(20, 90), rnd.randint(80, 180), rnd.randint(30, 90))
        else:
            c = (rnd.randint(80, 200), rnd.randint(60, 160), rnd.randint(40, 120))
        draw.ellipse((x - r, y - r, x + r, y + r), fill=c)
    # A "subject" oval in the middle for animal
    if kind == "animal":
        draw.ellipse((180, 130, 360, 300), fill=(90, 60, 40))
        draw.ellipse((210, 160, 260, 210), fill=(20, 20, 20))  # eye area
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


@pytest.fixture(scope="module")
def habitat_img():
    return _make_realistic_jpeg_b64("habitat")


@pytest.fixture(scope="module")
def animal_img():
    return _make_realistic_jpeg_b64("animal")


# ---------- Health ----------
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert "message" in r.json()


# ---------- Seed / GET posts ----------
def test_get_posts_seeded():
    r = requests.get(f"{API}/habitat/posts")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 5, f"Expected >=5 seeded posts, got {len(data)}"
    p = data[0]
    for k in ("id", "score", "summary", "location_name", "latitude", "longitude", "image_base64"):
        assert k in p


# ---------- Create + Delete flow ----------
def test_post_create_and_delete():
    payload = {
        "image_base64": "data:image/jpeg;base64,AAAA",
        "score": 55,
        "summary": "TEST_ summary of habitat",
        "ecosystem": "TEST_ecosystem",
        "location_name": "TEST_location",
        "latitude": 12.34,
        "longitude": 56.78,
    }
    r = requests.post(f"{API}/habitat/posts", json=payload)
    assert r.status_code == 200, r.text
    created = r.json()
    assert created["score"] == 55
    assert created["location_name"] == "TEST_location"
    assert "id" in created
    post_id = created["id"]

    # verify GET contains it
    r2 = requests.get(f"{API}/habitat/posts")
    assert any(x["id"] == post_id for x in r2.json())

    # delete
    r3 = requests.delete(f"{API}/habitat/posts/{post_id}")
    assert r3.status_code == 200
    assert r3.json().get("deleted") == post_id

    # verify gone
    r4 = requests.get(f"{API}/habitat/posts")
    assert not any(x["id"] == post_id for x in r4.json())


def test_delete_nonexistent_returns_404():
    r = requests.delete(f"{API}/habitat/posts/does-not-exist-xyz")
    assert r.status_code == 404


# ---------- Habitat AI analyze ----------
def test_habitat_analyze_bad_image():
    r = requests.post(f"{API}/habitat/analyze", json={"image_base64": "!!!not-b64!!!"})
    assert r.status_code == 400


def test_habitat_analyze_success(habitat_img):
    r = requests.post(f"{API}/habitat/analyze", json={"image_base64": habitat_img}, timeout=90)
    assert r.status_code == 200, r.text
    d = r.json()
    assert isinstance(d.get("score"), int)
    assert 0 <= d["score"] <= 100
    assert isinstance(d.get("summary"), str) and len(d["summary"]) > 10
    assert "ecosystem" in d
    assert "gps" in d
    # no EXIF in generated image
    assert d["gps"] is None


# ---------- Animal AI analyze ----------
def test_animal_analyze_bad_image():
    r = requests.post(f"{API}/animal/analyze", json={"image_base64": "!!!not-b64!!!"})
    assert r.status_code == 400


def test_animal_analyze_success(animal_img):
    r = requests.post(f"{API}/animal/analyze", json={"image_base64": animal_img}, timeout=90)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ("species", "scientific_name", "conservation_status", "habitat_loss_summary", "threats", "range_summary", "native_range"):
        assert k in d, f"missing {k}"
    assert isinstance(d["threats"], list)
    assert isinstance(d["native_range"], list)
    assert isinstance(d["species"], str) and len(d["species"]) > 0


# ---------- Auth ----------
def test_auth_login_success():
    r = requests.post(f"{API}/auth/login", json={"email": "ranger@biodash.app", "password": "wildlife123"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert "token" in d and isinstance(d["token"], str) and len(d["token"]) > 20
    assert d["user"]["email"] == "ranger@biodash.app"
    return d["token"]


def test_auth_login_wrong_password():
    r = requests.post(f"{API}/auth/login", json={"email": "ranger@biodash.app", "password": "wrong"})
    assert r.status_code == 401


def test_auth_me_valid():
    tok = requests.post(f"{API}/auth/login", json={"email": "ranger@biodash.app", "password": "wildlife123"}).json()["token"]
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200
    assert r.json()["email"] == "ranger@biodash.app"


def test_auth_me_missing():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_auth_me_invalid():
    r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
    assert r.status_code == 401


# ---------- Image Proxy ----------
def test_image_proxy_unsplash():
    url = "https://images.unsplash.com/photo-1619476266550-bc9f04e57952?crop=entropy&cs=srgb&fm=jpg&q=85&w=400"
    r = requests.get(f"{API}/image-proxy", params={"url": url}, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "data_url" in d
    assert d["data_url"].startswith("data:image")


def test_image_proxy_invalid_url():
    r = requests.get(f"{API}/image-proxy", params={"url": "not-a-url"})
    assert r.status_code == 400
