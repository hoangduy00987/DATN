"""
Ingest service — manages file ingestion tasks into ChromaDB.

TASK_STATUS (in-memory store) is now owned here, not in the controller.
"""
import uuid
from app.services.ingest_service import process_file_and_ingest

# In-memory task status store.
# In production, replace with Redis or a persistent DB table.
TASK_STATUS: dict[str, str] = {}


class IngestService:
    """Manages background ingestion tasks."""

    @staticmethod
    def start_ingest(content: bytes, filename: str) -> str:
        """
        Register a new background task, return its task_id.
        Actual processing must be triggered separately via run_background_task().
        """
        task_id = str(uuid.uuid4())
        TASK_STATUS[task_id] = "processing"
        return task_id

    @staticmethod
    def run_background_task(task_id: str, content: bytes, filename: str) -> None:
        """
        Synchronous function intended to run inside FastAPI BackgroundTasks.
        Updates TASK_STATUS when complete.
        """
        try:
            success = process_file_and_ingest(content, filename)
            TASK_STATUS[task_id] = "success" if success else "failed"
        except Exception as e:
            print(f"Error in background ingest task {task_id}: {e}")
            TASK_STATUS[task_id] = "failed"

    @staticmethod
    def get_status(task_id: str) -> str | None:
        """Return the current status string for a task_id, or None if not found."""
        return TASK_STATUS.get(task_id)
