import uuid
import sqlalchemy as sa
from sqlalchemy.orm import Session
from app.models.tables import doctor_profile, user, availability, review

def get_doctors(db: Session, *, specialty: str = None,
                consultation_type: str = None,
                gender: str = None) -> list:
    stmt = (
        sa.select(
            doctor_profile,
            user.c.email,
            user.c.status.label("account_status"),
        )
        .join(user, user.c.id == doctor_profile.c.user_id)
        .where(
            doctor_profile.c.verification_status == "APPROVED",
            user.c.status == "ACTIVE",
        )
    )
    if specialty:
        stmt = stmt.where(doctor_profile.c.specialty.ilike(f"%{specialty}%"))
    if consultation_type:
        stmt = stmt.where(
            sa.or_(
                doctor_profile.c.consultation_type == consultation_type,
                doctor_profile.c.consultation_type == "BOTH",
            )
        )
    if gender:
        stmt = stmt.where(doctor_profile.c.gender == gender)

    rows = db.execute(stmt).fetchall()
    return [dict(r._mapping) for r in rows]

def get_doctor_by_id(db: Session, *, doctor_id: uuid.UUID) -> dict:
    row = db.execute(
        sa.select(doctor_profile, user.c.email)
        .join(user, user.c.id == doctor_profile.c.user_id)
        .where(doctor_profile.c.user_id == doctor_id)
    ).fetchone()
    if not row:
        raise ValueError("Doctor not found")
    return dict(row._mapping)

def get_doctor_availability(db: Session, *, doctor_id: uuid.UUID) -> list:
    rows = db.execute(
        sa.select(availability)
        .where(availability.c.doctor_id == doctor_id)
        .order_by(availability.c.day_of_week)
    ).fetchall()
    return [dict(r._mapping) for r in rows]

def set_availability(db: Session, *, doctor_id: uuid.UUID,
                     slots: list) -> None:
    db.execute(
        availability.delete().where(availability.c.doctor_id == doctor_id)
    )
    for slot in slots:
        db.execute(availability.insert().values(
            id=uuid.uuid4(),
            doctor_id=doctor_id,
            day_of_week=slot["day_of_week"],
            start_time=slot["start_time"],
            end_time=slot["end_time"],
            slot_duration_minutes=slot.get("slot_duration_minutes", 30),
        ))
    db.commit()