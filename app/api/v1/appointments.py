from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date as date_type

from app.db.session import get_db
from app.db.models import User, Appointment, MedicalResult, RoleEnum
from app.core.security import get_current_user
from app.models.appointment import AppointmentCreate, AppointmentResponse, AppointmentUpdate, MedicalResultCreate

router = APIRouter()

@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    appointment_in: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Tạo lịch khám bệnh mới.
    """
    new_appointment = Appointment(
        patient_id=current_user.id,
        appointment_date=appointment_in.appointment_date,
        appointment_time=appointment_in.appointment_time,
        symptoms=appointment_in.symptoms,
        status="booked"
    )
    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)
    return new_appointment

@router.get("/my", response_model=List[AppointmentResponse])
def get_my_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lấy danh sách lịch khám của chính mình.
    """
    appointments = db.query(Appointment).filter(
        Appointment.patient_id == current_user.id
    ).order_by(Appointment.appointment_date.desc()).all()
    return appointments

@router.get("/all", response_model=List[AppointmentResponse])
def get_all_appointments(
    search: Optional[str] = None,
    date: Optional[date_type] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lấy toàn bộ danh sách lịch khám (Dành cho Bác sĩ/Admin).
    Nếu không có tham số lọc, trả về tất cả dữ liệu.
    """
    if current_user.role not in [RoleEnum.doctor, RoleEnum.admin]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập danh sách này.")
    
    query = db.query(Appointment).join(Appointment.patient)
    search_value = search.strip() if search else ""
    
    # Filter theo ngày nếu có
    if date:
        query = query.filter(Appointment.appointment_date == date)
    
    # Filter theo trạng thái nếu có (và khác 'all')
    if status and status.strip() and status != "all":
        query = query.filter(Appointment.status == status)
        
    # Tìm kiếm linh hoạt
    if search_value:
        query = query.filter(
            or_(
                User.full_name.ilike(f"%{search_value}%"),
                User.phone.ilike(f"%{search_value}%"),
                Appointment.symptoms.ilike(f"%{search_value}%"),
            )
        )
        
    return query.order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.asc()).all()

@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment_detail(
    appointment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Xem chi tiết một lịch khám.
    """
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch khám.")
    
    # Only the patient themselves or doctors/admins can see the detail
    if appointment.patient_id != current_user.id and current_user.role not in [RoleEnum.doctor, RoleEnum.admin]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập thông tin này.")
        
    return appointment

@router.patch("/{appointment_id}/cancel", response_model=AppointmentResponse)
def cancel_appointment(
    appointment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Hủy một lịch khám.
    """
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch khám.")
    
    if appointment.patient_id != current_user.id and current_user.role not in [RoleEnum.doctor, RoleEnum.admin]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền thực hiện thao tác này.")
    
    appointment.status = "cancelled"
    db.commit()
    db.refresh(appointment)
    return appointment

@router.patch("/{appointment_id}/result", response_model=AppointmentResponse)
def send_medical_result(
    appointment_id: str,
    result_in: MedicalResultCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Bác sĩ/Admin gửi hoặc cập nhật kết quả khám cho một lịch hẹn.
    Sau khi gửi, lịch hẹn được đánh dấu là đã khám bệnh.
    """
    if current_user.role not in [RoleEnum.doctor, RoleEnum.admin]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền gửi kết quả khám.")

    diagnosis = (result_in.diagnosis or "").strip()
    if not diagnosis:
        raise HTTPException(status_code=400, detail="Kết quả khám không được để trống.")

    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch khám.")

    if appointment.status == "cancelled":
        raise HTTPException(status_code=400, detail="Không thể gửi kết quả cho lịch đã hủy.")

    result = db.query(MedicalResult).filter(MedicalResult.appointment_id == appointment.id).first()
    if result:
        result.diagnosis = diagnosis
    else:
        result = MedicalResult(appointment_id=appointment.id, diagnosis=diagnosis)
        db.add(result)

    appointment.status = "completed"
    if current_user.role == RoleEnum.doctor:
        appointment.doctor_id = current_user.id

    db.commit()
    db.refresh(appointment)
    return appointment

@router.patch("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: str,
    appointment_in: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cập nhật thông tin lịch khám.
    """
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Không tìm thấy lịch khám.")
    
    if appointment.patient_id != current_user.id and current_user.role not in [RoleEnum.doctor, RoleEnum.admin]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền thực hiện thao tác này.")
    
    # Update fields if provided
    update_data = appointment_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(appointment, field, value)
    
    db.commit()
    db.refresh(appointment)
    return appointment
