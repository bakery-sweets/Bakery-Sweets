from pydantic import BaseModel

class AdminLoginRequest(BaseModel):
    # Số điện thoại hoặc email của tài khoản admin
    username: str
    password: str

class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    phone: str
    email: str

class AdminProfileOut(BaseModel):
    phone: str
    email: str
    role: str
    status: str
