import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "The Sweets Mobile API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"

    # Database Settings
    DB_HOST: str = os.getenv("DB_HOST", "db")
    DB_PORT: str = os.getenv("DB_PORT", "3306")
    DB_NAME: str = os.getenv("DB_NAME", "thesweets_db")
    DB_USER: str = os.getenv("DB_USER", "user")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "123")

    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"

    # Security Settings
    # Dùng chung SECRET_KEY với Web Backend để trung tâm realtime xác thực được token của cả hai bên
    SECRET_KEY: str = os.getenv("SECRET_KEY", "thesweets_web_jwt_secret_key_2026_super_secure")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    # Khóa bí mật để Web Backend gửi sự kiện realtime qua API nội bộ
    INTERNAL_API_KEY: str = os.getenv("INTERNAL_API_KEY", "thesweets_internal_realtime_key_2026")

    class Config:
        case_sensitive = True

settings = Settings()
