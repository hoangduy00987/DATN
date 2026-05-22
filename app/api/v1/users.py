from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.core.security import get_current_user
from app.db.models import User, RoleEnum
from app.models.schemas.user import UserOut, UserCreate, UserUpdate
from app.services.user_service import UserService

router = APIRouter()

def admin_required(current_user: User = Depends(get_current_user)):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@router.get("/", response_model=List[UserOut])
def list_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    _ = Depends(admin_required)
):
    return UserService.get_users(db, skip=skip, limit=limit)

@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: str, 
    db: Session = Depends(get_db),
    _ = Depends(admin_required)
):
    return UserService.get_user(db, user_id)

@router.post("/", response_model=UserOut)
def create_user(
    data: UserCreate, 
    db: Session = Depends(get_db),
    _ = Depends(admin_required)
):
    return UserService.create_user(db, data)

@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: str, 
    data: UserUpdate, 
    db: Session = Depends(get_db),
    _ = Depends(admin_required)
):
    return UserService.update_user(db, user_id, data)

@router.delete("/{user_id}")
def delete_user(
    user_id: str, 
    db: Session = Depends(get_db),
    _ = Depends(admin_required)
):
    return UserService.delete_user(db, user_id)
