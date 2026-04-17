import uuid
import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from urllib.request import Request, urlopen
from app.db import get_db
from app.dependencies import require_doctor, CurrentUser
from app.models.tables import (
    appointment, patient_profile, user,
    file_permission, medical_file, audit_log
)
from app.services.authorize import authorize, AuthorizeOutcome

router = APIRouter(prefix="/doctor", tags=["doctor-extras"])


@router.get("/appointment/{appointment_id}/detail")
def appointment_detail(
    appointment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_doctor),
):
    """Full appointment details including patient name."""
    row = db.execute(
        sa.select(
            appointment,
            patient_profile.c.full_name.label("patient_name"),
            patient_profile.c.phone.label("patient_phone"),
            patient_profile.c.date_of_birth.label("patient_dob"),
            user.c.email.label("patient_email"),
        )
        .join(patient_profile, patient_profile.c.user_id == appointment.c.patient_id)
        .join(user, user.c.id == appointment.c.patient_id)
        .where(
            appointment.c.id == appointment_id,
            appointment.c.doctor_id == current.user_id,
        )
    ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Appointment not found")

    return {"success": True, "data": dict(row._mapping)}


@router.get("/shared-files")
def files_shared_with_doctor(
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_doctor),
):
    """All active file permissions granted to this doctor."""
    rows = db.execute(
        sa.select(
            file_permission.c.id.label("permission_id"),
            file_permission.c.file_id,
            file_permission.c.patient_id,
            file_permission.c.granted_at,
            file_permission.c.expires_at,
            file_permission.c.revoked_at,
            medical_file.c.name.label("file_name"),
            medical_file.c.file_type,
            medical_file.c.size_bytes,
            patient_profile.c.full_name.label("patient_name"),
        )
        .join(medical_file, medical_file.c.id == file_permission.c.file_id)
        .join(patient_profile, patient_profile.c.user_id == file_permission.c.patient_id)
        .where(
            file_permission.c.doctor_id == current.user_id,
            file_permission.c.revoked_at.is_(None),
            file_permission.c.granted_at <= sa.func.now(),
            file_permission.c.expires_at > sa.func.now(),
            medical_file.c.deleted_at.is_(None),
        )
        .order_by(file_permission.c.granted_at.desc())
    ).fetchall()

    return {"success": True, "data": [dict(r._mapping) for r in rows]}


@router.get("/shared-files/patient/{patient_id}")
def files_shared_by_patient(
    patient_id: uuid.UUID,
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_doctor),
):
    """Files shared by a specific patient with this doctor."""
    rows = db.execute(
        sa.select(
            file_permission.c.id.label("permission_id"),
            file_permission.c.file_id,
            file_permission.c.granted_at,
            file_permission.c.expires_at,
            medical_file.c.name.label("file_name"),
            medical_file.c.file_type,
            medical_file.c.size_bytes,
        )
        .join(medical_file, medical_file.c.id == file_permission.c.file_id)
        .where(
            file_permission.c.doctor_id == current.user_id,
            file_permission.c.patient_id == patient_id,
            file_permission.c.revoked_at.is_(None),
            file_permission.c.granted_at <= sa.func.now(),
            file_permission.c.expires_at > sa.func.now(),
            medical_file.c.deleted_at.is_(None),
        )
        .order_by(file_permission.c.granted_at.desc())
    ).fetchall()

    return {"success": True, "data": [dict(r._mapping) for r in rows]}

@router.get("/shared-files/notifications")
def shared_file_notifications(
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_doctor),
):
    rows = db.execute(
        sa.select(
            file_permission.c.id.label("permission_id"),
            file_permission.c.granted_at,
            patient_profile.c.full_name.label("patient_name"),
            medical_file.c.name.label("file_name"),
            medical_file.c.file_type.label("report_type"),
        )
        .join(medical_file, medical_file.c.id == file_permission.c.file_id)
        .join(patient_profile, patient_profile.c.user_id == file_permission.c.patient_id)
        .where(
            file_permission.c.doctor_id == current.user_id,
            file_permission.c.revoked_at.is_(None),
            medical_file.c.deleted_at.is_(None),
        )
        .order_by(file_permission.c.granted_at.desc())
        .limit(10)
    ).fetchall()
    return {"success": True, "data": [dict(r._mapping) for r in rows]}


@router.get("/file/{permission_id}/view")
def view_file(
    permission_id: uuid.UUID,
    probe: bool = Query(False, description="If true, only validate access."),
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_doctor),
):
    """Stream a PDF using permission_id after authorize() passes."""
    result = authorize(db=db, permission_id=permission_id, doctor_id=current.user_id)

    if result.outcome == AuthorizeOutcome.OK:
        if probe:
            return {"success": True, "data": {"authorized": True}}

        source_request = Request(result.file_url, headers={"User-Agent": "SHARE-secure-stream"})
        upstream = urlopen(source_request, timeout=30)

        def iter_bytes():
            try:
                while True:
                    chunk = upstream.read(64 * 1024)
                    if not chunk:
                        break
                    yield chunk
            finally:
                upstream.close()

        return StreamingResponse(
            iter_bytes(),
            media_type="application/pdf",
            headers={
                "Content-Type": "application/pdf",
                "Content-Disposition": 'inline; filename="report.pdf"',
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
            },
        )
    if result.outcome in (AuthorizeOutcome.DENY_NOT_FOUND, AuthorizeOutcome.DENY_WRONG_DOCTOR):
        raise HTTPException(status_code=404, detail="File not found")
    raise HTTPException(status_code=403, detail=result.outcome.value)