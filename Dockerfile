# ------------------------------------------------------------
# Dockerfile for LLM RAG Project
# Optimized for CPU-only + low EC2 disk usage
# ------------------------------------------------------------

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

COPY backend/requirements.txt .

# Install CPU-only PyTorch explicitly
RUN pip install --upgrade pip --root-user-action=ignore

RUN pip install \
    torch==2.7.1 \
    torchvision==0.22.1 \
    torchaudio==2.7.1 \
    --index-url https://download.pytorch.org/whl/cpu \
    --root-user-action=ignore

# Install app dependencies WITHOUT cache
RUN pip install --no-cache-dir \
    -r requirements.txt \
    --root-user-action=ignore

COPY backend/ .

RUN mkdir -p /app/backend/uploads

RUN useradd -m -u 1001 appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8000"]
