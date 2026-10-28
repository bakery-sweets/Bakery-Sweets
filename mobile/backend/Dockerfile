# Mobile Backend — Python FastAPI

FROM python:3.12-slim
WORKDIR /app

# Cài dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ORM models dùng chung (thư mục common/ ở gốc repo, truyền vào qua additional_contexts của docker-compose)
COPY --from=common . /common
ENV PYTHONPATH=/common

# Copy source code
COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
