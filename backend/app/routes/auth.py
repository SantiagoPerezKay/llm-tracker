from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import create_access_token

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    """
    Autentica con usuario y contraseña.
    Devuelve un JWT válido por 7 días.
    """
    if data.username != settings.AUTH_USERNAME or data.password != settings.AUTH_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
        )
    token = create_access_token(data.username)
    return TokenResponse(access_token=token, username=data.username)
