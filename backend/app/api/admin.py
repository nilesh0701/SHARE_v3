import uuid
from urllib.request import Request, urlopen
import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.db import get_db
from app.dependencies import require_admin, CurrentUser
from app.models.tables import doctor_profile
from app.services.admin_service import (
    get_pending_doctors, get_all_doctors, approve_doctor, reject_doctor, get_reports
)

router = APIRouter(prefix="/admin", tags=["admin"])

class RejectBody(BaseModel):
    reason: Optional[str] = "Does not meet requirements"

@router.get("/pending-doctors")
def pending(db: Session = Depends(get_db),
            current: CurrentUser = Depends(require_admin)):
    result = get_pending_doctors(db)
    return {"success": True, "data": result}


@router.get("/doctors")
def doctors(db: Session = Depends(get_db),
            current: CurrentUser = Depends(require_admin)):
    result = get_all_doctors(db)
    return {"success": True, "data": result}

@router.put("/doctors/{doctor_id}/approve")
def approve(doctor_id: uuid.UUID, db: Session = Depends(get_db),
            current: CurrentUser = Depends(require_admin)):
    approve_doctor(db, doctor_user_id=doctor_id)
    return {"success": True, "data": {"approved": True}}

@router.put("/doctors/{doctor_id}/reject")
def reject(doctor_id: uuid.UUID, body: RejectBody,
           db: Session = Depends(get_db),
           current: CurrentUser = Depends(require_admin)):
    reject_doctor(db, doctor_user_id=doctor_id, reason=body.reason)
    return {"success": True, "data": {"rejected": True}}

@router.get("/reports")
def reports(db: Session = Depends(get_db),
            current: CurrentUser = Depends(require_admin)):
    result = get_reports(db)
    return {"success": True, "data": result}


@router.get("/doctors/{doctor_id}/certificate/download")
def download_doctor_certificate(
    doctor_id: uuid.UUID,
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_admin),
):
    row = db.execute(
        sa.select(
            doctor_profile.c.certificate_url,
            doctor_profile.c.full_name,
        ).where(doctor_profile.c.user_id == doctor_id)
    ).fetchone()
    if not row or not row.certificate_url:
        raise HTTPException(status_code=404, detail="Certificate not found")

    source_request = Request(row.certificate_url, headers={"User-Agent": "SHARE-admin-cert-download"})
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

    safe_name = (row.full_name or "doctor").replace(" ", "_")

    filename = f"{safe_name}_certificate.png"
    media_type = "image/png"

    return StreamingResponse(
        iter_bytes(),
        media_type=media_type,
        headers={
            "Content-Type": media_type,
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )