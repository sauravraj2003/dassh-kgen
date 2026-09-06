"""
services/llm.py
---------------
LLM service — all AI calls happen here, server-side only.

Provider priority (configurable via LLM_PROVIDER env var):
  auto  →  Groq (free, fast) → Gemini (Google AI Studio free) → OpenAI (paid)
  groq  →  Groq only, no fallback
  gemini → Gemini only, no fallback
  openai → OpenAI only, no fallback

Keys are read from config (backend .env) — NEVER from the frontend.
"""

import asyncio
import httpx
import logging
import re
from config import get_settings

logger = logging.getLogger("dassh")
settings = get_settings()

# Shared async HTTP client — reused for connection pooling
_http = httpx.AsyncClient(timeout=90.0)

# ── System prompts ─────────────────────────────────────────────────────────────

CHAT_SYSTEM_PROMPT = (
    "You are DASSH, an intelligent AI assistant specialized in game development "
    "and creative technology. Provide clear, helpful, and engaging responses. "
    "When users ask about game concepts, be specific and practical."
)

GAME_SYSTEM_PROMPT = (
    "You are an HTML5 canvas game developer. "
    "Output ONLY a complete HTML document (<!DOCTYPE html>). "
    "No markdown, no code fences, no explanations. "
    "Rules: Canvas-based, dark background, score display, start screen, "
    "game-over screen with final score and R-to-restart, arrow/WASD controls, "
    "Space to shoot/jump, requestAnimationFrame loop, AABB collision detection, "
    "increasing difficulty. All CSS in <style>, all JS in <script>, "
    "zero external dependencies."
)

# ── Availability checks ────────────────────────────────────────────────────────

def _groq_available(user_keys: dict) -> bool:
    return bool(user_keys.get("groq"))

def _gemini_available(user_keys: dict) -> bool:
    return bool(user_keys.get("gemini"))

def _openai_available(user_keys: dict) -> bool:
    return bool(user_keys.get("openai"))

# ── Provider implementations ───────────────────────────────────────────────────

async def _call_groq(messages: list[dict], system_prompt: str, user_keys: dict, game_model: str | None = None, **_) -> str:
    """
    Call Groq's OpenAI-compatible API.
    """
    key = user_keys.get("groq")
    if not key:
        raise ValueError("GROQ API Key is missing. Please add it in Settings.")

    payload = {
        "model": game_model or settings.groq_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            *[{"role": m["role"], "content": m["content"]} for m in messages[-12:]],
        ],
        "temperature": 0.7,
        "max_tokens": 8192,
    }

    response = await _http.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        json=payload,
    )
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"].strip()


async def _call_gemini(messages: list[dict], system_prompt: str, user_keys: dict, **_) -> str:
    """
    Call Google Gemini 1.5 Flash.
    """
    key = user_keys.get("gemini")
    if not key:
        raise ValueError("GEMINI API Key is missing. Please add it in Settings.")

    contents = []
    for msg in messages[-10:]:
        role = "user" if msg["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": msg["content"]}]})

    if not contents:
        contents = [
            {"role": "user", "parts": [{"text": "Hello"}]},
            {"role": "model", "parts": [{"text": "Hello! How can I help?"}]},
        ]

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-1.5-flash:generateContent?key={key}"
    )

    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 8192,
            "topK": 40,
            "topP": 0.95,
        },
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT",        "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH",       "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        ],
    }

    response = await _http.post(url, json=payload)
    response.raise_for_status()

    data = response.json()
    candidates = data.get("candidates", [])
    if not candidates:
        raise ValueError("No candidates returned from Gemini")

    candidate = candidates[0]
    if candidate.get("finishReason") == "SAFETY":
        raise ValueError("Response blocked by Gemini safety filters")

    parts = candidate.get("content", {}).get("parts", [])
    if not parts:
        raise ValueError("Empty response from Gemini")

    return parts[0]["text"].strip()


