from fastapi import FastAPI
from app.api.v1.chat import router as chat_router
from app.api.v1.detect import router as detect_router

app = FastAPI()

app.include_router(chat_router, prefix="/api/v1/chat", tags=["chat"])
app.include_router(detect_router, prefix="/api/v1/detect", tags=["detect"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI RAG Chatbot!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)