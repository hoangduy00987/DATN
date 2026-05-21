"""
Repositories package — data access layer (DAL).
All direct SQLAlchemy / ChromaDB queries live here.
"""
from app.repositories.user_repository import UserRepository
from app.repositories.appointment_repository import AppointmentRepository

__all__ = ["UserRepository", "AppointmentRepository"]
