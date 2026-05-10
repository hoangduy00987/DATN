from typing import Annotated
from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File
from app.services.ingest_service import process_file_and_ingest

router = APIRouter()

@router.post("/ingest", tags=["ingest"])
async def trigger_ingest(
    background_tasks: BackgroundTasks, 
    file: Annotated[UploadFile, File(description="Tải lên tệp PDF hoặc DOC/DOCX để embedding")]
):
    """
    Tải lên tệp PDF hoặc DOC/DOCX để trích xuất dữ liệu và embedding vào ChromaDB (chạy ngầm).
    """
    filename = file.filename or "unknown"
    ext = filename.split(".")[-1].lower()
    
    if ext not in ["pdf", "doc", "docx"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Định dạng tệp .{ext} không hỗ trợ. Vui lòng tải lên PDF, DOC hoặc DOCX."
        )

    try:
        content = await file.read()
        if not content:
            raise ValueError("Tệp không có nội dung.")
    except Exception:
        # Không truyền exception e vào detail để tránh lỗi Unicode khi encode lỗi
        raise HTTPException(status_code=500, detail="Không thể đọc nội dung tệp.")

    # Thêm tác vụ chạy ngầm để xử lý tệp
    background_tasks.add_task(process_file_and_ingest, content, filename)

    return {
        "status": "success",
        "message": f"Đã bắt đầu tiến trình trích xuất và embedding dữ liệu từ tệp '{filename}' trong nền.",
    }