async def _call_openai(messages: list[dict], system_prompt: str, user_keys: dict, **_) -> str:
    """Call OpenAI GPT-3.5-turbo (paid)."""
    key = user_keys.get("openai")
    if not key:
        raise ValueError("OPENAI API Key is missing. Please add it in Settings.")

    openai_messages = [{"role": "system", "content": system_prompt}]
    openai_messages += [{"role": m["role"], "content": m["content"]} for m in messages[-10:]]

    response = await _http.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {key}"},
        json={
            "model": "gpt-3.5-turbo",
            "messages": openai_messages,
            "max_tokens": 4096,
            "temperature": 0.7,
        },
    )
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"].strip()


# ── Provider dispatch ──────────────────────────────────────────────────────────

_PROVIDERS: dict[str, tuple] = {
    "groq":   (_call_groq,   _groq_available),
    "gemini": (_call_gemini, _gemini_available),
    "openai": (_call_openai, _openai_available),
}

_AUTO_ORDER = ["groq", "gemini", "openai"]

# Max retries on rate-limit (429) before moving to next provider
_MAX_RETRIES = 2
_RETRY_BACKOFF = [5, 15]  # seconds to wait between retries


def _sanitize(msg: str) -> str:
    msg = re.sub(r'key=[^\&\s"\']+', 'key=***', msg)
    msg = re.sub(r'Bearer\s+[^\&\s"\']+', 'Bearer ***', msg)
    return msg


async def _try_provider(fn, messages: list[dict], system_prompt: str, kwargs: dict) -> str:
    """
    Call a single provider with retry on 429 (rate limit).
    Raises on any non-recoverable error.
    """
    last_exc: Exception | None = None
    for attempt in range(_MAX_RETRIES + 1):
        try:
            return await fn(messages, system_prompt, **kwargs)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 429 and attempt < _MAX_RETRIES:
                wait = _RETRY_BACKOFF[attempt]
                logger.warning(
                    f'{{"event":"llm_rate_limited","attempt":{attempt + 1},'
                    f'"retry_in":{wait}}}'
                )
                await asyncio.sleep(wait)
                last_exc = exc
                continue
            raise
    raise last_exc  # type: ignore[misc]


async def _dispatch(
    messages: list[dict],
    system_prompt: str,
    user_keys: dict,
    extra_kwargs: dict | None = None,
) -> str:
    """
    Try providers in order until one succeeds.
    - Skips providers with no API key configured.
    - Retries on 429 with backoff before moving to next provider.
    """
    provider_setting = settings.llm_provider.lower()

    if provider_setting == "auto":
        order = _AUTO_ORDER
    elif provider_setting in _PROVIDERS:
        order = [provider_setting]
    else:
        raise ValueError(
            f"Unknown LLM_PROVIDER value: '{provider_setting}'. "
            "Use: auto, groq, gemini, openai"
        )

    errors: list[str] = []
    kwargs = extra_kwargs or {}

    for name in order:
        fn, is_available = _PROVIDERS[name]

        if not is_available(user_keys):
            logger.debug(f'{{"event":"llm_skip","provider":"{name}","reason":"key_not_provided_by_user"}}')
            continue

        try:
            logger.info(f'{{"event":"llm_attempt","provider":"{name}"}}')
            kwargs["user_keys"] = user_keys
            result = await _try_provider(fn, messages, system_prompt, kwargs)
            logger.info(f'{{"event":"llm_success","provider":"{name}"}}')
            return result
        except Exception as exc:
            if isinstance(exc, httpx.HTTPStatusError):
                msg = f"HTTP {exc.response.status_code} error from AI provider"
            else:
                msg = _sanitize(str(exc))

            logger.warning(f'{{"event":"llm_error","provider":"{name}","error":"{msg}"}}')
            errors.append(name)

    if errors:
        raise RuntimeError("The AI service is temporarily unavailable. Please try again in a moment.")
    raise RuntimeError("No AI API key was provided. Please open Settings and add your API key.")


# ── Public interface ───────────────────────────────────────────────────────────

async def generate_chat_response(prompt: str, history: list[dict], user_keys: dict) -> str:
    """Generate a chat AI response. history = list of {role, content} dicts."""
    messages = history + [{"role": "user", "content": prompt}]
    return await _dispatch(messages, CHAT_SYSTEM_PROMPT, user_keys)


