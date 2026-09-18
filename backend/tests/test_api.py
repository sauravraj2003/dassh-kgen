"""
tests/test_api.py
-----------------
Backend API tests using FastAPI TestClient.
No real API keys needed — LLM calls are mocked.

Run:
    cd backend
    source venv/bin/activate
    pytest tests/ -v
"""

import sys
import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from middleware.auth import get_current_user

FAKE_USER = {"user_id": "test-user-abc123", "email": "test@example.com"}

FAKE_GAME_HTML = (
    "<!DOCTYPE html><html><head><title>Test Game</title></head>"
    "<body><canvas id='c'></canvas>"
    "<script>console.log('game running');</script></body></html>"
)


# FastAPI dependency override — bypasses JWT validation in all tests
async def mock_auth():
    return FAKE_USER


# Apply override globally; auth tests must clear it first
app.dependency_overrides[get_current_user] = mock_auth
client = TestClient(app, raise_server_exceptions=False)


# ═══════════════════════════════════════════════════════════════════════════════
# Health
# ═══════════════════════════════════════════════════════════════════════════════

class TestHealth:
    def test_returns_200(self):
        assert client.get("/health").status_code == 200

    def test_status_is_ok(self):
        assert client.get("/health").json()["status"] == "ok"

    def test_version_field_present(self):
        assert "version" in client.get("/health").json()

    def test_llm_provider_field_present(self):
        assert "llm_provider" in client.get("/health").json()


# ═══════════════════════════════════════════════════════════════════════════════
# Auth enforcement (temporarily remove the override to test real auth)
# ═══════════════════════════════════════════════════════════════════════════════

class TestAuthEnforcement:
    def setup_method(self):
        """Remove the mock so the real JWT middleware runs."""
        app.dependency_overrides.pop(get_current_user, None)

    def teardown_method(self):
        """Restore mock for other test classes."""
        app.dependency_overrides[get_current_user] = mock_auth

    def test_chat_no_token_returns_401(self):
        r = client.post("/api/v1/chat", json={"prompt": "hello", "history": []})
        assert r.status_code == 401

    def test_game_no_token_returns_401(self):
        r = client.post("/api/v1/game/generate", json={"prompt": "snake game"})
        assert r.status_code == 401

    def test_chat_bad_token_returns_401(self):
        r = client.post(
            "/api/v1/chat",
            json={"prompt": "hello"},
            headers={"Authorization": "Bearer not.a.real.jwt"},
        )
        assert r.status_code == 401

    def test_game_bad_token_returns_401(self):
        r = client.post(
            "/api/v1/game/generate",
            json={"prompt": "pong game"},
            headers={"Authorization": "Bearer garbage"},
        )
        assert r.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
# Chat input validation (auth mocked via dependency_overrides)
# ═══════════════════════════════════════════════════════════════════════════════

class TestChatValidation:
    def test_empty_prompt_rejected(self):
        r = client.post("/api/v1/chat", json={"prompt": "", "history": []})
        assert r.status_code == 422

    def test_prompt_too_long_rejected(self):
        r = client.post("/api/v1/chat", json={"prompt": "a" * 2001, "history": []})
        assert r.status_code == 422

    def test_invalid_history_role_rejected(self):
        """Only 'user' and 'assistant' are valid roles."""
        r = client.post(
            "/api/v1/chat",
            json={"prompt": "hello", "history": [{"role": "system", "content": "hack"}]},
        )
        assert r.status_code == 422

    def test_valid_request_returns_response(self):
        with patch("routers.chat.generate_chat_response", new_callable=AsyncMock, return_value="Hi there!"):
            r = client.post("/api/v1/chat", json={"prompt": "hello", "history": []})
        assert r.status_code == 200
        assert r.json()["response"] == "Hi there!"

    def test_response_has_response_field(self):
        with patch("routers.chat.generate_chat_response", new_callable=AsyncMock, return_value="OK"):
            r = client.post("/api/v1/chat", json={"prompt": "test", "history": []})
        assert "response" in r.json()


# ═══════════════════════════════════════════════════════════════════════════════
# Game generation (auth mocked via dependency_overrides)
# ═══════════════════════════════════════════════════════════════════════════════

class TestGameValidation:
    def test_prompt_too_short_rejected(self):
        r = client.post("/api/v1/game/generate", json={"prompt": "hi"})
        assert r.status_code == 422

    def test_prompt_too_long_rejected(self):
        r = client.post("/api/v1/game/generate", json={"prompt": "x" * 1001})
        assert r.status_code == 422

    def test_invalid_category_rejected(self):
        r = client.post(
            "/api/v1/game/generate",
            json={"prompt": "snake game", "category": "invalid_cat"},
        )
        assert r.status_code == 422

    def test_valid_request_returns_200(self):
        with patch("routers.game.generate_game_code", new_callable=AsyncMock,
                   return_value=(FAKE_GAME_HTML, "Test Game")):
            r = client.post(
                "/api/v1/game/generate",
                json={"prompt": "a simple snake game", "category": "arcade"},
            )
        assert r.status_code == 200

    def test_response_has_html_title_prompt(self):
        with patch("routers.game.generate_game_code", new_callable=AsyncMock,
                   return_value=(FAKE_GAME_HTML, "Test Game")):
            r = client.post("/api/v1/game/generate", json={"prompt": "a flappy bird game"})
        data = r.json()
        assert "html" in data
        assert "title" in data
        assert "prompt" in data

    def test_all_valid_categories_accepted(self):
        for cat in ["rpg", "strategy", "puzzle", "action", "arcade"]:
            with patch("routers.game.generate_game_code", new_callable=AsyncMock,
                       return_value=(FAKE_GAME_HTML, "Game")):
                r = client.post(
                    "/api/v1/game/generate",
                    json={"prompt": "simple game test", "category": cat},
                )
            assert r.status_code == 200, f"Category '{cat}' should be accepted"
