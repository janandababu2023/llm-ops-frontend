# ------------------------------------------------------------
# Dockerfile for LLM RAG Project
# NOTE: Using Python 3.12 here (NOT 3.14) for stability.
# Many ML libraries (sentence-transformers, chromadb, torch)
# do not yet have wheels for Python 3.14, which will cause
# pip install to fail or take forever to build from source.
# 3.12 is the safe "production" choice in May 2026.
# ------------------------------------------------------------
FROM python:3.12-slim

# Prevent Python from writing .pyc files & enable real-time logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# System dependencies (needed by some ML libs)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Working directory inside the container
WORKDIR /app

# Install Python dependencies first (caching layer)
# --no-cache-dir keeps the image small (no pip wheel cache left behind).
# CPU-only torch is pulled via the --extra-index-url in requirements.txt.
COPY backend/requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    rm -rf /root/.cache

# Copy backend application code
COPY backend/ ./backend/

# Create uploads directory (sibling of backend, matches main.py path)
RUN mkdir -p /app/uploads

# Expose FastAPI port
EXPOSE 8000

# Run from /app/backend so the relative "../uploads/..." path works
WORKDIR /app/backend

# Start the FastAPI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]



# # ------------------------------------------------------------
# # Dockerfile for LLM RAG Project
# # NOTE: Using Python 3.12 here (NOT 3.14) for stability.
# # Many ML libraries (sentence-transformers, chromadb, torch)
# # do not yet have wheels for Python 3.14, which will cause
# # pip install to fail or take forever to build from source.
# # 3.12 is the safe "production" choice in May 2026.
# # ------------------------------------------------------------
# FROM python:3.12-slim

# # Prevent Python from writing .pyc files & enable real-time logs
# ENV PYTHONDONTWRITEBYTECODE=1 \
#     PYTHONUNBUFFERED=1 \
#     PIP_NO_CACHE_DIR=1

# # System dependencies (needed by some ML libs)
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     build-essential \
#     curl \
#     && rm -rf /var/lib/apt/lists/*

# # Working directory inside the container
# WORKDIR /app

# # Install Python dependencies first (caching layer)
# COPY backend/requirements.txt .
# RUN pip install --upgrade pip && pip install -r requirements.txt

# # Copy backend application code
# COPY backend/ ./backend/

# # Create uploads directory (sibling of backend, matches main.py path)
# RUN mkdir -p /app/uploads

# # Expose FastAPI port
# EXPOSE 8000

# # Run from /app/backend so the relative "../uploads/..." path works
# WORKDIR /app/backend

# # Start the FastAPI server
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]