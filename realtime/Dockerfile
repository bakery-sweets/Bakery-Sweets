# Realtime Server — Python FastAPI WebSocket (Port 8001)
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ORM models dùng chung (thư mục common/ ở gốc repo, truyền vào qua additional_contexts của docker-compose)
COPY --from=common . /common
ENV PYTHONPATH=/common

COPY . .

EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]
