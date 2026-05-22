import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum, Date, Time, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
import enum

Base = declarative_base()

class RoleEnum(str, enum.Enum):
    doctor = "doctor"
    patient = "patient"
    admin = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(Enum(RoleEnum), default=RoleEnum.patient, nullable=False)
    avatar_url = Column(Text, nullable=True)
    status = Column(String(50), default="active")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    patient_appointments = relationship("Appointment", foreign_keys="[Appointment.patient_id]", back_populates="patient")
    doctor_appointments = relationship("Appointment", foreign_keys="[Appointment.doctor_id]", back_populates="doctor")
    reviewed_documents = relationship("CrawledDocument", back_populates="reviewer")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(Time, nullable=True)
    symptoms = Column(Text, nullable=True)
    status = Column(String(50), default="pending")  # pending, confirmed, completed, cancelled
    note = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    patient = relationship("User", foreign_keys=[patient_id], back_populates="patient_appointments")
    doctor = relationship("User", foreign_keys=[doctor_id], back_populates="doctor_appointments")
    medical_result = relationship("MedicalResult", back_populates="appointment", uselist=False)


class MedicalResult(Base):
    __tablename__ = "medical_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    appointment_id = Column(UUID(as_uuid=True), ForeignKey("appointments.id"), nullable=False, unique=True)
    
    diagnosis = Column(Text, nullable=False)
    prescription = Column(Text, nullable=True)
    doctor_notes = Column(Text, nullable=True)
    attachment_url = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    appointment = relationship("Appointment", back_populates="medical_result")


class CrawledDocument(Base):
    __tablename__ = "crawled_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    query = Column(String(255), nullable=True)
    source_url = Column(Text, nullable=True)
    title = Column(String(500), nullable=True)
    content = Column(Text, nullable=False)
    ai_answer = Column(Text, nullable=True)
    
    review_status = Column(String(50), default="pending")  # pending, approved, rejected
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    
    embedding_status = Column(String(50), default="not_embedded")  # not_embedded, processing, done, failed
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reviewer = relationship("User", back_populates="reviewed_documents")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String(255), nullable=True) # Adding link field
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", backref="notifications")