async def generate_game_code(prompt: str, category: str = "", previous_html: str = "", user_keys: dict = None) -> tuple[str, str]:
    """
    Generate a complete HTML5 game from a text prompt.
    If previous_html is provided, edits the existing game.
    Returns (html_code, game_title).

    Uses groq/compound-mini for game generation — it has a higher RPM
    limit on the free tier than groq/compound, making it less likely to
    hit 429 on back-to-back game requests.
    """
    category_hint = f" Category: {category}." if category else ""
    
    if previous_html:
        full_prompt = (
            f"You are editing an existing HTML5 game.\n"
            f"Current game code:\n```html\n{previous_html}\n```\n\n"
            f"User request: {prompt}\n\n"
            "Apply the requested changes to the code. Output ONLY the new raw HTML document."
        )
    else:
        full_prompt = (
            f"Build a playable HTML5 browser game: {prompt}.{category_hint} "
            "Output ONLY the raw HTML document."
        )

    # Use groq/compound-mini for game gen — higher free-tier RPM.
    # The game_model kwarg is accepted only by _call_groq (via **_), so
    # fallback providers (Gemini, OpenAI) silently ignore it.
    html = await _dispatch(
        [{"role": "user", "content": full_prompt}],
        GAME_SYSTEM_PROMPT,
        user_keys or {},
        extra_kwargs={"game_model": "groq/compound-mini"},
    )

    # Strip markdown fences if the model added them despite instructions
    html = html.strip()
    if html.startswith("```"):
        lines = html.split("\n")
        html = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

    # Inject focus + universal-start patch so the game always responds to input
    html = _inject_game_patches(html)

    # Extract title from <title> tag or fall back to prompt
    title = prompt[:50]
    html_lower = html.lower()
    if "<title>" in html_lower:
        try:
            s = html_lower.index("<title>") + 7
            e = html_lower.index("</title>", s)
            extracted = html[s:e].strip()
            if extracted:
                title = extracted
        except ValueError:
            pass

    return html, title


# ── HTML patch injected into every generated game ──────────────────────────────

# This script is injected into <head> of every generated game.
# It solves two iframe problems that AI-generated games almost always hit:
#
# 1. FOCUS: Sandboxed iframes don't auto-receive keyboard focus.
#    We immediately call window.focus() and re-focus on any canvas click.
#
# 2. UNIVERSAL START: Models generate games that start on Enter, Space, or
#    a click — but users try all three. We normalise ANY first interaction
#    (keydown or click) to dispatch both a Space and an Enter KeyboardEvent,
#    so the game starts regardless of what key the LLM chose to listen for.

_GAME_PATCH_SCRIPT = """<script>
(function() {
  var started = false;

  function fireKey(key, code) {
    [document, document.body, document.querySelector('canvas')].forEach(function(el) {
      if (!el) return;
      ['keydown','keyup'].forEach(function(type) {
        el.dispatchEvent(new KeyboardEvent(type, {
          key: key, code: code, keyCode: key === 'Enter' ? 13 : 32,
          bubbles: true, cancelable: true
        }));
      });
    });
  }

  function startGame() {
    if (started) return;
    started = true;
    fireKey(' ', 'Space');
    fireKey('Enter', 'Enter');
  }

  // Auto-focus so keyboard events reach the iframe immediately
  window.focus();
  document.addEventListener('DOMContentLoaded', function() {
    window.focus();
    var canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.setAttribute('tabindex', '0');
      canvas.addEventListener('click', function() { canvas.focus(); startGame(); });
    }
  });

  // First keydown or click anywhere starts the game
  document.addEventListener('keydown', startGame, { once: true });
  document.addEventListener('click',   startGame, { once: true });
  document.addEventListener('touchstart', startGame, { once: true });
})();
</script>"""


def _inject_game_patches(html: str) -> str:
    """Inject focus + universal-start patch into the game's <head>."""
    target = html.find("<head>")
    if target != -1:
        insert_at = target + len("<head>")
        return html[:insert_at] + "\n" + _GAME_PATCH_SCRIPT + html[insert_at:]
    # Fallback: inject before <html> or at the very top
    target = html.find("<html")
    if target != -1:
        return html[:target] + _GAME_PATCH_SCRIPT + "\n" + html[target:]
    return _GAME_PATCH_SCRIPT + "\n" + html

