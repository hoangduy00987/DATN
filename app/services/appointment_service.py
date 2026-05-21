"""
Appointment service — business logic for appointment management.
"""
from datetime import date as date_type
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import Appointment, RoleEnum, User
from app.models.schemas.appointment import (
    AppointmentCreate,
    AppointmentUpdate,
    MedicalResultCreate,
)
from app.repositories.appointment_repository import AppointmentRepository


class AppointmentService:
    """Handles all appointment-related business logic."""

    @staticmethod
    def create(db: Session, current_user: User, data: AppointmentCreate) -> Appointment:
        """Tạo lịch khám mới cho patient hiện tại."""
        return AppointmentRepository.create(
            db=db,
            patient_id=current_user.id,
            appointment_date=data.appointment_date,
            appointment_time=data.appointment_time,
            symptoms=data.symptoms,
        )

    @staticmethod
    def get_mine(db: Session, current_user: User) -> list[Appointment]:
        """Lấy danh sách lịch khám của patient hiện tại."""
        return AppointmentRepository.get_by_patient(db, current_user.id)

    @staticmethod
    def get_all(
        db: Session,
        current_user: User,
        search: Optional[str] = None,
        date: Optional[date_type] = None,
        status: Optional[str] = None,
    ) -> list[Appointment]:
        """Lấy toàn bộ danh sách lịch khám (dành cho Doctor/Admin)."""
        if current_user.role not in [RoleEnum.doctor, RoleEnum.admin]:
            raise HTTPException(
                status_code=403,
                detail="Bạn không có quyền truy cập danh sách này.",
            )
        return AppointmentRepository.get_all(db, search=search, date=date, status=status)

    @staticmethod
    def get_detail(db: Session, current_user: User, appointment_id: str) -> Appointment:
        """Xem chi tiết một lịch khám."""
        appointment = AppointmentRepository.get_by_id(db, appointment_id)
        if not appointment:
            raise HTTPException(status_code=404, detail="Không tìm thấy lịch khám.")

        if (
            appointment.patient_id != current_user.id
            and current_user.role not in [RoleEnum.doctor, RoleEnum.admin]
        ):
            raise HTTPException(
                status_code=403,
                detail="Bạn không có quyền truy cập thông tin này.",
            )
        return appointment

    @staticmethod
    def cancel(db: Session, current_user: User, appointment_id: str) -> Appointment:
        """Hủy một lịch khám."""
        appointment = AppointmentRepository.get_by_id(db, appointment_id)
        if not appointment:
            raise HTTPException(status_code=404, detail="Không tìm thấy lịch khám.")

        if (
            appointment.patient_id != current_user.id
            and current_user.role not in [RoleEnum.doctor, RoleEnum.admin]
        ):
            raise HTTPException(
                status_code=403,
                detail="Bạn không có quyền thực hiện thao tác này.",
            )
        return AppointmentRepository.cancel(db, appointment)

    @staticmethod
    def send_result(
        db: Session,
        current_user: User,
        appointment_id: str,
        result_in: MedicalResultCreate,
    ) -> Appointment:
        """Bác sĩ/Admin gửi hoặc cập nhật kết quả khám."""
        if current_user.role not in [RoleEnum.doctor, RoleEnum.admin]:
            raise HTTPException(
                status_code=403, detail="Bạn không có quyền gửi kết quả khám."
            )

        diagnosis = (result_in.diagnosis or "").strip()
        if not diagnosis:
            raise HTTPException(
                status_code=400, detail="Kết quả khám không được để trống."
            )

        appointment = AppointmentRepository.get_by_id(db, appointment_id)
        if not appointment:
            raise HTTPException(status_code=404, detail="Không tìm thấy lịch khám.")

        if appointment.status == "cancelled":
            raise HTTPException(
                status_code=400,
                detail="Không thể gửi kết quả cho lịch đã hủy.",
            )

        doctor_id = current_user.id if current_user.role == RoleEnum.doctor else None
        return AppointmentRepository.upsert_medical_result(
            db, appointment, diagnosis, doctor_id=doctor_id
        )

    @staticmethod
    def update(
        db: Session,
        current_user: User,
        appointment_id: str,
        data: AppointmentUpdate,
    ) -> Appointment:
        """Cập nhật thông tin lịch khám."""
        appointment = AppointmentRepository.get_by_id(db, appointment_id)
        if not appointment:
            raise HTTPException(status_code=404, detail="Không tìm thấy lịch khám.")

        if (
            appointment.patient_id != current_user.id
            and current_user.role not in [RoleEnum.doctor, RoleEnum.admin]
        ):
            raise HTTPException(
                status_code=403,
                detail="Bạn không có quyền thực hiện thao tác này.",
            )

        update_data = data.dict(exclude_unset=True)
        return AppointmentRepository.update(db, appointment, update_data)
