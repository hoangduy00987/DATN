
from sqlalchemy import create_engine, text
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://lung_admin:lung_password@localhost:5432/lung_system_db")

def update_review_constraints():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        try:
            # 1. Drop existing unique constraint on appointment_id
            # Postgres usually names it 'reviews_appointment_id_key'
            conn.execute(text("ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_appointment_id_key"))
            
            # 2. Add unique constraint on (patient_id, doctor_id)
            conn.execute(text("ALTER TABLE reviews ADD CONSTRAINT unique_patient_doctor_review UNIQUE (patient_id, doctor_id)"))
            
            conn.commit()
            print("Successfully updated review constraints.")
        except Exception as e:
            print(f"Error updating constraints: {e}")

if __name__ == "__main__":
    update_review_constraints()
