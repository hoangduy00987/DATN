from pydantic import BaseModel
from datetime import date, time, datetime
from uuid import UUID
from typing import Optional, List

class AppointmentBase(BaseModel):
    appointment_date: date
    appointment_time: Optional[time] = None
    symptoms: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentResponse(AppointmentBase):
    id: UUID
    patient_id: UUID
    doctor_id: Optional[UUID] = None
    status: str
    note: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AppointmentUpdate(BaseModel):
    appointment_date: Optional[date] = None
    appointment_time: Optional[time] = None
    symptoms: Optional[str] = None
    note: Optional[str] = None
    status: Optional[str] = None
