import uuid
from datetime import datetime, timedelta, timezone
import bcrypt
from jose import jwt, JWTError
import sqlalchemy as sa
from sqlalchemy.orm import Session
from app.config import settings
from app.models.tables import user, doctor_profile, patient_profile


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_access_token(user_id: uuid.UUID, role: str, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "role": role,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}")

def register_patient(db: Session, *, email: str, password: str, full_name: str,
                     phone: str = None, date_of_birth: str = None) -> dict:
    existing = db.execute(
        sa.select(user).where(user.c.email == email)
    ).fetchone()
    if existing:
        raise ValueError("Email already registered")

    user_id = uuid.uuid4()
    db.execute(user.insert().values(
        id=user_id, email=email,
        password_hash=hash_password(password),
        role="PATIENT", status="ACTIVE",
    ))
    db.execute(patient_profile.insert().values(
        id=uuid.uuid4(), user_id=user_id,
        full_name=full_name, phone=phone,
        date_of_birth=date_of_birth,
    ))
    db.commit()
    return {"user_id": str(user_id), "email": email, "role": "PATIENT"}

def register_doctor(db: Session, *, email: str, password: str, full_name: str,
                    specialty: str, bio: str, consultation_fee: int,
                    consultation_type: str, clinic_address: str = None,
                    gender: str = None, certificate_url: str = None) -> dict:
    existing = db.execute(
        sa.select(user).where(user.c.email == email)
    ).fetchone()
    if existing:
        raise ValueError("Email already registered")

    user_id = uuid.uuid4()
    db.execute(user.insert().values(
        id=user_id, email=email,
        password_hash=hash_password(password),
        role="DOCTOR", status="PENDING",
    ))
    db.execute(doctor_profile.insert().values(
        id=uuid.uuid4(), user_id=user_id,
        full_name=full_name, specialty=specialty,
        bio=bio, consultation_fee=consultation_fee,
        consultation_type=consultation_type,
        clinic_address=clinic_address, gender=gender,
        certificate_url=certificate_url,
        verification_status="PENDING",
    ))
    db.commit()
    return {"user_id": str(user_id), "email": email, "role": "DOCTOR",
            "verification_status": "PENDING"}

def login_user(db: Session, *, email: str, password: str) -> str:
    # Check admin first
    if email == settings.admin_email:
        dummy = "$2b$12$invalidhashfortimingprotection000000000000000000000000"
        if not verify_password(password, dummy if password != settings.admin_password
                               else bcrypt.hashpw(settings.admin_password.encode(),
                               bcrypt.gensalt()).decode()):
            if password != settings.admin_password:
                raise ValueError("Invalid credentials")
        fake_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
        return create_access_token(fake_id, "ADMIN", email)

    row = db.execute(
        sa.select(user).where(user.c.email == email)
    ).fetchone()

    dummy_hash = "$2b$12$invalidhashfortimingprotection000000000000000000000000"
    hash_to_check = row.password_hash if row else dummy_hash

    if not row or not verify_password(password, hash_to_check):
        raise ValueError("Invalid credentials")

    if row.status == "PENDING":
        raise ValueError("Account pending verification")

    if row.status == "INACTIVE":
        raise ValueError("Account inactive")

    return create_access_token(row.id, row.role, row.email)