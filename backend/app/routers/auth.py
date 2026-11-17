from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.services import reflens_auth

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    username: str = ""
    password: str


@router.get("/status")
async def auth_status(request: Request):
    configured = reflens_auth.is_configured()
    auth_header = request.headers.get("authorization")
    user = None
    if auth_header:
        try:
            resolved = await reflens_auth.resolve_user_from_header(auth_header)
            user = resolved.public_dict() if resolved else None
        except HTTPException:
            user = None
    return {
        "configured": configured,
        "provider": "reflens" if configured else "none",
        "authenticated": user is not None,
        "user": user,
    }


@router.post("/login")
async def login(payload: LoginRequest):
    return await reflens_auth.login_reflens(payload.email, payload.password)


@router.post("/register")
async def register(payload: RegisterRequest):
    return await reflens_auth.register_reflens(
        payload.email, payload.username, payload.password
    )


@router.get("/me")
async def me(request: Request):
    user = await reflens_auth.resolve_user_from_header(
        request.headers.get("authorization")
    )
    if user is None:
        raise HTTPException(401, "ログインが必要です")
    return user.public_dict()
