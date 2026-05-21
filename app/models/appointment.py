from pydantic import BaseModel
from datetime import date, time, datetime
from uuid import UUID
from typing import Optional

class AppointmentBase(BaseModel):
    appointment_date: date
    appointment_time: Optional[time] = None
    symptoms: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    pass

class MedicalResultResponse(BaseModel):
    id: UUID
    appointment_id: UUID
    diagnosis: str
    prescription: Optional[str] = None
    doctor_notes: Optional[str] = None
    attachment_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AppointmentResponse(AppointmentBase):
    id: UUID
    patient_id: UUID
    doctor_id: Optional[UUID] = None
    status: str
    note: Optional[str] = None
    medical_result: Optional[MedicalResultResponse] = None
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

class MedicalResultCreate(BaseModel):
    diagnosis: str
