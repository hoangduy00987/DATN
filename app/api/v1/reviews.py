from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.schemas.review import ReviewCreate, ReviewOut
from app.services.review_service import ReviewService
from app.api.v1.auth import get_current_user
from app.db.models import User
from typing import List
from uuid import UUID

router = APIRouter()

@router.post("/", response_model=ReviewOut)
def create_review(
    review_in: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Chỉ bệnh nhân mới có thể gửi đánh giá.")
    return ReviewService.create_review(db, current_user.id, review_in)

@router.get("/public")
def get_public_reviews(db: Session = Depends(get_db)):
    return ReviewService.get_public_reviews(db)

@router.get("/my-review/{doctor_id}")
def get_my_review_for_doctor(
    doctor_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    review = ReviewService.get_my_review_for_doctor(db, current_user.id, doctor_id)
    if not review:
        return {"rating": 0, "comment": ""}
    return {
        "rating": int(review.rating),
        "comment": review.comment
    }
