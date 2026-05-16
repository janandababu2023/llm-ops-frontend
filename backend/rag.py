"""
PdfReader is used to read data from pdf file
"""
import os
from pypdf import PdfReader

"""
SentenceTransformer is used to generate embeddings
"""
from sentence_transformers import SentenceTransformer

import chromadb
from openai import OpenAI

# Load embedding model only once
model = SentenceTransformer("all-MiniLM-L6-v2")

# Chroma persistent storage
CHROMA_DIR = os.getenv("CHROMA_DIR", "/app/chroma_data")

# Create directory if missing
os.makedirs(CHROMA_DIR, exist_ok=True)

# Connect local persistent DB
client = chromadb.PersistentClient(path=CHROMA_DIR)

# Create collection if not exists
collection = client.get_or_create_collection(
    name="pdf_data"
)


# ---------------------------
# Read PDF
# ---------------------------
def read_pdf(pdf_path):
    reader = PdfReader(pdf_path)

    text = ""

    for page in reader.pages:
        page_text = page.extract_text()

        if page_text:
            text += page_text + "\n"

    return text


# ---------------------------
# Create chunks
# ---------------------------
def chunk_text(text, chunk_size=500):

    chunks = []

    for i in range(0, len(text), chunk_size):

        chunk = text[i:i + chunk_size]

        if chunk.strip():
            chunks.append(chunk)

    return chunks


# ---------------------------
# Create embeddings
# ---------------------------
def create_embeddings(chunks):

    embeddings = model.encode(
        chunks,
        convert_to_numpy=True
    )

    return embeddings


# ---------------------------
# Store in ChromaDB
# ---------------------------
def store_in_chromadb(chunks, embeddings):

    try:

        ids = [f"chunk_{i}" for i in range(len(chunks))]

        collection.add(
            documents=chunks,
            embeddings=embeddings.tolist(),
            ids=ids
        )

        return "Data stored successfully"

    except Exception as e:

        return f"Store error: {str(e)}"


# ---------------------------
# Search
# ---------------------------
def search_query(question):

    query_embedding = model.encode(
        [question],
        convert_to_numpy=True
    )

    results = collection.query(
        query_embeddings=query_embedding.tolist(),
        n_results=2
    )

    return results


# ---------------------------
# Generate answer
# ---------------------------
def generate_answer(question, context):

    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY environment variable not found"
        )

    client_openai = OpenAI(
        api_key=api_key
    )

    prompt = f"""
Answer using only the provided context.

Context:
{context}

Question:
{question}
"""

    response = client_openai.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role":"user",
                "content":prompt
            }
        ]
    )

    return response.choices[0].message.content
