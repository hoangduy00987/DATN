import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    COHERE_API_KEY = os.getenv("COHERE_API_KEY")
    CHROMA_DIR = "./data/chroma_db"
    COLLECTION_NAME = "lung_rag"
    INPUT_FILE = "data/processed/output_rag_ready.jsonl"
    EMBED_URL = os.getenv(
        "EMBED_URL",
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent",
    )
    GEN_URL = os.getenv(
        "GEN_URL",
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    )
    # Detection model configuration (leave empty; user will provide path later)
    DETECTION_MODEL_PATH = os.getenv("DETECTION_MODEL_PATH", "")
    XRAY_CHECK_MODEL_PATH = os.getenv("XRAY_CHECK_MODEL_PATH", "")
    DETECTION_CONFIDENCE_THRESHOLD = float(os.getenv("DETECTION_CONFIDENCE_THRESHOLD", "0.5"))

    # SMTP Configuration for Email
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_FROM = os.getenv("MAIL_FROM")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "Lung System")

    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


settings = Config()
