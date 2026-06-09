from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case, Integer, String
from datetime import datetime, timedelta
from typing import List, Dict

from app.db.session import get_db
from app.db.models import User, Appointment, Review, RoleEnum
from app.core.security import get_current_user

router = APIRouter()

@router.get("/overview", tags=["statistics"])
def get_overview(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Lấy số liệu tổng quát cho dashboard."""
    # Only admin can view statistics
    if current_user.role != RoleEnum.admin:
        return {"detail": "Truy cập bị từ chối."}

    total_users = db.query(User).count()
    total_patients = db.query(User).filter(User.role == RoleEnum.patient).count()
    total_doctors = db.query(User).filter(User.role == RoleEnum.doctor).count()
    
    total_appointments = db.query(Appointment).count()
    completed_appointments = db.query(Appointment).filter(Appointment.status == "completed").count()
    pending_appointments = db.query(Appointment).filter(Appointment.status == "pending").count()
    
    avg_rating = db.query(func.avg(Review.rating.cast(String).cast(Integer))).scalar() or 0
    total_reviews = int(db.query(Review).count())

    return {
        "users": {
            "total": total_users,
            "patients": total_patients,
            "doctors": total_doctors
        },
        "appointments": {
            "total": total_appointments,
            "completed": completed_appointments,
            "pending": pending_appointments
        },
        "reviews": {
            "average_rating": round(float(avg_rating), 1),
            "total": total_reviews
        }
    }

@router.get("/appointments-trend", tags=["statistics"])
def get_appointments_trend(
    days: int = 7, 
    month: int = None, 
    year: int = None, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Lấy dữ liệu biểu đồ lượt đặt khám theo N ngày qua hoặc theo tháng chỉ định."""
    if current_user.role != RoleEnum.admin:
        return {"detail": "Truy cập bị từ chối."}

    try:
        if month and year:
            # Lấy toàn bộ ngày trong tháng chỉ định
            import calendar
            start_date = datetime(year, month, 1).date()
            last_day = calendar.monthrange(year, month)[1]
            end_date = datetime(year, month, last_day).date()
            days_count = last_day
        else:
            # Lấy theo số ngày lùi lại (mặc định) - Theo giờ Việt Nam (UTC+7)
            vn_now = datetime.utcnow() + timedelta(hours=7)
            today = vn_now.date()
            start_date = today - timedelta(days=days-1)
            end_date = today
            days_count = days
        
        # Query for daily counts
        query = db.query(
            Appointment.appointment_date,
            func.count(Appointment.id).label("total"),
            func.sum(case((Appointment.status == "completed", 1), else_=0)).label("completed")
        ).filter(Appointment.appointment_date >= start_date, Appointment.appointment_date <= end_date)\
         .group_by(Appointment.appointment_date)\
         .order_by(Appointment.appointment_date)
        
        data = query.all()

        # Fill in missing dates with zero
        result = []
        current = start_date
        data_dict = {}
        for d in data:
            # Dùng string format để key đồng nhất
            date_key = d.appointment_date.strftime("%Y-%m-%d")
            data_dict[date_key] = {
                "total": int(d.total or 0), 
                "completed": int(d.completed or 0)
            }
        
        for _ in range(days_count):
            curr_key = current.strftime("%Y-%m-%d")
            day_data = data_dict.get(curr_key, {"total": 0, "completed": 0})
            result.append({
                "date": current.strftime("%d/%m"),
                "total": day_data["total"],
                "completed": day_data["completed"]
            })
            current += timedelta(days=1)

        return result
    except Exception as e:
        print(f"ERROR in get_appointments_trend: {str(e)}")
        # Return empty data instead of 500 error for safety during debugging
        return []

@router.get("/doctor-rankings", tags=["statistics"])
def get_doctor_rankings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Xếp hạng bác sĩ dựa trên đánh giá và lượt khám."""
    if current_user.role != RoleEnum.admin:
        return {"detail": "Truy cập bị từ chối."}

    # Join User with Review and Appointment
    doctors = db.query(
        User.id,
        User.full_name,
        func.avg(Review.rating.cast(String).cast(Integer)).label("avg_rating"),
        func.count(func.distinct(Review.id)).label("total_reviews"),
        func.count(func.distinct(Appointment.id)).label("total_appointments")
    ).filter(User.role == RoleEnum.doctor)\
     .outerjoin(Review, Review.doctor_id == User.id)\
     .outerjoin(Appointment, Appointment.doctor_id == User.id)\
     .group_by(User.id)\
     .order_by(func.avg(Review.rating.cast(String).cast(Integer)).desc().nulls_last(), func.count(func.distinct(Appointment.id)).desc())\
     .all()

    return [
        {
            "id": str(d.id),
            "full_name": d.full_name,
            "avg_rating": round(float(d.avg_rating), 1) if d.avg_rating else 0,
            "total_reviews": d.total_reviews,
            "total_appointments": d.total_appointments
        } for d in doctors
    ]
