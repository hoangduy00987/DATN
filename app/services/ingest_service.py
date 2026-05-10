import json
import os
import requests
from dotenv import load_dotenv
import chromadb

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

INPUT_FILE = "data/processed/output_rag_ready.jsonl"
CHROMA_DIR = "./data/chroma_db"
COLLECTION_NAME = "lung_rag"

def sanitize_metadata(data: dict):
    clean = {}
    for key, value in (data or {}).items():
        if value is None:
            continue
        if isinstance(value, (str, int, float, bool)):
            clean[key] = value
        else:
            clean[key] = str(value)
    return clean

def get_embedding(text: str):
    try:
        res = requests.post(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent",
            headers={"Content-Type": "application/json"},
            params={"key": GEMINI_API_KEY},
            json={
                "model": "models/embedding-001",
                "content": {"parts": [{"text": text}]},
            },
            timeout=30,
        )

        if res.status_code != 200:
            print("❌ Embedding error:", res.text)
            return None

        return res.json()["embedding"]["values"]

    except Exception as e:
        print("❌ Request error:", e)
        return None

client = chromadb.PersistentClient(path=CHROMA_DIR)
collection = client.get_or_create_collection(name=COLLECTION_NAME)

def ingest():
    if not GEMINI_API_KEY:
        raise RuntimeError("Missing GEMINI_API_KEY")

    total = 0
    skipped = 0

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                skipped += 1
                continue

            try:
                record = json.loads(line)
            except json.JSONDecodeError as e:
                print(f"⚠️ Skip line {line_no}: JSON error - {e}")
                skipped += 1
                continue

            embedding_text = (record.get("embedding_text") or "").strip()
            if not embedding_text:
                print(f"⚠️ Skip line {line_no}: missing embedding_text")
                skipped += 1
                continue

            embedding = get_embedding(embedding_text)
            if embedding is None:
                skipped += 1
                continue

            doc = record.get("document") or {}
            question = (doc.get("question") or "").strip()
            content = (doc.get("content") or "").strip()
            answer = (doc.get("answer") or "").strip()

            base_meta = record.get("metadata") or {}
            metadata = sanitize_metadata({
                "type": base_meta.get("type"),
                "source": base_meta.get("source"),
                "question": question,
                "answer": answer,
                "content": content,
            })

            record_id = str(record.get("id") or f"row-{line_no}")
            collection.upsert(
                ids=[record_id],
                embeddings=[embedding],
                documents=[embedding_text],
                metadatas=[metadata],
            )

            total += 1
            if total % 10 == 0:
                print(f"✅ Embedded {total}")

    print("\n🎉 DONE")
    print("Total embedded:", total)
    print("Total skipped:", skipped)