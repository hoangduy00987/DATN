"""
Backward-compatible re-export — do NOT remove this file.
Business code should import from app.models.schemas.appointment instead.
"""
# ruff: noqa: F401
from app.models.schemas.appointment import (
    AppointmentBase,
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentResponse,
    MedicalResultCreate,
    MedicalResultResponse,
)
