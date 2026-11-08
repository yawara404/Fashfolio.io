from dataclasses import dataclass
from pathlib import Path
import os
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")


@dataclass(frozen=True)
class Settings:
    ollama_base_url: str = os.getenv(
        "OLLAMA_BASE_URL", "http://127.0.0.1:11434"
    ).rstrip("/")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "gemma3:4b")
    ollama_timeout: float = float(os.getenv("OLLAMA_TIMEOUT", "90"))
    danbooru_login: str = os.getenv("DANBOORU_LOGIN", "")
    danbooru_api_key: str = os.getenv("DANBOORU_API_KEY", "")
    danbooru_base_url: str = os.getenv(
        "DANBOORU_BASE_URL", "https://danbooru.donmai.us"
    ).rstrip("/")
    danbooru_timeout: float = float(os.getenv("DANBOORU_TIMEOUT", "8"))
    pinterest_token: str = os.getenv("PINTEREST_ACCESS_TOKEN", "")


settings = Settings()
