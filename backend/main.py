# ------------------------------------------
# IMPORT LIBRARIES
# ------------------------------------------
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import UploadFile
from fastapi import File
from contextlib import asynccontextmanager
import shutil
import os

from rag import (
    read_pdf,
    chunk_text,
    create_embeddings,
    store_in_chromadb,
    search_query,
    generate_answer,
    collection
)

# ------------------------------------------
# UPLOAD DIRECTORY
# os.path.dirname(__file__) = /app/backend
# so UPLOAD_DIR = /app/backend/uploads
# Auto-created on startup if not exists
# ------------------------------------------
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")

# ------------------------------------------
# LIFESPAN
# Runs once on startup — creates uploads folder
# automatically if it does not exist
# ------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    print(f"✅ Upload directory ready: {UPLOAD_DIR}")
    yield
    print("🛑 Server shutting down...")

# ------------------------------------------
# CREATE FASTAPI APP
# app - get,post,put,delete,head,trace,options,patch
# ------------------------------------------
app = FastAPI(lifespan=lifespan)

# ------------------------------------------
# ADD CORS MIDDLEWARE
# ------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------
# HOME API
# ------------------------------------------
@app.get("/")
def home():
    return {
        "message": "LLM RAG Project Running"
    }

# ------------------------------------------
# HEALTH CHECK API
# Used by Docker HEALTHCHECK and load balancers
# ------------------------------------------
@app.get("/health")
def health():
    return {
        "status": "ok"
    }

# ------------------------------------------
# PDF UPLOAD API
# ------------------------------------------
@app.post("/upload-pdf/")
async def upload_pdf(file: UploadFile = File(...)):
    # Save uploaded PDF to dynamic uploads directory
    pdf_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(pdf_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # STEP 1 : READ PDF
    text = read_pdf(pdf_path)
    # STEP 2 : CHUNK TEXT
    chunks = chunk_text(text)
    # STEP 3 : CREATE EMBEDDINGS
    embeddings = create_embeddings(chunks)
    # STEP 4 : STORE IN CHROMADB
    store_in_chromadb(chunks, embeddings)

    return {
        "message": "PDF Uploaded Successfully",
        "total_chunks": len(chunks)
    }

# ------------------------------------------
# ASK QUESTION API
# ------------------------------------------
@app.get("/ask/")
def ask_question(question: str):
    # SEARCH RELEVANT CHUNKS
    results = search_query(question)
    documents = results['documents'][0]
    # CREATE CONTEXT
    context = " ".join(documents)
    # GENERATE FINAL ANSWER
    answer = generate_answer(question, context)
    return {
        "question": question,
        "answer": answer
    }

# ------------------------------------------
# VIEW CHROMADB DATA
# ------------------------------------------
@app.get("/view-data/")
def view_data():
    data = collection.get(
        include=["documents"]
    )
    return {
        "total_chunks": len(data["documents"]),
        "documents": data["documents"]
    }