"""Backend API tests for mindfulness meditation app."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://mindful-breathe-11.preview.emergentagent.com").rstrip("/")
TEST_EMAIL = "test@test.com"
TEST_PASSWORD = "test123"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(client):
    r = client.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ---------------- Auth ----------------
class TestAuth:
    def test_login_seeded_user(self, client):
        r = client.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and "user" in d
        assert d["user"]["email"] == TEST_EMAIL

    def test_login_wrong_password(self, client):
        r = client.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_register_and_me(self, client):
        email = f"TEST_{uuid.uuid4().hex[:8]}@example.com"
        r = client.post(f"{BASE_URL}/api/auth/register",
                        json={"email": email, "password": "secret123", "name": "TEST User"})
        assert r.status_code == 200, r.text
        d = r.json()
        token = d["token"]
        assert d["user"]["email"] == email.lower()
        email = email.lower()

        me = client.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["email"] == email

    def test_register_duplicate(self, client):
        r = client.post(f"{BASE_URL}/api/auth/register",
                        json={"email": TEST_EMAIL, "password": "test123", "name": "x"})
        assert r.status_code == 400

    def test_me_requires_auth(self, client):
        r = client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401


# ---------------- Sessions ----------------
class TestSessions:
    def test_list_sessions(self, client):
        r = client.get(f"{BASE_URL}/api/sessions")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 11, f"expected 11 sessions, got {len(data)}"
        for s in data:
            for k in ["id", "title", "duration_min", "audio_url", "category"]:
                assert k in s

    def test_get_session_detail(self, client):
        r = client.get(f"{BASE_URL}/api/sessions/morning-meditation")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == "morning-meditation"
        assert "instructions" in d and len(d["instructions"]) > 0
        assert d["audio_url"].startswith("http")

    def test_get_session_404(self, client):
        r = client.get(f"{BASE_URL}/api/sessions/nope")
        assert r.status_code == 404

    def test_filter_category(self, client):
        r = client.get(f"{BASE_URL}/api/sessions", params={"category": "sleep"})
        assert r.status_code == 200
        for s in r.json():
            assert s["category"] == "sleep"


# ---------------- Discover ----------------
class TestDiscover:
    def test_discover(self, client):
        r = client.get(f"{BASE_URL}/api/discover")
        assert r.status_code == 200
        d = r.json()
        assert "quick_links" in d and len(d["quick_links"]) == 3
        assert "recommendations" in d and len(d["recommendations"]) == 2
        assert "new_and_featured" in d and len(d["new_and_featured"]) >= 1


# ---------------- User flows ----------------
class TestUserFlows:
    def test_toggle_saved_and_list(self, client, auth_headers):
        sid = "morning-meditation"
        # ensure clean: get current state, toggle until saved=True
        r1 = client.post(f"{BASE_URL}/api/sessions/toggle_saved",
                         json={"session_id": sid}, headers=auth_headers)
        assert r1.status_code == 200
        if not r1.json().get("saved"):
            r1 = client.post(f"{BASE_URL}/api/sessions/toggle_saved",
                             json={"session_id": sid}, headers=auth_headers)
            assert r1.json().get("saved") is True

        saved = client.get(f"{BASE_URL}/api/user/saved", headers=auth_headers)
        assert saved.status_code == 200
        sd = saved.json()
        assert "sessions" in sd and "count" in sd and "total_minutes" in sd
        assert any(s["id"] == sid for s in sd["sessions"])
        assert sd["count"] >= 1
        assert sd["total_minutes"] >= 1

        # toggle off
        r2 = client.post(f"{BASE_URL}/api/sessions/toggle_saved",
                         json={"session_id": sid}, headers=auth_headers)
        assert r2.json()["saved"] is False

    def test_complete_session_and_stats(self, client, auth_headers):
        before = client.get(f"{BASE_URL}/api/user/stats", headers=auth_headers).json()
        r = client.post(f"{BASE_URL}/api/sessions/complete",
                        json={"session_id": "stress-relief", "duration_minutes": 5},
                        headers=auth_headers)
        assert r.status_code == 200
        after = client.get(f"{BASE_URL}/api/user/stats", headers=auth_headers).json()
        for k in ["mindful_days", "mindful_minutes", "total_sessions", "total_courses"]:
            assert k in after
        assert after["total_sessions"] == before["total_sessions"] + 1
        assert after["mindful_minutes"] == before["mindful_minutes"] + 5

    def test_protected_endpoints_require_auth(self, client):
        for path in ["/api/user/saved", "/api/user/stats"]:
            r = client.get(f"{BASE_URL}{path}")
            assert r.status_code == 401, path
