# Web Backend — Python FastAPI (Port 5000)
FROM python:3.11-slim

WORKDIR /app

# Thiết lập biến môi trường Python
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Cài đặt thư viện hệ thống cần thiết
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Cài đặt Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ORM models dùng chung (thư mục common/ ở gốc repo, truyền vào qua additional_contexts của docker-compose)
COPY --from=common . /common
ENV PYTHONPATH=/common

# Copy source code
COPY . .

# Port 5000 cho Web Backend
EXPOSE 5000

# Chạy ứng dụng bằng Uvicorn trên port 5000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000", "--reload"]
