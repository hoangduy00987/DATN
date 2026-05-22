"""
Appointment repository — encapsulates all DB access for
the `appointments` and `medical_results` tables.
"""
from datetime import date as date_type
from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.models import Appointment, MedicalResult, User, RoleEnum


class AppointmentRepository:
    """Static-method repository for Appointment / MedicalResult entities."""

    @staticmethod
    def create(
        db: Session,
        patient_id,
        appointment_date: date_type,
        appointment_time=None,
        symptoms: Optional[str] = None,
        doctor_id: Optional[str] = None,
    ) -> Appointment:
        """Create and persist a new Appointment."""
        new_appt = Appointment(
            patient_id=patient_id,
            doctor_id=doctor_id,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            symptoms=symptoms,
            status="booked",
        )
        db.add(new_appt)
        db.commit()
        db.refresh(new_appt)
        return new_appt

    @staticmethod
    def get_by_patient(db: Session, patient_id) -> list[Appointment]:
        """Return all appointments belonging to a patient, newest first."""
        return (
            db.query(Appointment)
            .filter(Appointment.patient_id == patient_id)
            .order_by(Appointment.appointment_date.desc())
            .all()
        )

    @staticmethod
    def get_all(
        db: Session,
        search: Optional[str] = None,
        date: Optional[date_type] = None,
        status: Optional[str] = None,
        doctor_id: Optional[str] = None,
    ) -> list[Appointment]:
        """Return appointments with optional filters (for doctor/admin)."""
        query = db.query(Appointment).join(Appointment.patient)
        search_value = search.strip() if search else ""

        if doctor_id:
            query = query.filter(Appointment.doctor_id == doctor_id)

        if date:
            query = query.filter(Appointment.appointment_date == date)

        if status and status.strip() and status != "all":
            query = query.filter(Appointment.status == status)

        if search_value:
            query = query.filter(
                or_(
                    User.full_name.ilike(f"%{search_value}%"),
                    User.phone.ilike(f"%{search_value}%"),
                    Appointment.symptoms.ilike(f"%{search_value}%"),
                )
            )

        return query.order_by(
            Appointment.appointment_date.desc(),
            Appointment.appointment_time.asc(),
        ).all()

    @staticmethod
    def get_by_id(db: Session, appointment_id: str) -> Appointment | None:
        """Return a single Appointment by its UUID string, or None."""
        return db.query(Appointment).filter(Appointment.id == appointment_id).first()

    @staticmethod
    def update(db: Session, appointment: Appointment, update_data: dict) -> Appointment:
        """Apply a dict of field updates to an Appointment and persist."""
        for field, value in update_data.items():
            setattr(appointment, field, value)
        db.commit()
        db.refresh(appointment)
        return appointment

    @staticmethod
    def cancel(db: Session, appointment: Appointment) -> Appointment:
        """Mark an Appointment as cancelled."""
        appointment.status = "cancelled"
        db.commit()
        db.refresh(appointment)
        return appointment

    @staticmethod
    def upsert_medical_result(
        db: Session,
        appointment: Appointment,
        diagnosis: str,
        doctor_id=None,
    ) -> Appointment:
        """
        Create or update the MedicalResult for an appointment.
        Sets appointment status to 'completed'.
        """
        result = (
            db.query(MedicalResult)
            .filter(MedicalResult.appointment_id == appointment.id)
            .first()
        )
        if result:
            result.diagnosis = diagnosis
        else:
            result = MedicalResult(appointment_id=appointment.id, diagnosis=diagnosis)
            db.add(result)

        appointment.status = "completed"
        if doctor_id is not None:
            appointment.doctor_id = doctor_id

        db.commit()
        db.refresh(appointment)
        return appointment
