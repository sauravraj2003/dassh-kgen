# DASSH Backend — FastAPI

A clean, secure API server that proxies all AI calls, validates JWT tokens, and enforces rate limiting.

## Quick Start

### 1. Create your `.env` file

```bash
cp .env.example .env
```

Then fill in your values:

| Variable | Where to get it | Cost |
|---|---|---|
| `SUPABASE_URL` | Supabase Dashboard → Project Settings → API | Free |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API | Free |
| `SUPABASE_JWT_SECRET` | Supabase Dashboard → Project Settings → API → JWT Secret | Free |
| `GROQ_API_KEY` | [Groq Console](https://console.groq.com/keys) — **Primary** | **Free** |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) — Fallback | Free |
| `OPENAI_API_KEY` | [OpenAI Platform](https://platform.openai.com/api-keys) — Optional | Paid |

> **Minimum required:** Just `GROQ_API_KEY` — it's free and blazing fast.
> Gemini is the fallback if Groq fails. OpenAI is completely optional.

**Recommended Groq model** (set via `GROQ_MODEL`):
- `llama-3.3-70b-versatile` — best quality, 128k context ✅ (default)
- `llama3-70b-8192` — also excellent
- `mixtral-8x7b-32768` — 32k context

### 2. Set up virtual environment

```bash
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Run the server

```bash
uvicorn main:app --reload --port 8000
```

The API will be live at **http://localhost:8000**

Interactive docs: **http://localhost:8000/docs**

---

## API Endpoints

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| `GET` | `/health` | None | — | Server health check |
| `POST` | `/api/chat` | JWT | 20/min | Send a chat message |
| `POST` | `/api/game/generate` | JWT | 10/min | Generate a playable HTML5 game |

### POST `/api/chat`

```json
{
  "prompt": "Create a game where...",
  "history": [
    { "role": "user", "content": "previous message" },
    { "role": "assistant", "content": "previous response" }
  ]
}
```

### POST `/api/game/generate`

```json
{
  "prompt": "A space shooter where you dodge asteroids",
  "category": "action"
}
```

Returns:
```json
{
  "html": "<!DOCTYPE html>...",
  "title": "Asteroid Dodger",
  "prompt": "A space shooter..."
}
```

---

## Security

- **API keys never leave the server** — the frontend only sends Supabase JWTs
- **JWT validation** on every protected route using your Supabase JWT secret
- **Rate limiting** via `slowapi` — prevents API cost abuse
- **Input validation** via Pydantic — max lengths enforced on all inputs
- **CORS** restricted to your configured frontend origin
