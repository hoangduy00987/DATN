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
        new_appt = AppointmentRepository.create(
            db=db,
            patient_id=current_user.id,
            appointment_date=data.appointment_date,
            appointment_time=data.appointment_time,
            symptoms=data.symptoms,
            doctor_id=data.doctor_id,
        )

        from app.repositories.notification_repository import NotificationRepository
        formatted_date = new_appt.appointment_date.strftime("%d/%m/%Y")
        
        # Notify Patient
        NotificationRepository.create(
            db,
            user_id=current_user.id,
            title="Đặt lịch thành công",
            message=f"Bạn đã đặt lịch khám thành công cho ngày {formatted_date}.",
            link=f"/chat/lich-da-dat?highlight={new_appt.id}"
        )
        
        # Notify Doctor
        NotificationRepository.create(
            db,
            user_id=data.doctor_id,
            title="Lịch khám mới được phân công",
            message=f"Bệnh nhân {current_user.full_name} vừa đăng ký khám với bạn vào ngày {formatted_date} lúc {new_appt.appointment_time}.",
            link=f"/chat/lich-da-dat?highlight={new_appt.id}"
        )

        return new_appt

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
        # Trưởng hợp là bác sĩ: chỉ xem được lịch đã gán cho mình
        doctor_id = current_user.id if current_user.role == RoleEnum.doctor else None
        
        return AppointmentRepository.get_all(
            db, 
            search=search, 
            date=date, 
            status=status,
            doctor_id=doctor_id
        )

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
        from app.repositories.notification_repository import NotificationRepository
        formatted_date = appointment.appointment_date.strftime("%d/%m/%Y")
        
        # Notify the other party
        target_user_id = appointment.patient_id if current_user.id != appointment.patient_id else (appointment.doctor_id or appointment.patient_id)
        
        NotificationRepository.create(
            db,
            user_id=target_user_id,
            title="Lịch khám đã bị hủy",
            message=f"Lịch khám ngày {formatted_date} đã bị hủy.",
            link=f"/chat/lich-da-dat?highlight={appointment.id}"
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

        from app.repositories.notification_repository import NotificationRepository
        
        doctor_id = current_user.id if current_user.role == RoleEnum.doctor else None
        updated_appointment = AppointmentRepository.upsert_medical_result(
            db, appointment, diagnosis, doctor_id=doctor_id
        )

        # Format ngày theo dd/mm/yyyy
        formatted_date = appointment.appointment_date.strftime("%d/%m/%Y")

        NotificationRepository.create(
            db,
            user_id=appointment.patient_id,
            title="Kết quả khám mới",
            message=f"Bác sĩ đã gửi kết quả khám cho lịch hẹn ngày {formatted_date}.",
            link=f"/chat/lich-da-dat?highlight={appointment.id}"
        )

        return updated_appointment

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
    @staticmethod
    def get_available_doctors(db: Session, date: date_type, time: str) -> list[User]:
        from app.repositories.user_repository import UserRepository
        from app.db.models import Appointment

        # Get all doctors
        doctors = UserRepository.get_doctors(db)
        
        # Get doctor IDs who already have an appointment at this specific date and time
        # (Excluding cancelled ones if you want, but better safe)
        busy_doctor_ids = (
            db.query(Appointment.doctor_id)
            .filter(
                Appointment.appointment_date == date,
                Appointment.appointment_time == time,
                Appointment.doctor_id.isnot(None),
                Appointment.status != "cancelled"
            )
            .all()
        )
        busy_ids = {str(row[0]) for row in busy_doctor_ids}
        
        # Filter available doctors
        return [d for d in doctors if str(d.id) not in busy_ids]

    @staticmethod
    def assign_doctor(db: Session, appointment_id: str, doctor_id: str, current_user: User) -> Appointment:
        if current_user.role != RoleEnum.admin:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền sắp xếp lịch khám.")

        appointment = AppointmentRepository.get_by_id(db, appointment_id)
        if not appointment:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Không tìm thấy lịch khám.")

        # Update appointment
        appointment = AppointmentRepository.update(db, appointment, {
            "doctor_id": doctor_id,
            "status": "confirmed"  # Đã tiếp nhận
        })

        from app.repositories.notification_repository import NotificationRepository
        formatted_date = appointment.appointment_date.strftime("%d/%m/%Y")

        # 1. Notify the Doctor
        NotificationRepository.create(
            db,
            user_id=doctor_id,
            title="Lịch khám mới được phân công",
            message=f"Bạn đã được phân công khám cho bệnh nhân vào ngày {formatted_date} lúc {appointment.appointment_time}.",
            link=f"/chat/lich-da-dat?highlight={appointment.id}"
        )

        # 2. Notify the Patient
        NotificationRepository.create(
            db,
            user_id=appointment.patient_id,
            title="Lịch khám đã được sắp xếp",
            message=f"Lịch khám ngày {formatted_date} của bạn đã được sắp xếp bác sĩ.",
            link=f"/chat/lich-da-dat?highlight={appointment.id}"
        )

        return appointment
