from fastapi import FastAPI
from app.api.v1.chat import router as chat_router
from app.api.v1.detect import router as detect_router
from app.api.v1.ingest import router as ingest_router

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import logging

app = FastAPI()

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    """Xử lý lỗi validation một cách an toàn, tránh UnicodeDecodeError với dữ liệu nhị phân."""
    logging.error(f"Validation error: {exc}")
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Dữ liệu yêu cầu không hợp lệ. Vui lòng kiểm tra lại định dạng file hoặc các trường dữ liệu.",
            "error_type": "RequestValidationError"
        },
    )

app.include_router(chat_router, prefix="/api/v1/chat", tags=["chat"])
app.include_router(detect_router, prefix="/api/v1/detect", tags=["detect"])
app.include_router(ingest_router, prefix="/api/v1/ingest", tags=["ingest"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI RAG Chatbot!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)