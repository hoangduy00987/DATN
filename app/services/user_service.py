from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.repositories.user_repository import UserRepository
from app.models.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash

class UserService:
    @staticmethod
    def get_users(db: Session, skip: int = 0, limit: int = 100):
        return UserRepository.get_all(db, skip=skip, limit=limit)

    @staticmethod
    def get_user(db: Session, user_id: str):
        user = UserRepository.get_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

    @staticmethod
    def create_user(db: Session, data: UserCreate):
        existing = UserRepository.get_by_email(db, data.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        password_hash = get_password_hash(data.password)
        return UserRepository.create(
            db, 
            email=data.email, 
            full_name=data.full_name, 
            password_hash=password_hash, 
            role=data.role,
            phone=data.phone
        )

    @staticmethod
    def update_user(db: Session, user_id: str, data: UserUpdate):
        user = UserRepository.get_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        update_data = data.dict(exclude_unset=True)
        if "password" in update_data and update_data["password"]:
            update_data["password_hash"] = get_password_hash(update_data.pop("password"))
        
        return UserRepository.update(db, user, update_data)

    @staticmethod
    def delete_user(db: Session, user_id: str):
        user = UserRepository.get_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        UserRepository.delete(db, user)
        return {"message": "User deleted successfully"}
