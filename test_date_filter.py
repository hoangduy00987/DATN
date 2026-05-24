import os
import sys
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models import Appointment

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/datn"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

db = SessionLocal()
all_appts = db.query(Appointment).all()
print("Total appointments:", len(all_appts))

if len(all_appts) > 0:
    for a in all_appts[:3]:
        print(f"- ID: {a.id}, Date: {a.appointment_date}, Type: {type(a.appointment_date)}")
    
    first_date = all_appts[0].appointment_date
    print(f"\nFiltering for date: {first_date} (type: {type(first_date)})")
    
    filtered = db.query(Appointment).filter(Appointment.appointment_date == first_date).all()
    print("Filtered count:", len(filtered))

    print("\nNow testing via repository:")
    from app.repositories.appointment_repository import AppointmentRepository
    rep_filtered = AppointmentRepository.get_all(db, date=first_date)
    print("Repo filtered count:", len(rep_filtered))

db.close()
