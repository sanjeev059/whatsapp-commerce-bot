"""Shared test fixtures and env loading."""
import os
from pathlib import Path

# Load REACT_APP_BACKEND_URL from /app/frontend/.env if not already exported
if "REACT_APP_BACKEND_URL" not in os.environ:
    env_path = Path("/app/frontend/.env")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())
