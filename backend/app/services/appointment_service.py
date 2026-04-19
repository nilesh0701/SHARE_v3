import uuid
import sqlalchemy as sa
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from app.models.tables import appointment, doctor_profile, patient_profile

def book_appointment(db: Session, *, patient_id: uuid.UUID,
                     doctor_id: uuid.UUID, scheduled_at: datetime,
                     consultation_type: str, notes: str = None) -> dict:
    collision = db.execute(
        sa.select(appointment).where(
            appointment.c.patient_id == patient_id,
            appointment.c.scheduled_at == scheduled_at,
            appointment.c.status.in_(["PENDING", "CONFIRMED"]),
        )
    ).fetchone()
    if collision:
        raise ValueError("You already have an appointment at this time")

    doctor_collision = db.execute(
        sa.select(appointment).where(
            appointment.c.doctor_id == doctor_id,
            appointment.c.scheduled_at == scheduled_at,
            appointment.c.status.in_(["PENDING", "CONFIRMED"]),
        )
    ).fetchone()
    if doctor_collision:
        raise ValueError("This slot is already booked")

    meeting_link = None
    if consultation_type == "VIDEO":
        room_id = str(uuid.uuid4()).replace("-", "")[:12]
        meeting_link = f"https://meet.jit.si/share-{room_id}"

    doctor_row = db.execute(
        sa.select(doctor_profile).where(
            doctor_profile.c.user_id == doctor_id)
    ).fetchone()

    appt_id = uuid.uuid4()
    db.execute(appointment.insert().values(
        id=appt_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        scheduled_at=scheduled_at,
        status="PENDING",
        consultation_type=consultation_type,
        meeting_link=meeting_link,
        payment_status="PENDING",
        payment_amount=doctor_row.consultation_fee if doctor_row else 0,
        notes=notes,
    ))
    db.commit()
    return {"appointment_id": str(appt_id), "meeting_link": meeting_link,
            "status": "PENDING"}

def get_appointments(db: Session, *, user_id: uuid.UUID, role: str) -> list:
    if role == "PATIENT":
        stmt = (
            sa.select(
                appointment,
                doctor_profile.c.full_name.label("doctor_name"),
                doctor_profile.c.specialty.label("doctor_specialty"),
            )
            .join(doctor_profile, doctor_profile.c.user_id == appointment.c.doctor_id)
            .where(appointment.c.patient_id == user_id)
        )
    else:
        stmt = (
            sa.select(
                appointment,
                patient_profile.c.full_name.label("patient_name"),
            )
            .join(patient_profile, patient_profile.c.user_id == appointment.c.patient_id)
            .where(appointment.c.doctor_id == user_id)
        )
    rows = db.execute(stmt.order_by(appointment.c.scheduled_at.desc())).fetchall()
    return [dict(r._mapping) for r in rows]

def update_appointment_status(db: Session, *, appointment_id: uuid.UUID,
                               new_status: str, user_id: uuid.UUID,
                               role: str) -> None:
    row = db.execute(
        sa.select(appointment).where(appointment.c.id == appointment_id)
    ).fetchone()
    if not row:
        raise ValueError("Appointment not found")
    if role == "PATIENT" and row.patient_id != user_id:
        raise ValueError("Not your appointment")
    if role == "DOCTOR" and row.doctor_id != user_id:
        raise ValueError("Not your appointment")

    db.execute(
        appointment.update()
        .where(appointment.c.id == appointment_id)
        .values(status=new_status)
    )
    db.commit()


def delete_appointment(db: Session, *, appointment_id: uuid.UUID, user_id: uuid.UUID, role: str) -> None:
    row = db.execute(
        sa.select(appointment).where(appointment.c.id == appointment_id)
    ).fetchone()
    if not row:
        raise ValueError("Appointment not found")

    if role == "PATIENT" and row.patient_id != user_id:
        raise ValueError("Not your appointment")
    if role == "DOCTOR" and row.doctor_id != user_id:
        raise ValueError("Not your appointment")

    scheduled_at = row.scheduled_at
    if scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
    duration = int(row.duration_minutes or 30)
    end_at = scheduled_at + timedelta(minutes=duration)
    now = datetime.now(timezone.utc)

    if now < end_at:
        raise ValueError("Appointment not finished yet")

    db.execute(appointment.delete().where(appointment.c.id == appointment_id))
    db.commit()