from pydantic import BaseModel, conint
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class ReviewBase(BaseModel):
    rating: int
    comment: Optional[str] = None

class ReviewCreate(ReviewBase):
    appointment_id: UUID

class ReviewUpdate(ReviewBase):
    pass

class ReviewOut(ReviewBase):
    id: UUID
    appointment_id: UUID
    patient_id: UUID
    doctor_id: UUID
    created_at: datetime
    
    # Nested info for frontend
    doctor_name: Optional[str] = None
    patient_name: Optional[str] = None

    class Config:
        from_attributes = True
