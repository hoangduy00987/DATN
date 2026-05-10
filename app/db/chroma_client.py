from dotenv import load_dotenv
import chromadb
from app.core.config import settings

load_dotenv()

CHROMA_DIR = settings.CHROMA_DIR

def get_chroma_client():
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    return client

def get_collection(collection_name: str):
    client = get_chroma_client()
    collection = client.get_or_create_collection(name=collection_name)
    return collection


def load_db():
    return get_collection(settings.COLLECTION_NAME)