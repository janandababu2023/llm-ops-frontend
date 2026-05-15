# ------------------------------------------
# IMPORT LIBRARIES
# ------------------------------------------
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import UploadFile
from fastapi import File
# shutil is the predefined python library
# shutil, used to receive pdf files and save to local path
import shutil
from rag1 import (
    read_pdf,
    chunk_text,
    create_embeddings,
    store_in_chromadb,
    search_query,
    generate_answer,
    collection
)
# ------------------------------------------
# CREATE FASTAPI APP
# app - get,post,put,delete,head,trace,options,patch
# ------------------------------------------
app = FastAPI()
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
# PDF UPLOAD API
# ------------------------------------------
@app.post("/upload-pdf/")
async def upload_pdf(file: UploadFile = File(...)):
    # Save uploaded PDF
    pdf_path = f"../uploads/{file.filename}"
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