import os
import sys
import uuid
import random
from datetime import datetime, date, time, timedelta
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Set project path to import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.models import Base, User, RoleEnum, Appointment, MedicalResult, Review, Notification
from app.core.security import get_password_hash

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://lung_admin:lung_password@localhost:5432/lung_system_db")
if "db:5432" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("db:5432", "localhost:5432")

print(f"Connecting to database: {DATABASE_URL}")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_database():
    db = SessionLocal()
    try:
        # 1. Clear existing non-default data to start fresh
        print("Cleaning up existing data...")
        db.query(Review).delete()
        db.query(Notification).delete()
        db.query(MedicalResult).delete()
        db.query(Appointment).delete()
        
        # Keep default admin and default doctor, delete others
        default_admin_email = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@lungcare.local").strip()
        default_doctor_email = os.getenv("DEFAULT_DOCTOR_EMAIL", "doctor@admin.com").strip()
        
        db.query(User).filter(User.email.notin_([default_admin_email, default_doctor_email])).delete()
        db.commit()
        print("Cleanup completed.")

        # Ensure default admin exists
        admin = db.query(User).filter(User.role == RoleEnum.admin).first()
        if not admin:
            print("Creating default admin...")
            admin = User(
                email=default_admin_email,
                full_name="Quản trị viên",
                password_hash=get_password_hash("Lungcare@123"),
                role=RoleEnum.admin,
                status="active"
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
        
        # Ensure default doctor exists
        doc_default = db.query(User).filter(User.email == default_doctor_email).first()
        if not doc_default:
            print("Creating default doctor...")
            doc_default = User(
                email=default_doctor_email,
                full_name="Dr. Admin",
                password_hash=get_password_hash("Lungcare@123"),
                role=RoleEnum.doctor,
                status="active"
            )
            db.add(doc_default)
            db.commit()
            db.refresh(doc_default)

        # 2. Create Doctors (5 additional doctors)
        print("Creating additional doctors...")
        doctors = [doc_default]
        doctor_info = [
            ("BS. Nguyễn Văn An", "an.nguyen@lungcare.local", "0911223344"),
            ("BS. Trần Thị Bình", "binh.tran@lungcare.local", "0922334455"),
            ("BS. Lê Hoàng Cường", "cuong.le@lungcare.local", "0933445566"),
            ("BS. Phạm Minh Đức", "duc.pham@lungcare.local", "0944556677"),
            ("BS. Đỗ Thanh Hương", "huong.do@lungcare.local", "0955667788"),
        ]
        
        hashed_pwd = get_password_hash("Lungcare@123")
        
        for name, email, phone in doctor_info:
            doc = User(
                email=email,
                full_name=name,
                phone=phone,
                password_hash=hashed_pwd,
                role=RoleEnum.doctor,
                gender=random.choice(["Nam", "Nữ"]),
                status="active"
            )
            db.add(doc)
            doctors.append(doc)
        
        db.commit()
        for doc in doctors:
            db.refresh(doc)
        print(f"Created {len(doctors)} doctors in total.")

        # 3. Create Patients (15 patients)
        print("Creating patients...")
        patients = []
        patient_info = [
            ("Nguyễn Văn Nam", "nam.nguyen@gmail.com", "0981234567", "1990-05-15", "Nam"),
            ("Trần Thị Hoa", "hoa.tran@gmail.com", "0982345678", "1993-08-22", "Nữ"),
            ("Lê Văn Hải", "hai.le@gmail.com", "0983456789", "1985-11-02", "Nam"),
            ("Phạm Thị Mai", "mai.pham@gmail.com", "0984567890", "1997-03-10", "Nữ"),
            ("Hoàng Văn Dũng", "dung.hoang@gmail.com", "0985678901", "1988-12-25", "Nam"),
            ("Vũ Thị Lan", "lan.vu@gmail.com", "0986789012", "1992-06-18", "Nữ"),
            ("Bùi Văn Hùng", "hung.bui@gmail.com", "0987890123", "1979-01-30", "Nam"),
            ("Đỗ Thị Cúc", "cuc.do@gmail.com", "0988901234", "2000-09-05", "Nữ"),
            ("Ngô Văn Sơn", "son.ngo@gmail.com", "0989012345", "1982-04-12", "Nam"),
            ("Dương Thị Trúc", "truc.duong@gmail.com", "0980123456", "1995-07-07", "Nữ"),
            ("Lý Hoàng Nam", "nam.ly@gmail.com", "0971122334", "1987-02-14", "Nam"),
            ("Nguyễn Thị Mai", "mai.nguyen@gmail.com", "0972233445", "1991-10-20", "Nữ"),
            ("Phan Văn Hùng", "hung.phan@gmail.com", "0973344556", "1984-05-30", "Nam"),
            ("Trịnh Thị Lan", "lan.trinh@gmail.com", "0974455667", "1996-12-08", "Nữ"),
            ("Đặng Văn Bình", "binh.dang@gmail.com", "0975566778", "1975-09-15", "Nam"),
        ]
        
        patient_pwd = get_password_hash("Lungcare@123")
        for name, email, phone, dob, gender in patient_info:
            pat = User(
                email=email,
                full_name=name,
                phone=phone,
                password_hash=patient_pwd,
                role=RoleEnum.patient,
                gender=gender,
                status="active"
            )
            # Custom attribute for seeding, we will use parsing for dob
            db.add(pat)
            patients.append((pat, dob))
            
        db.commit()
        for pat, dob in patients:
            db.refresh(pat)
        print(f"Created {len(patients)} patients.")

        # 4. Create Appointments & Medical Results & Reviews
        print("Seeding appointments...")
        symptom_reasons = [
            "Ho khan kéo dài hơn 2 tuần, đôi khi có đờm trắng",
            "Khó thở nhẹ khi leo cầu thang hoặc vận động mạnh",
            "Đau tức ngực âm ỉ phía bên phổi phải",
            "Thỉnh thoảng ho ra máu tươi lẫn đờm",
            "Sút cân không rõ nguyên nhân, sốt nhẹ về chiều",
            "Khò khè, thở rít mỗi khi thay đổi thời tiết",
            "Mệt mỏi kéo dài, đau cơ vùng ngực",
            "Ho có đờm đặc màu vàng xanh, kèm sốt 38.5 độ C",
            "Đau họng, ho khục khặc kèm sổ mũi nghẹt mũi",
            "Tức ngực, thở dốc khi nằm nghỉ"
        ]

        medical_outcomes = [
            {
                "diagnosis": "Viêm phế quản cấp tính. Cần nghỉ ngơi và tránh khói thuốc.",
                "prescription": "Paracetamol 500mg (20 viên, uống 1 viên khi sốt > 38.5 độ C), Acetylcysteine 200mg (30 gói, ngày 3 gói).",
                "notes": "Uống nhiều nước ấm, theo dõi thân nhiệt. Tái khám sau 7 ngày nếu không đỡ."
            },
            {
                "diagnosis": "Viêm phổi thùy nhẹ. Theo dõi sát tình trạng hô hấp.",
                "prescription": "Amoxicillin + Clavulanic acid 1g (14 viên, ngày uống 2 lần), Ambroxol 30mg (20 viên, ngày 2 lần).",
                "notes": "Nghỉ ngơi tại giường, ăn thức ăn lỏng dễ tiêu. Hạn chế tiếp xúc lạnh."
            },
            {
                "diagnosis": "Nhiễm trùng hô hấp trên / Nghi ngờ dị ứng thời tiết.",
                "prescription": "Desloratadine 5mg (10 viên, ngày uống 1 viên tối), Vitamin C 500mg (20 viên, ngày uống 2 viên sáng trưa).",
                "notes": "Giữ ấm cổ họng, đeo khẩu trang khi ra ngoài. Súc họng bằng nước muối sinh lý hàng ngày."
            },
            {
                "diagnosis": "Hen phế quản kiểm soát một phần.",
                "prescription": "Salbutamol xịt khi khó thở (1 lọ), Budesonide/Formoterol hít hàng ngày (1 lọ, ngày hít 2 lần).",
                "notes": "Tránh các tác nhân gây dị ứng như lông thú, bụi nhà, khói thuốc lá."
            },
            {
                "diagnosis": "Tràn dịch màng phổi lượng ít chưa rõ nguyên nhân. Đề nghị chụp CT cắt lớp ngực.",
                "prescription": "Kháng sinh dự phòng và thuốc giảm đau hỗ trợ.",
                "notes": "Hạn chế vận động mạnh. Nhập viện nếu thấy khó thở tăng dần."
            }
        ]

        review_comments = {
            "5": [
                "Bác sĩ tư vấn rất tận tâm, giải thích dễ hiểu về bệnh lý phổi của tôi.",
                "Rất hài lòng với sự ân cần của bác sĩ. Phòng khám sạch sẽ.",
                "Bác sĩ chuyên môn cao, kê đơn thuốc uống 3 ngày đã đỡ hẳn ho.",
                "Bác sĩ hướng dẫn chi tiết cách dùng thuốc xịt hen phế quản."
            ],
            "4": [
                "Thái độ bác sĩ rất lịch sự, giải đáp mọi thắc mắc của tôi.",
                "Hơi đông một chút nhưng bác sĩ khám rất kỹ và chu đáo.",
                "Bác sĩ khám nhiệt tình, dặn dò chu đáo cách ăn uống sinh hoạt."
            ],
            "3": [
                "Bác sĩ khám nhanh, không trò chuyện tư vấn nhiều lắm.",
                "Thời gian đợi khám hơi lâu mặc dù đã đặt lịch trước."
            ]
        }

        # Track reviews to prevent duplicates (patient_id, doctor_id)
        reviews_seeded = set()

        # Let's seed appointments for the last 30 days and next 7 days
        today = date.today()
        start_date = today - timedelta(days=30)
        
        total_appointments_count = 0
        
        # We want to seed about 75-90 appointments to make the charts look rich
        for d_offset in range(38): # 30 days ago to 7 days in future
            current_date = start_date + timedelta(days=d_offset)
            
            # Determine how many appointments for this day
            if current_date < today:
                # Past days: mostly completed and cancelled
                num_apts = random.randint(2, 4)
            elif current_date == today:
                # Today: mixture of completed, confirmed, pending, cancelled
                num_apts = random.randint(3, 5)
            else:
                # Future days: confirmed and pending
                num_apts = random.randint(1, 3)
                
            for _ in range(num_apts):
                patient_obj, dob = random.choice(patients)
                doctor_obj = random.choice(doctors)
                
                # Determine status
                if current_date < today:
                    status = random.choice(["completed", "completed", "completed", "cancelled"])
                elif current_date == today:
                    status = random.choice(["completed", "confirmed", "pending", "cancelled"])
                else:
                    status = random.choice(["confirmed", "pending", "pending"])
                
                # Hour select
                hour = random.choice([8, 9, 10, 11, 14, 15, 16])
                minute = random.choice([0, 30])
                apt_time = time(hour, minute)
                
                # Symptoms string format expected by UI regex
                reason = random.choice(symptom_reasons)
                symptoms_str = f"Bệnh nhân: {patient_obj.full_name}, SĐT: {patient_obj.phone}, Ngày sinh: {dob}. Lý do: {reason}"
                
                appt = Appointment(
                    patient_id=patient_obj.id,
                    doctor_id=doctor_obj.id,
                    appointment_date=current_date,
                    appointment_time=apt_time,
                    symptoms=symptoms_str,
                    status=status,
                    note=f"Ghi chú tự động cho ngày {current_date}"
                )
                db.add(appt)
                db.commit() # Commit to get appt.id
                
                total_appointments_count += 1
                
                # If completed, add MedicalResult
                if status == "completed":
                    outcome = random.choice(medical_outcomes)
                    med_res = MedicalResult(
                        appointment_id=appt.id,
                        diagnosis=outcome["diagnosis"],
                        prescription=outcome["prescription"],
                        doctor_notes=outcome["notes"]
                    )
                    db.add(med_res)
                    
                    # Add a Review with probability of 70%, respecting unique constraint
                    review_key = (patient_obj.id, doctor_obj.id)
                    if random.random() < 0.70 and review_key not in reviews_seeded:
                        rating = random.choice(["4", "5", "5", "3"])
                        comment = random.choice(review_comments[rating])
                        review = Review(
                            appointment_id=appt.id,
                            patient_id=patient_obj.id,
                            doctor_id=doctor_obj.id,
                            rating=rating,
                            comment=comment
                        )
                        db.add(review)
                        reviews_seeded.add(review_key)
                
                # Add notification for patient
                if status == "confirmed":
                    notif = Notification(
                        user_id=patient_obj.id,
                        title="Lịch khám đã được xác nhận",
                        message=f"Lịch hẹn khám với bác sĩ {doctor_obj.full_name} lúc {hour:02d}:{minute:02d} ngày {current_date.strftime('%d/%m/%Y')} đã được đặt.",
                        link=f"/chat/lich-da-dat?highlight={appt.id}"
                    )
                    db.add(notif)
                elif status == "completed":
                    notif = Notification(
                        user_id=patient_obj.id,
                        title="Đã có kết quả khám bệnh",
                        message=f"Bác sĩ {doctor_obj.full_name} đã gửi kết quả khám bệnh ngày {current_date.strftime('%d/%m/%Y')}. Vui lòng nhấn để xem chi tiết.",
                        link=f"/chat/lich-da-dat?highlight={appt.id}"
                    )
                    db.add(notif)

        db.commit()
        print(f"Successfully seeded {total_appointments_count} appointments.")
        print(f"Seeded {len(reviews_seeded)} patient-doctor reviews.")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
