"""
User repository — encapsulates all DB access for the `users` table.
"""
from sqlalchemy.orm import Session
from app.db.models import User, RoleEnum


class UserRepository:
    """Static-method repository for User entity."""

    @staticmethod
    def get_by_email(db: Session, email: str) -> User | None:
        """Return the User with the given email, or None."""
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_by_id(db: Session, user_id) -> User | None:
        """Return the User with the given id, or None."""
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100):
        return db.query(User).offset(skip).limit(limit).all()

    @staticmethod
    def get_doctors(db: Session):
        """Return all users with the doctor role and active status."""
        return db.query(User).filter(User.role == RoleEnum.doctor, User.status == "active").all()
        
    @staticmethod
    def get_admins(db: Session):
        """Return all users with the admin role."""
        return db.query(User).filter(User.role == RoleEnum.admin).all()

    @staticmethod
    def create(
        db: Session,
        email: str,
        full_name: str,
        password_hash: str,
        role: RoleEnum = RoleEnum.patient,
        phone: str = None,
        status: str = "active",
    ) -> User:
        """Create and persist a new User, then return it."""
        new_user = User(
            email=email,
            full_name=full_name,
            password_hash=password_hash,
            role=role,
            phone=phone,
            status=status
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    @staticmethod
    def update(db: Session, user: User, data: dict) -> User:
        for key, value in data.items():
            if value is not None:
                setattr(user, key, value)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def delete(db: Session, user: User):
        db.delete(user)
        db.commit()
