"""
Appointments controller — handles HTTP routing only.
Business logic lives in app.services.appointment_service.AppointmentService.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date as date_type

from app.db.session import get_db
from app.db.models import User
from app.core.security import get_current_user
from app.models.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentUpdate,
    MedicalResultCreate,
)
from app.services.appointment_service import AppointmentService

router = APIRouter()


@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    appointment_in: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tạo lịch khám bệnh mới."""
    return AppointmentService.create(db, current_user, appointment_in)


@router.get("/my", response_model=List[AppointmentResponse])
def get_my_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách lịch khám của chính mình."""
    return AppointmentService.get_mine(db, current_user)


@router.get("/all", response_model=List[AppointmentResponse])
def get_all_appointments(
    search: Optional[str] = None,
    date: Optional[date_type] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy toàn bộ danh sách lịch khám (Dành cho Bác sĩ/Admin)."""
    return AppointmentService.get_all(db, current_user, search=search, date=date, status=status)

from app.models.schemas.user import UserOut

@router.get("/available-doctors", response_model=List[UserOut])
def get_available_doctors(
    date: date_type,
    time: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách bác sĩ rảnh vào ngày và giờ cụ thể."""
    return AppointmentService.get_available_doctors(db, date, time)


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment_detail(
    appointment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Xem chi tiết một lịch khám."""
    return AppointmentService.get_detail(db, current_user, appointment_id)


@router.patch("/{appointment_id}/cancel", response_model=AppointmentResponse)
def cancel_appointment(
    appointment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Hủy một lịch khám."""
    return AppointmentService.cancel(db, current_user, appointment_id)


@router.patch("/{appointment_id}/result", response_model=AppointmentResponse)
def send_medical_result(
    appointment_id: str,
    result_in: MedicalResultCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bác sĩ/Admin gửi hoặc cập nhật kết quả khám cho một lịch hẹn."""
    return AppointmentService.send_result(db, current_user, appointment_id, result_in)


@router.patch("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: str,
    appointment_in: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cập nhật thông tin lịch khám."""
    return AppointmentService.update(db, current_user, appointment_id, appointment_in)

@router.patch("/{appointment_id}/assign-doctor", response_model=AppointmentResponse)
def assign_doctor(
    appointment_id: str,
    doctor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin phân công bác sĩ cho một lịch khám."""
    return AppointmentService.assign_doctor(db, appointment_id, doctor_id, current_user)
