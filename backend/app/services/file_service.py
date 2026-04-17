import uuid
import cloudinary
import cloudinary.uploader
import sqlalchemy as sa
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from app.config import settings
from app.models.tables import medical_file, file_permission, appointment, doctor_profile

cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret,
    secure=True
)

def upload_medical_file(db: Session, *, patient_id: uuid.UUID,
                        file_name: str, file_bytes: bytes,
                        file_type: str) -> dict:
    result = cloudinary.uploader.upload(
        file_bytes,
        folder=f"medshare/patients/{patient_id}",
        resource_type="raw",
        public_id=f"{uuid.uuid4()}",
        use_filename=False,
    )

    file_id = uuid.uuid4()
    db.execute(medical_file.insert().values(
        id=file_id,
        patient_id=patient_id,
        name=file_name,
        cloudinary_url=result["secure_url"],
        cloudinary_public_id=result["public_id"],
        file_type=file_type,
        size_bytes=result.get("bytes", 0),
    ))
    db.commit()
    return {"file_id": str(file_id), "name": file_name, "url": result["secure_url"]}

def get_patient_files(db: Session, *, patient_id: uuid.UUID) -> list:
    rows = db.execute(
        sa.select(medical_file)
        .where(
            medical_file.c.patient_id == patient_id,
            medical_file.c.deleted_at.is_(None),
        )
        .order_by(medical_file.c.uploaded_at.desc())
    ).fetchall()
    return [dict(r._mapping) for r in rows]

def share_file(
    db: Session,
    *,
    file_id: uuid.UUID,
    patient_id: uuid.UUID,
    doctor_id: uuid.UUID,
    start_date: datetime,
    end_date: datetime,
) -> dict:
    file_row = db.execute(
        sa.select(medical_file).where(
            medical_file.c.id == file_id,
            medical_file.c.patient_id == patient_id,
            medical_file.c.deleted_at.is_(None),
        )
    ).fetchone()
    if not file_row:
        raise ValueError("File not found")

    now = datetime.now(timezone.utc)
    requested_start_at = start_date.astimezone(timezone.utc)
    # end_date from client is ignored for security; expiry is tied to appointment end.
    _ = end_date

    if requested_start_at <= now:
        start_at = now
    else:
        start_at = requested_start_at

    # Strictly tie access window to the next scheduled appointment end.
    appt_row = db.execute(
        sa.select(
            appointment.c.id,
            appointment.c.scheduled_at,
            appointment.c.duration_minutes,
            appointment.c.status,
        )
        .where(
            appointment.c.patient_id == patient_id,
            appointment.c.doctor_id == doctor_id,
            appointment.c.status.in_(["PENDING", "CONFIRMED"]),
            appointment.c.scheduled_at >= now,
        )
        .order_by(appointment.c.scheduled_at.asc())
        .limit(1)
    ).fetchone()
    if not appt_row:
        raise ValueError("No upcoming appointment found with this doctor")

    appt_start = appt_row.scheduled_at
    if appt_start.tzinfo is None:
        appt_start = appt_start.replace(tzinfo=timezone.utc)
    duration = int(appt_row.duration_minutes or 30)
    end_at = appt_start + timedelta(minutes=duration)

    if end_at <= start_at:
        raise ValueError("Appointment already ended or invalid time window")

    perm_id = uuid.uuid4()
    db.execute(file_permission.insert().values(
        id=perm_id,
        file_id=file_id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        granted_at=start_at,
        expires_at=end_at,
        revoked_at=None,
    ))
    db.commit()
    return {
        "permission_id": str(perm_id),
        "expires_at": end_at.isoformat(),
        "appointment_end": end_at.isoformat(),
    }


def get_patient_shares(db: Session, *, patient_id: uuid.UUID) -> list:
    rows = db.execute(
        sa.select(
            file_permission.c.id.label("permission_id"),
            file_permission.c.file_id,
            file_permission.c.doctor_id,
            file_permission.c.granted_at,
            file_permission.c.expires_at,
            file_permission.c.revoked_at,
            medical_file.c.name.label("file_name"),
            medical_file.c.file_type,
            medical_file.c.size_bytes,
            doctor_profile.c.full_name.label("doctor_name"),
        )
        .select_from(
            file_permission
            .join(medical_file, medical_file.c.id == file_permission.c.file_id)
            .join(doctor_profile, doctor_profile.c.user_id == file_permission.c.doctor_id)
        )
        .where(
            file_permission.c.patient_id == patient_id,
            medical_file.c.deleted_at.is_(None),
        )
        .order_by(file_permission.c.granted_at.desc())
    ).fetchall()
    return [dict(r._mapping) for r in rows]

def revoke_file(db: Session, *, file_id: uuid.UUID,
                patient_id: uuid.UUID) -> None:
    result = db.execute(
        file_permission.update()
        .where(
            file_permission.c.file_id == file_id,
            file_permission.c.patient_id == patient_id,
            file_permission.c.revoked_at.is_(None),
        )
        .values(revoked_at=sa.func.now())
    )
    db.commit()
    if result.rowcount == 0:
        raise ValueError("No active permission found")


def delete_file(db: Session, *, file_id: uuid.UUID, patient_id: uuid.UUID) -> None:
    file_row = db.execute(
        sa.select(medical_file.c.id).where(
            medical_file.c.id == file_id,
            medical_file.c.patient_id == patient_id,
            medical_file.c.deleted_at.is_(None),
        )
    ).fetchone()
    if not file_row:
        raise ValueError("File not found")

    db.execute(
        file_permission.update()
        .where(
            file_permission.c.file_id == file_id,
            file_permission.c.patient_id == patient_id,
            file_permission.c.revoked_at.is_(None),
        )
        .values(revoked_at=sa.func.now())
    )

    db.execute(
        medical_file.update()
        .where(
            medical_file.c.id == file_id,
            medical_file.c.patient_id == patient_id,
            medical_file.c.deleted_at.is_(None),
        )
        .values(deleted_at=sa.func.now())
    )
    db.commit()