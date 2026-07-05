"""
Demo data seeder - run once to create demo accounts.
Usage: python seed_demo.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal, create_tables
from app.core.security import hash_password
from app.models.user import User
from app.models.company import CompanyProfile
from app.models.job import JobOpening
from app.models.candidate import Candidate

def seed():
    create_tables()
    db = SessionLocal()

    try:
        # --- HR Account ---
        hr = db.query(User).filter(User.email == "hr@demo.com").first()
        if not hr:
            hr = User(
                email="hr@demo.com",
                full_name="Sarah Johnson",
                hashed_password=hash_password("hr123456"),
                role="hr",
                is_active=True
            )
            db.add(hr)
            db.flush()
            print("✅ HR account created")
        else:
            print("ℹ️  HR account already exists")

        # --- Company Profile ---
        company = db.query(CompanyProfile).filter(CompanyProfile.hr_user_id == hr.id).first()
        if not company:
            company = CompanyProfile(
                hr_user_id=hr.id,
                company_name="TechCorp Solutions",
                industry="Information Technology",
                website="https://techcorp.demo",
                description="A leading IT company specializing in enterprise software solutions.",
                location="Bangalore, India"
            )
            db.add(company)
            db.flush()
            print("✅ Company profile created")

        # --- Job Opening ---
        job = db.query(JobOpening).filter(JobOpening.hr_user_id == hr.id).first()
        if not job:
            job = JobOpening(
                hr_user_id=hr.id,
                company_id=company.id,
                title="Full Stack Developer",
                description="""We are looking for a skilled Full Stack Developer to join our team.
You will be responsible for developing and maintaining web applications using React and Python.
The ideal candidate should have strong problem-solving skills and experience with modern web technologies.""",
                required_skills=["React", "Python", "FastAPI", "PostgreSQL", "JavaScript", "REST APIs"],
                experience_years="2-4 years",
                qualification="B.Tech / B.E. in Computer Science or related field",
                salary_range="8 LPA - 15 LPA",
                interview_rounds=["Aptitude", "SQL", "Coding", "Technical Interview"],
                resume_cutoff=60.0,
                aptitude_cutoff=60.0,
                sql_cutoff=60.0,
                coding_cutoff=60.0,
                is_active=True
            )
            db.add(job)
            db.flush()
            print("✅ Job opening created")

        # --- Candidate Account ---
        candidate_user = db.query(User).filter(User.email == "candidate@demo.com").first()
        if not candidate_user:
            candidate_user = User(
                email="candidate@demo.com",
                full_name="Arjun Sharma",
                hashed_password=hash_password("candidate123"),
                role="candidate",
                is_active=True
            )
            db.add(candidate_user)
            db.flush()
            print("✅ Candidate account created")
        else:
            print("ℹ️  Candidate account already exists")

        candidate = db.query(Candidate).filter(Candidate.user_id == candidate_user.id).first()
        if not candidate:
            candidate = Candidate(
                user_id=candidate_user.id,
                job_id=job.id,
                created_by_id=hr.id,
                status="pending"
            )
            db.add(candidate)
            print("✅ Candidate profile linked to job")

        db.commit()

        print("\n" + "="*50)
        print("🎉 DEMO ACCOUNTS READY")
        print("="*50)
        print("\n👤 HR Login")
        print("   Email   : hr@demo.com")
        print("   Password: hr123456")
        print("   URL     : http://localhost:5173/login")
        print("\n👤 Candidate Login")
        print("   Email   : candidate@demo.com")
        print("   Password: candidate123")
        print("   URL     : http://localhost:5173/login")
        print("\n📋 Job Assigned: Full Stack Developer @ TechCorp Solutions")
        print("="*50)

    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
