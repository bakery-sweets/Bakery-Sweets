import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "The Sweets Web API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    PORT: int = int(os.getenv("PORT", "5000"))

    # Database Settings
    DB_HOST: str = os.getenv("DB_HOST", "db")
    DB_PORT: str = os.getenv("DB_PORT", "3306")
    DB_NAME: str = os.getenv("DB_NAME", "thesweets_db")
    DB_USER: str = os.getenv("DB_USER", "user")
    DB_PASSWORD: str  # bắt buộc, đọc từ biến môi trường / .env

    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"

    # Security Settings
    SECRET_KEY: str  # bắt buộc, đọc từ biến môi trường / .env
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    # Realtime Server (WebSocket) chạy riêng, backend gửi sự kiện sang qua API nội bộ
    # Dùng 127.0.0.1 thay vì localhost: trên Windows "localhost" thử IPv6 trước nên mỗi lần gửi trễ ~2 giây
    REALTIME_URL: str = os.getenv("REALTIME_URL", "http://127.0.0.1:8001")
    INTERNAL_API_KEY: str  # bắt buộc, đọc từ biến môi trường / .env

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5000",
        "http://localhost",
        "*",
    ]

    class Config:
        case_sensitive = True

settings = Settings()
