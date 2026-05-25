from sqlalchemy.orm import Session
from app.repositories.review_repository import ReviewRepository
from app.repositories.appointment_repository import AppointmentRepository
from app.models.schemas.review import ReviewCreate, ReviewOut
from uuid import UUID
from fastapi import HTTPException, status

class ReviewService:
    @staticmethod
    def create_review(db: Session, patient_id: UUID, review_in: ReviewCreate):
        # Check if appointment exists and belongs to patient
        appointment = AppointmentRepository.get_by_id(db, review_in.appointment_id)
        if not appointment:
            raise HTTPException(status_code=404, detail="Không tìm thấy lịch hẹn.")
        
        if str(appointment.patient_id) != str(patient_id):
            raise HTTPException(status_code=403, detail="Bạn không có quyền đánh giá lịch hẹn này.")
        
        if appointment.status != "completed":
            raise HTTPException(status_code=400, detail="Chỉ có thể đánh giá lịch hẹn đã hoàn thành.")
        
        if not appointment.doctor_id:
            raise HTTPException(status_code=400, detail="Lịch hẹn này chưa có bác sĩ phụ trách.")

        # Check if already reviewed this doctor
        existing = ReviewRepository.get_by_patient_doctor(db, patient_id, appointment.doctor_id)
        if existing:
            return ReviewRepository.update(
                db,
                review=existing,
                appointment_id=review_in.appointment_id,
                rating=review_in.rating,
                comment=review_in.comment
            )

        return ReviewRepository.create(
            db, 
            appointment_id=review_in.appointment_id,
            patient_id=patient_id,
            doctor_id=appointment.doctor_id,
            rating=review_in.rating,
            comment=review_in.comment
        )

    @staticmethod
    def get_public_reviews(db: Session, limit: int = 6):
        reviews = ReviewRepository.get_all(db, limit=limit)
        results = []
        for r in reviews:
            results.append({
                "id": r.id,
                "doctor_name": r.doctor.full_name,
                "patient_name": r.patient.full_name,
                "rating": int(r.rating),
                "comment": r.comment,
                "created_at": r.created_at,
                "avatar": "👩‍⚕️" if r.doctor.gender == "Nữ" else "👨‍⚕️"
            })
        return results

    @staticmethod
    def get_my_review_for_doctor(db: Session, patient_id: UUID, doctor_id: UUID):
        return ReviewRepository.get_by_patient_doctor(db, patient_id, doctor_id)
