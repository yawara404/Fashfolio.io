import base64
from contextlib import closing
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import hmac
import json
from pathlib import Path
import re
import sqlite3
import time
import uuid

import bcrypt
from fastapi import HTTPException
import httpx
from starlette.concurrency import run_in_threadpool

from app.core.config import settings

GUEST_EMAIL = "creator@reflens.io"
TOKEN_TTL_SECONDS = 60 * 24 * 7 * 60
BCRYPT_ROUNDS = 12
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@dataclass(frozen=True)
class RefLensUser:
    id: str
    email: str
    username: str
    avatar_url: str | None = None

    def public_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "avatar_url": self.avatar_url,
        }


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(segment: str) -> bytes:
    padding = "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode((segment + padding).encode("ascii"))


def _prepare_password(password: str) -> bytes:
    """Match RefLens.io's sha256 -> base64 normalization before bcrypt."""
    digest = hashlib.sha256(password.encode("utf-8")).digest()
    return base64.b64encode(digest)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        _prepare_password(password), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    ).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(_prepare_password(password), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def encode_jwt(
    user_id: str, secret: str, ttl_seconds: int = TOKEN_TTL_SECONDS
) -> str:
    header = _b64url_encode(
        json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode()
    )
    payload = _b64url_encode(
        json.dumps(
            {"sub": user_id, "exp": int(time.time()) + ttl_seconds},
            separators=(",", ":"),
        ).encode()
    )
    signing_input = f"{header}.{payload}".encode("ascii")
    sig = _b64url_encode(
        hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    )
    return f"{header}.{payload}.{sig}"


def decode_jwt(token: str, secret: str) -> dict | None:
    if not token or not secret:
        return None
    parts = token.split(".")
    if len(parts) != 3:
        return None
    header_b64, payload_b64, sig_b64 = parts
    try:
        header = json.loads(_b64url_decode(header_b64))
        payload = json.loads(_b64url_decode(payload_b64))
        actual_sig = _b64url_decode(sig_b64)
    except (ValueError, UnicodeDecodeError):
        return None
    if not isinstance(header, dict) or header.get("alg") != "HS256":
        return None
    if not isinstance(payload, dict):
        return None
    expected_sig = hmac.new(
        secret.encode("utf-8"),
        f"{header_b64}.{payload_b64}".encode("ascii"),
        hashlib.sha256,
    ).digest()
    if not hmac.compare_digest(actual_sig, expected_sig):
        return None
    sub = payload.get("sub")
    exp = payload.get("exp")
    if not isinstance(sub, str) or not sub:
        return None
    if exp is not None:
        if not isinstance(exp, (int, float)) or exp <= time.time():
            return None
    return payload


def _local_db_path() -> Path | None:
    raw = settings.reflens_db_path.strip()
    if not raw:
        return None
    path = Path(raw)
    return path if path.is_file() else None


def auth_mode() -> str:
    if settings.reflens_api_url:
        return "api"
    if settings.reflens_jwt_secret and _local_db_path() is not None:
        return "sqlite"
    if settings.reflens_jwt_secret:
        return "jwt_only"
    return "none"


def is_configured() -> bool:
    return auth_mode() in ("api", "sqlite")


def normalize_email(email: str) -> str:
    cleaned = email.strip().lower()
    if not _EMAIL_RE.match(cleaned) or len(cleaned) > 255:
        raise HTTPException(422, "有効なメールアドレスを入力してください")
    return cleaned


def _connect_db(path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(path), timeout=10.0)
    conn.row_factory = sqlite3.Row
    return conn


def _user_from_row(row: sqlite3.Row | None) -> RefLensUser | None:
    if row is None:
        return None
    email = str(row["email"] or "").strip().lower()
    if not email or email == GUEST_EMAIL:
        return None
    return RefLensUser(
        id=str(row["id"]),
        email=email,
        username=str(row["username"] or email.split("@")[0]),
        avatar_url=row["avatar_url"],
    )


def _sqlite_login(db_path: Path, email: str, password: str) -> dict:
    if not settings.reflens_jwt_secret:
        raise HTTPException(503, "RefLens JWT設定が未構成です")
    with closing(_connect_db(db_path)) as conn:
        row = conn.execute(
            "SELECT id, email, username, hashed_password, avatar_url FROM users WHERE lower(email) = ?",
            (email,),
        ).fetchone()
    if row is None:
        raise HTTPException(401, "メールアドレスまたはパスワードが正しくありません")
    if str(row["email"]).strip().lower() == GUEST_EMAIL:
        raise HTTPException(401, "ゲストアカウントはパスワードログインできません")
    if not verify_password(password, row["hashed_password"] or ""):
        raise HTTPException(401, "メールアドレスまたはパスワードが正しくありません")
    user = _user_from_row(row)
    if user is None:
        raise HTTPException(401, "このアカウントではサインインできません")
    return {
        "access_token": encode_jwt(user.id, settings.reflens_jwt_secret),
        "token_type": "bearer",
        "user": user.public_dict(),
    }


def _sqlite_register(db_path: Path, email: str, username: str, password: str) -> dict:
    if not settings.reflens_jwt_secret:
        raise HTTPException(503, "RefLens JWT設定が未構成です")
    if email == GUEST_EMAIL:
        raise HTTPException(422, "このメールアドレスは登録できません")
    if len(password) < 6 or len(password) > 128:
        raise HTTPException(422, "パスワードは6〜128文字で入力してください")
    display_name = (username.strip() or email.split("@")[0])[:100]
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")
    hashed = hash_password(password)
    with closing(_connect_db(db_path)) as conn:
        existing = conn.execute(
            "SELECT 1 FROM users WHERE lower(email) = ?", (email,)
        ).fetchone()
        if existing is not None:
            raise HTTPException(409, "このメールアドレスは既に登録されています")
        conn.execute(
            """
            INSERT INTO users (
                id, email, username, hashed_password, avatar_url,
                instagram_user_id, auto_tagging, created_at, updated_at
            ) VALUES (?, ?, ?, ?, NULL, NULL, 1, ?, ?)
            """,
            (user_id, email, display_name, hashed, now, now),
        )
        has_boards = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='boards'"
        ).fetchone()
        if has_boards is not None:
            conn.execute(
                """
                INSERT INTO boards (
                    id, user_id, title, description, thumbnail_url,
                    viewport_x, viewport_y, viewport_zoom, background_theme,
                    is_public, created_at, updated_at
                ) VALUES (?, ?, ?, ?, NULL, 100.0, 100.0, 1.0, 'dark-grid', 0, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    user_id,
                    "My Reference Board",
                    "リファレンスボード。画像をドラッグ＆ドロップして始めましょう。",
                    now,
                    now,
                ),
            )
        conn.commit()
    user = RefLensUser(id=user_id, email=email, username=display_name)
    return {
        "access_token": encode_jwt(user.id, settings.reflens_jwt_secret),
        "token_type": "bearer",
        "user": user.public_dict(),
    }


def _sqlite_user_by_id(db_path: Path, user_id: str) -> RefLensUser | None:
    with closing(_connect_db(db_path)) as conn:
        row = conn.execute(
            "SELECT id, email, username, avatar_url FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    return _user_from_row(row)


async def _remote_auth(
    path: str,
    payload: dict | None = None,
    token: str | None = None,
) -> dict:
    base = settings.reflens_api_url
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if payload is None:
                res = await client.get(f"{base}/api/v1/auth/{path}", headers=headers)
            else:
                res = await client.post(
                    f"{base}/api/v1/auth/{path}", json=payload, headers=headers
                )
    except httpx.HTTPError:
        raise HTTPException(502, "RefLens.io認証サーバーに接続できませんでした") from None
    if res.status_code >= 400:
        detail = "RefLens.io認証に失敗しました"
        try:
            body = res.json()
            if isinstance(body, dict) and isinstance(body.get("detail"), str):
                detail = body["detail"]
        except ValueError:
            pass
        raise HTTPException(res.status_code, detail)
    return res.json()


async def login_reflens(email: str, password: str) -> dict:
    normalized = normalize_email(email)
    mode = auth_mode()
    if mode == "sqlite":
        db_path = _local_db_path()
        assert db_path is not None
        return await run_in_threadpool(_sqlite_login, db_path, normalized, password)
    if mode == "api":
        token_res = await _remote_auth(
            "login", {"email": normalized, "password": password}
        )
        token = str(token_res.get("access_token") or "")
        me = await _remote_auth("me", token=token)
        if str(me.get("email") or "").strip().lower() == GUEST_EMAIL:
            raise HTTPException(401, "ゲストアカウントでは同期できません")
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": str(me["id"]),
                "email": str(me["email"]),
                "username": str(me.get("username") or token_res.get("username") or ""),
                "avatar_url": me.get("avatar_url"),
            },
        }
    raise HTTPException(503, "RefLens.ioアカウント連携が設定されていません")


async def register_reflens(email: str, username: str, password: str) -> dict:
    normalized = normalize_email(email)
    mode = auth_mode()
    if mode == "sqlite":
        db_path = _local_db_path()
        assert db_path is not None
        return await run_in_threadpool(
            _sqlite_register, db_path, normalized, username, password
        )
    if mode == "api":
        token_res = await _remote_auth(
            "register",
            {
                "email": normalized,
                "username": username.strip() or normalized.split("@")[0],
                "password": password,
            },
        )
        token = str(token_res.get("access_token") or "")
        me = await _remote_auth("me", token=token)
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": str(me["id"]),
                "email": str(me["email"]),
                "username": str(me.get("username") or token_res.get("username") or ""),
                "avatar_url": me.get("avatar_url"),
            },
        }
    raise HTTPException(503, "RefLens.ioアカウント連携が設定されていません")


async def resolve_user_from_header(authorization: str | None) -> RefLensUser | None:
    if not authorization:
        return None
    scheme, _, token = authorization.strip().partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(401, "認証トークンの形式が不正です")
    token = token.strip()
    if settings.reflens_jwt_secret:
        payload = decode_jwt(token, settings.reflens_jwt_secret)
        if payload is None:
            raise HTTPException(
                401, "RefLensセッションが無効または期限切れです。再ログインしてください"
            )
        user_id = str(payload["sub"])
        db_path = _local_db_path()
        if db_path is not None:
            user = await run_in_threadpool(_sqlite_user_by_id, db_path, user_id)
            if user is None:
                raise HTTPException(
                    401, "RefLensアカウントが見つかりません。再ログインしてください"
                )
            return user
        if settings.reflens_api_url:
            me = await _remote_auth("me", token=token)
            if str(me.get("email") or "").strip().lower() == GUEST_EMAIL:
                raise HTTPException(401, "ゲストアカウントでは同期できません")
            return RefLensUser(
                id=str(me["id"]),
                email=str(me.get("email") or ""),
                username=str(me.get("username") or ""),
                avatar_url=me.get("avatar_url"),
            )
        return RefLensUser(id=user_id, email="", username="RefLensユーザー")
    if settings.reflens_api_url:
        me = await _remote_auth("me", token=token)
        if str(me.get("email") or "").strip().lower() == GUEST_EMAIL:
            raise HTTPException(401, "ゲストアカウントでは同期できません")
        return RefLensUser(
            id=str(me["id"]),
            email=str(me.get("email") or ""),
            username=str(me.get("username") or ""),
            avatar_url=me.get("avatar_url"),
        )
    raise HTTPException(503, "RefLens.ioアカウント連携が設定されていません")
