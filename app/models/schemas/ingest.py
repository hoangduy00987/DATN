"""
Pydantic schemas for ingest endpoints.
"""
from pydantic import BaseModel


class IngestResponse(BaseModel):
    status: str
    task_id: str
    message: str


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
