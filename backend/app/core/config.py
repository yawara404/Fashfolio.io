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
    r2_account_id: str = os.getenv("R2_ACCOUNT_ID", "").strip()
    r2_bucket_name: str = os.getenv("R2_BUCKET_NAME", "").strip()
    r2_access_key_id: str = os.getenv("R2_ACCESS_KEY_ID", "").strip()
    r2_secret_access_key: str = os.getenv("R2_SECRET_ACCESS_KEY", "").strip()
    r2_prefix: str = (os.getenv("R2_PREFIX", "fashfolio") or "fashfolio").strip().strip("/") or "fashfolio"
    r2_daily_upload_mb: int = int(os.getenv("R2_DAILY_UPLOAD_MB", "128"))

    @property
    def r2_configured(self) -> bool:
        return all((self.r2_account_id, self.r2_bucket_name, self.r2_access_key_id, self.r2_secret_access_key))


settings = Settings()
