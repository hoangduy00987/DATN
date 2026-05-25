from sqlalchemy.orm import Session
from app.db.models import Review, User, Appointment
from uuid import UUID
from typing import List, Optional

class ReviewRepository:
    @staticmethod
    def create(db: Session, appointment_id: UUID, patient_id: UUID, doctor_id: UUID, rating: int, comment: str):
        new_review = Review(
            appointment_id=appointment_id,
            patient_id=patient_id,
            doctor_id=doctor_id,
            rating=str(rating),
            comment=comment
        )
        db.add(new_review)
        db.commit()
        db.refresh(new_review)
        return new_review

    @staticmethod
    def get_all(db: Session, limit: int = 10) -> List[Review]:
        return db.query(Review).order_by(Review.created_at.desc()).limit(limit).all()

    @staticmethod
    def get_by_doctor(db: Session, doctor_id: UUID) -> List[Review]:
        return db.query(Review).filter(Review.doctor_id == doctor_id).order_by(Review.created_at.desc()).all()

    @staticmethod
    def get_by_appointment(db: Session, appointment_id: UUID) -> Optional[Review]:
        return db.query(Review).filter(Review.appointment_id == appointment_id).first()

    @staticmethod
    def get_by_patient_doctor(db: Session, patient_id: UUID, doctor_id: UUID) -> Optional[Review]:
        return db.query(Review).filter(
            Review.patient_id == patient_id,
            Review.doctor_id == doctor_id
        ).first()

    @staticmethod
    def update(db: Session, review: Review, appointment_id: UUID, rating: int, comment: str):
        review.appointment_id = appointment_id
        review.rating = str(rating)
        review.comment = comment
        db.commit()
        db.refresh(review)
        return review
