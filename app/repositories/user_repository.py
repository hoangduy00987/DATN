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
    def create(
        db: Session,
        email: str,
        full_name: str,
        password_hash: str,
        role: RoleEnum = RoleEnum.patient,
    ) -> User:
        """Create and persist a new User, then return it."""
        new_user = User(
            email=email,
            full_name=full_name,
            password_hash=password_hash,
            role=role,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
