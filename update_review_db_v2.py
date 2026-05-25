
from sqlalchemy import create_engine, text
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://lung_admin:lung_password@localhost:5432/lung_system_db")

def fix_and_update_reviews():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        try:
            # 1. Drop existing unique constraint on appointment_id
            conn.execute(text("ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_appointment_id_key"))
            
            # 2. Cleanup duplicates: keep only the latest review for each (patient_id, doctor_id)
            conn.execute(text("""
                DELETE FROM reviews a USING (
                    SELECT MIN(ctid) as ctid, patient_id, doctor_id
                    FROM reviews 
                    GROUP BY patient_id, doctor_id 
                    HAVING COUNT(*) > 1
                ) b
                WHERE a.patient_id = b.patient_id 
                AND a.doctor_id = b.doctor_id 
                AND a.ctid <> b.ctid
            """))
            
            # 3. Add unique constraint
            conn.execute(text("ALTER TABLE reviews ADD CONSTRAINT unique_patient_doctor_review UNIQUE (patient_id, doctor_id)"))
            
            conn.commit()
            print("Successfully cleaned up and updated review constraints.")
        except Exception as e:
            conn.rollback()
            print(f"Error: {e}")

if __name__ == "__main__":
    fix_and_update_reviews()
