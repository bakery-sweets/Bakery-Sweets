import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "The Sweets Realtime Server"
    VERSION: str = "1.0.0"
    PORT: int = int(os.getenv("PORT", "8001"))

    # Database Settings (chỉ đọc bảng users để xác định danh tính kết nối WebSocket)
    DB_HOST: str = os.getenv("DB_HOST", "db")
    DB_PORT: str = os.getenv("DB_PORT", "3306")
    DB_NAME: str = os.getenv("DB_NAME", "thesweets_db")
    DB_USER: str = os.getenv("DB_USER", "user")
    DB_PASSWORD: str  # bắt buộc, đọc từ biến môi trường / .env

    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"

    # Dùng chung SECRET_KEY với Web Backend & Mobile Backend để xác thực token của cả hai bên
    SECRET_KEY: str  # bắt buộc, đọc từ biến môi trường / .env
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")

    # Khóa bí mật để các backend gửi sự kiện qua API nội bộ
    INTERNAL_API_KEY: str  # bắt buộc, đọc từ biến môi trường / .env

    class Config:
        case_sensitive = True

settings = Settings()
