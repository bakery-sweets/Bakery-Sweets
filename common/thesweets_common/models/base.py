from sqlalchemy.orm import declarative_base

# Base chung cho mọi bảng CSDL; mỗi server tự tạo engine/session của riêng mình
Base = declarative_base()
