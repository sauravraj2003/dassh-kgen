"""
middleware/logging_middleware.py
---------------------------------
Structured JSON logging for every HTTP request.
Logs: method, path, user-agent, status code, and response time.
"""

import time
import json
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Root logger with JSON output
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",  # We build the full JSON ourselves
)
logger = logging.getLogger("dassh")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()

        # Try to extract user_id from request state (set by auth dependency)
        user_id = getattr(request.state, "user_id", "anonymous")

        response = await call_next(request)

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        log_record = {
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": duration_ms,
            "user_id": user_id,
            "user_agent": request.headers.get("user-agent", ""),
        }

        if response.status_code >= 500:
            logger.error(json.dumps(log_record))
        elif response.status_code >= 400:
            logger.warning(json.dumps(log_record))
        else:
            logger.info(json.dumps(log_record))

        return response
