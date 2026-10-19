from typing import Optional
from pydantic import BaseModel, EmailStr

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str

class AdminProfileOut(BaseModel):
    user_name: str
    email: str
    role: str
    status: str
    full_name: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
