import re
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from uuid import UUID
from app.db.models import RoleEnum

def validate_phone_number(v: Optional[str]) -> Optional[str]:
    if v is None or v == "":
        return v
    # Vietnamese phone number regex
    pattern = r"^(0[3|5|7|8|9])+([0-9]{8})$"
    if not re.match(pattern, v):
        raise ValueError("Số điện thoại không hợp lệ (phải có 10 chữ số và bắt đầu bằng 03, 05, 07, 08 hoặc 09)")
    return v

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    role: RoleEnum = RoleEnum.patient

    @field_validator("phone")
    @classmethod
    def phone_validation(cls, v):
        return validate_phone_number(v)

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[RoleEnum] = None
    status: Optional[str] = None
    password: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def phone_validation(cls, v):
        return validate_phone_number(v)

class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    phone: Optional[str] = None
    role: RoleEnum
    status: str

    class Config:
        from_attributes = True
