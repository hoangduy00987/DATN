"""
Auth service — business logic for registration and login.
"""
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
)
from app.db.models import RoleEnum
from app.models.schemas.auth import RegisterRequest
from app.repositories.user_repository import UserRepository


class AuthService:
    """Handles user authentication business logic."""

    @staticmethod
    def register(db: Session, data: RegisterRequest) -> dict:
        """
        Register a new patient account.
        Raises HTTPException 400 if email already exists.
        """
        email = data.email.lower().strip()
        existing = UserRepository.get_by_email(db, email)
        if existing:
            raise HTTPException(status_code=400, detail="Email đã được sử dụng.")

        # bcrypt supports max 72 bytes
        safe_password = (
            data.password[:72]
            if len(data.password.encode()) > 72
            else data.password
        )
        UserRepository.create(
            db=db,
            email=email,
            full_name=data.full_name,
            password_hash=get_password_hash(safe_password),
            role=RoleEnum.patient,
        )
        return {"message": "Đăng ký thành công!", "email": email}

    @staticmethod
    def login(db: Session, email: str, password: str) -> dict:
        """
        Authenticate user and return JWT tokens.
        Raises HTTPException 401 on invalid credentials.
        """
        email = email.lower().strip()
        user = UserRepository.get_by_email(db, email)
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=401, detail="Email hoặc mật khẩu không chính xác."
            )

        if user.status == "locked":
            raise HTTPException(status_code=403, detail="Tài khoản của bạn đã bị khóa.")

        role_value = user.role.value
        access_token = create_access_token(
            data={"sub": str(user.id), "role": role_value}
        )
        refresh_token = create_refresh_token(
            data={"sub": str(user.id), "role": role_value}
        )
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "role": role_value,
        }

    @staticmethod
    def forgot_password(db: Session, email: str) -> dict:
        """Sends a password reset email if the user exists."""
        email = email.lower().strip()
        user = UserRepository.get_by_email(db, email)
        if not user:
            # For security reasons, don't reveal if user exists
            return {"message": "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật khẩu."}
        
        from app.core.security import create_reset_token
        from app.utils.email import send_reset_password_email
        
        # Link dùng 1 lần: gắn kèm fingerprint của password_hash hiện tại
        token = create_reset_token(email, user.password_hash)
        send_reset_password_email(email, token)
        
        return {"message": "Liên kết đặt lại mật khẩu đã được gửi đến email của bạn."}

    @staticmethod
    def reset_password(db: Session, token: str, new_password: str) -> dict:
        """Resets the password using a valid reset token."""
        from app.core.security import verify_reset_token
        
        payload = verify_reset_token(token)
        if not payload:
            raise HTTPException(status_code=400, detail="Mã xác thực không hợp lệ hoặc đã hết hạn.")
            
        email = payload.get("sub")
        pwh_fingerprint = payload.get("pwh")
            
        user = UserRepository.get_by_email(db, email)
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
            
        # Kiểm tra nếu link đã dùng (password_hash đã thay đổi so với lúc tạo token)
        if user.password_hash[-10:] != pwh_fingerprint:
            raise HTTPException(status_code=400, detail="Liên kết này đã hết hiệu lực hoặc đã được sử dụng.")
            
        UserRepository.update(db, user, {"password_hash": get_password_hash(new_password)})
        return {"message": "Đặt lại mật khẩu thành công!"}

    @staticmethod
    def verify_reset_token_logic(db: Session, token: str) -> dict:
        """Kiểm tra xem token đặt lại mật khẩu có còn hiệu lực không."""
        from app.core.security import verify_reset_token
        
        payload = verify_reset_token(token)
        if not payload:
            raise HTTPException(status_code=400, detail="Liên kết không hợp lệ hoặc đã hết hạn.")
            
        email = payload.get("sub")
        pwh_fingerprint = payload.get("pwh")
        
        user = UserRepository.get_by_email(db, email)
        if not user or user.password_hash[-10:] != pwh_fingerprint:
            raise HTTPException(status_code=400, detail="Liên kết này đã hết hiệu lực hoặc đã được sử dụng.")
            
        return {"message": "Liên kết hợp lệ.", "email": email}

    @staticmethod
    def change_password(db: Session, user, data) -> dict:
        """Changes the password for an authenticated user."""
        if not verify_password(data.old_password, user.password_hash):
            raise HTTPException(status_code=400, detail="Mật khẩu cũ không chính xác.")
            
        UserRepository.update(db, user, {"password_hash": get_password_hash(data.new_password)})
        return {"message": "Đổi mật khẩu thành công!"}
