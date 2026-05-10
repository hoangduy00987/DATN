from fastapi import HTTPException
from app.db.chroma_client import load_db
from app.services.embedding_service import get_embedding

def retrieve(collection, query: str, top_k: int = 50):
    query_embedding = get_embedding(query)
    
    if query_embedding is None:
        raise HTTPException(status_code=400, detail="Error in generating query embedding.")
    
    results = collection.query(query_embeddings=[query_embedding], n_results=top_k)
    return results.get("metadatas", [[]])[0]


def retrieve_documents(query: str, top_k: int = 30):
    collection = load_db()
    return retrieve(collection, query, top_k)