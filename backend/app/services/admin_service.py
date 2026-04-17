import uuid
import sqlalchemy as sa
from sqlalchemy.orm import Session
from app.models.tables import doctor_profile, user, appointment

def get_pending_doctors(db: Session) -> list:
    rows = db.execute(
        sa.select(doctor_profile, user.c.email)
        .join(user, user.c.id == doctor_profile.c.user_id)
        .where(doctor_profile.c.verification_status == "PENDING")
        .order_by(doctor_profile.c.created_at.asc())
    ).fetchall()
    return [dict(r._mapping) for r in rows]


def get_all_doctors(db: Session) -> list:
    rows = db.execute(
        sa.select(
            doctor_profile,
            user.c.email,
            user.c.status.label("account_status"),
        )
        .join(user, user.c.id == doctor_profile.c.user_id)
        .order_by(doctor_profile.c.created_at.desc())
    ).fetchall()
    return [dict(r._mapping) for r in rows]


def approve_doctor(db: Session, *, doctor_user_id: uuid.UUID) -> None:
    db.execute(
        doctor_profile.update()
        .where(doctor_profile.c.user_id == doctor_user_id)
        .values(verification_status="APPROVED")
    )
    db.execute(
        user.update()
        .where(user.c.id == doctor_user_id)
        .values(status="ACTIVE")
    )
    db.commit()

def reject_doctor(db: Session, *, doctor_user_id: uuid.UUID,
                  reason: str) -> None:
    db.execute(
        doctor_profile.update()
        .where(doctor_profile.c.user_id == doctor_user_id)
        .values(verification_status="REJECTED", rejection_reason=reason)
    )
    db.commit()

def get_reports(db: Session) -> dict:
    total_doctors = db.execute(
        sa.select(sa.func.count()).where(user.c.role == "DOCTOR")
    ).scalar()
    total_patients = db.execute(
        sa.select(sa.func.count()).where(user.c.role == "PATIENT")
    ).scalar()
    total_appointments = db.execute(
        sa.select(sa.func.count()).select_from(appointment)
    ).scalar()
    pending_verifications = db.execute(
        sa.select(sa.func.count()).where(
            doctor_profile.c.verification_status == "PENDING")
    ).scalar()
    return {
        "total_doctors": total_doctors,
        "total_patients": total_patients,
        "total_appointments": total_appointments,
        "pending_verifications": pending_verifications,
    }