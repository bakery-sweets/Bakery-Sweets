from typing import Optional
from pydantic import BaseModel, EmailStr

class ClientRegisterRequest(BaseModel):
    user_name: str
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    gender: Optional[str] = "Other"

class ClientLoginRequest(BaseModel):
    username: str
    password: str

class ClientTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_name: str
    email: str
    role: str

class ClientProfileOut(BaseModel):
    user_name: str
    email: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    gender: Optional[str] = None
    loyalty_points: int = 0
