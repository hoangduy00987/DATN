import requests
import time
from fastapi import HTTPException
from app.db.chroma_client import load_db
from app.services.embedding_service import get_embedding
from app.core.config import settings

def rerank_documents(query: str, docs: list[dict], top_n: int = 10) -> list[dict]:
    """
    Rerank retrieved documents using Cohere's Multilingual Reranker API.
    Handles 429 Rate Limits automatically with exponential backoff.
    """
    cohere_key = settings.COHERE_API_KEY
    if not cohere_key:
        # Fallback to standard top_n if Cohere key is not configured
        return docs[:top_n]
        
    if not docs:
        return []

    # Deduplicate documents by content to avoid Cohere ranking duplicates
    unique_docs = []
    seen_contents = set()
    for doc in docs:
        content = doc.get("content") or doc.get("answer") or doc.get("question") or ""
        content_clean = content.strip().lower()
        if content_clean not in seen_contents:
            seen_contents.add(content_clean)
            unique_docs.append(doc)
    
    docs = unique_docs

    if not docs:
        return []

    # Extract clean text from each document for Cohere
    doc_texts = []
    for doc in docs:
        content = doc.get("content") or doc.get("answer") or doc.get("question") or ""
        doc_texts.append(content)

    max_attempts = 3
    for attempt in range(1, max_attempts + 1):
        try:
            res = requests.post(
                "https://api.cohere.ai/v1/rerank",
                headers={
                    "Authorization": f"Bearer {cohere_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "rerank-multilingual-v3.0",
                    "query": query,
                    "documents": doc_texts,
                    "top_n": top_n
                },
                timeout=15
            )
            
            if res.status_code == 200:
                rerank_results = res.json().get("results", [])
                reranked_docs = []
                for r in rerank_results:
                    idx = r.get("index")
                    if idx is not None and idx < len(docs):
                        reranked_docs.append(docs[idx])
                return reranked_docs
                
            elif res.status_code == 429:
                # 429 Rate Limit - retry with backoff
                wait_time = 15 * attempt
                print(f"⚠️ Cohere Rate Limit (429) hit. Đang chờ {wait_time}s trước khi thử lại...")
                time.sleep(wait_time)
                continue
                
            else:
                print(f"⚠️ Cohere Rerank API Error (Status {res.status_code}): {res.text}")
                return docs[:top_n]
                
        except Exception as e:
            print(f"⚠️ Cohere Rerank request failed: {e}")
            return docs[:top_n]
            
    # Fallback if all attempts fail
    return docs[:top_n]


def retrieve(collection, query: str, top_k: int = 50, top_n: int = 10):
    """
    Retrieve candidate documents from ChromaDB and rerank them using Cohere.
    """
    # If Cohere API Key is active, retrieve more candidates (e.g., top_k=100)
    # to allow the reranker to work on a larger and richer pool of documents.
    actual_top_k = max(top_k, 100) if settings.COHERE_API_KEY else top_k
    
    query_embedding = get_embedding(query)
    if query_embedding is None:
        raise HTTPException(status_code=400, detail="Error in generating query embedding.")
        
    results = collection.query(query_embeddings=[query_embedding], n_results=actual_top_k)
    docs = results.get("metadatas", [[]])[0]
    
    # Rerank candidates using Cohere
    return rerank_documents(query, docs, top_n=top_n)


def retrieve_documents(query: str, top_k: int = 5):
    """
    Legacy wrapper for document retrieval (now using Cohere Rerank by default).
    """
    collection = load_db()
    # Retrieve 100 candidates from vector store, and rerank down to top_k
    return retrieve(collection, query, top_k=100, top_n=top_k)