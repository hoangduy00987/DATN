import asyncio
import uuid
from typing import Annotated
from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File, Depends
from app.services.ingest_service import process_file_and_ingest
from app.core.security import get_current_doctor
from app.db.models import User

router = APIRouter()

# In-memory status store
# In production, use Redis or database
TASK_STATUS = {}

def run_ingest_and_update_status(task_id: str, content: bytes, filename: str):
    try:
        success = process_file_and_ingest(content, filename)
        if success:
            TASK_STATUS[task_id] = "success"
        else:
            TASK_STATUS[task_id] = "failed"
    except Exception as e:
        print(f"Error in background task {task_id}: {e}")
        TASK_STATUS[task_id] = "failed"

@router.post("/ingest", tags=["ingest"])
async def trigger_ingest(
    background_tasks: BackgroundTasks,
    file: Annotated[UploadFile, File(description="Tải lên tệp PDF hoặc DOC/DOCX để embedding")],
    current_user: User = Depends(get_current_doctor)
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
        raise HTTPException(status_code=500, detail="Không thể đọc nội dung tệp.")

    task_id = str(uuid.uuid4())
    TASK_STATUS[task_id] = "processing"
    
    # Add to background tasks
    background_tasks.add_task(run_ingest_and_update_status, task_id, content, filename)

    return {
        "status": "success",
        "task_id": task_id,
        "message": f"Đã bắt đầu tiến trình trích xuất và embedding dữ liệu từ tệp '{filename}' trong nền.",
    }

@router.get("/ingest/status/{task_id}", tags=["ingest"])
def get_task_status(task_id: str, current_user: User = Depends(get_current_doctor)):
    status = TASK_STATUS.get(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"task_id": task_id, "status": status}
