"""
Ingest controller — handles HTTP routing only.
Business logic (task state management) lives in app.services.ingest_task_service.
"""
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile

from app.core.security import get_current_doctor
from app.db.models import User
from app.services.ingest_task_service import IngestService

router = APIRouter()


@router.post("/ingest", tags=["ingest"])
async def trigger_ingest(
    background_tasks: BackgroundTasks,
    file: Annotated[UploadFile, File(description="Tải lên tệp PDF hoặc DOC/DOCX để embedding")],
    current_user: User = Depends(get_current_doctor),
):
    """
    Tải lên tệp PDF hoặc DOC/DOCX để trích xuất dữ liệu và embedding vào ChromaDB (chạy ngầm).
    """
    filename = file.filename or "unknown"
    ext = filename.split(".")[-1].lower()

    if ext not in ["pdf", "doc", "docx"]:
        raise HTTPException(
            status_code=400,
            detail=f"Định dạng tệp .{ext} không hỗ trợ. Vui lòng tải lên PDF, DOC hoặc DOCX.",
        )

    try:
        content = await file.read()
        if not content:
            raise ValueError("Tệp không có nội dung.")
    except Exception:
        raise HTTPException(status_code=500, detail="Không thể đọc nội dung tệp.")

    task_id = IngestService.start_ingest(content, filename)
    background_tasks.add_task(IngestService.run_background_task, task_id, content, filename)

    return {
        "status": "success",
        "task_id": task_id,
        "message": f"Đã bắt đầu tiến trình trích xuất và embedding dữ liệu từ tệp '{filename}' trong nền.",
    }


@router.get("/ingest/status/{task_id}", tags=["ingest"])
def get_task_status(task_id: str, current_user: User = Depends(get_current_doctor)):
    """Trả về trạng thái của một ingest task."""
    status = IngestService.get_status(task_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"task_id": task_id, "status": status}
