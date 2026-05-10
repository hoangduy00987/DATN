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

from app.services.embedding_service import get_embedding
from app.core.config import settings

client = chromadb.PersistentClient(path=CHROMA_DIR)
collection = client.get_or_create_collection(name=COLLECTION_NAME)

def format_record(raw_record: dict) -> dict:
    """Ensure data follows the required schema for embedding with 1000 char limit on content."""
    doc = raw_record.get("document", {})
    question = doc.get("question", "").strip()
    
    # Truncate content to 1000 characters
    content = doc.get("content", "").strip()
    if len(content) > 1000:
        content = content[:1000] + "..."
        
    answer = doc.get("answer", "").strip()
    
    # Construct embedding_text if missing (using truncated content)
    embedding_text = raw_record.get("embedding_text")
    if not embedding_text:
        embedding_text = f"Người dùng hỏi: {question}\nThông tin liên quan: {content}\nCâu trả lời chính xác: {answer}"
    elif len(embedding_text) > 2000: # Optional safety cap for existing embedding_text
        embedding_text = embedding_text[:2000]
    
    metadata = raw_record.get("metadata", {})
    
    return {
        "id": raw_record.get("id"),
        "embedding_text": embedding_text,
        "metadata": metadata,
        "document": {
            "question": question,
            "content": content,
            "answer": answer
        }
    }

def process_and_ingest(records: list[dict]):
    """Process records and ingest them into ChromaDB."""
    if not GEMINI_API_KEY:
        print("❌ Missing GEMINI_API_KEY")
        return

    total = 0
    skipped = 0

    for i, raw_record in enumerate(records):
        try:
            record = format_record(raw_record)
            
            embedding_text = record["embedding_text"].strip()
            if not embedding_text:
                print(f"⚠️ Skip record {i}: missing embedding_text")
                skipped += 1
                continue

            embedding = get_embedding(embedding_text)
            if embedding is None:
                skipped += 1
                continue

            # Sanitize metadata for ChromaDB
            doc_fields = record["document"]
            metadata = sanitize_metadata({
                **record["metadata"],
                "question": doc_fields["question"],
                "answer": doc_fields["answer"],
                "content": doc_fields["content"],
            })

            record_id = str(record.get("id") or f"bg-{i}-{os.urandom(4).hex()}")
            collection.upsert(
                ids=[record_id],
                embeddings=[embedding],
                documents=[embedding_text],
                metadatas=[metadata],
            )

            total += 1
        except Exception as e:
            print(f"❌ Error processing record {i}: {e}")
            skipped += 1

    print(f"\n🎉 Background Ingestion DONE: {total} processed, {skipped} skipped.")

def ingest():
    """Legacy ingest function for reading from file."""
    if not os.path.exists(INPUT_FILE):
        print(f"❌ File not found: {INPUT_FILE}")
        return

    records = []
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    records.append(json.loads(line))
                except:
                    continue
    
    process_and_ingest(records)

def extract_text_from_pdf(file_bytes: bytes) -> str:
    import io
    import PyPDF2
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in pdf_reader.pages:
            text += (page.extract_text() or "") + "\n"
        return text
    except Exception as e:
        print(f"❌ Error extracting PDF: {e}")
        return ""

def extract_text_from_docx(file_bytes: bytes) -> str:
    import io
    from docx import Document
    try:
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join([para.text for para in doc.paragraphs])
    except Exception as e:
        print(f"❌ Error extracting DOCX: {e}")
        return ""

def process_file_and_ingest(file_content: bytes, filename: str):
    """Extract text from file, chunk it, and ingest into ChromaDB."""
    ext = filename.split(".")[-1].lower()
    if ext == "pdf":
        text = extract_text_from_pdf(file_content)
    elif ext in ["doc", "docx"]:
        text = extract_text_from_docx(file_content)
    else:
        print(f"⚠️ Unsupported file extension: {ext}")
        return

    if not text.strip():
        print(f"⚠️ No text extracted from {filename}")
        return

    # Chunk text into segments of ~1000 characters
    chunk_size = 1000
    chunks = [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]
    
    records = []
    for i, chunk in enumerate(chunks):
        records.append({
            "id": f"{filename}-chunk-{i}-{os.urandom(2).hex()}",
            "document": {
                "question": f"Thông tin từ tệp {filename} (đoạn {i+1})",
                "content": chunk,
                "answer": "Thông tin được trích xuất từ tài liệu đính kèm."
            },
            "metadata": {
                "source": filename,
                "type": "document_upload"
            }
        })
    
    process_and_ingest(records)

__all__ = ["process_and_ingest", "ingest", "process_file_and_ingest"]