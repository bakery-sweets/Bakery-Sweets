from typing import Optional
from pydantic import BaseModel, EmailStr

class ClientRegisterRequest(BaseModel):
    phone: str
    email: EmailStr
    password: str
    first_name: str
    last_name: str

class ClientLoginRequest(BaseModel):
    phone: str
    password: str

class ClientTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    phone: str
    email: str
    role: str

class ClientProfileOut(BaseModel):
    phone: str
    email: str
    first_name: str
    last_name: str
    role: Optional[str] = None
