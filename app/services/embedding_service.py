from dotenv import load_dotenv
import os
import requests

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

EMBED_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent"

def get_embedding(text: str):
    try:
        res = requests.post(
            EMBED_URL,
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