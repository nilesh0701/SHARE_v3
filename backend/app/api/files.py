import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from app.db import get_db
from app.dependencies import require_patient, require_doctor, CurrentUser
from app.services.file_service import (
    upload_medical_file, get_patient_files, share_file, revoke_file, delete_file
)
from app.services.authorize import authorize, AuthorizeOutcome

router = APIRouter(prefix="/files", tags=["files"])

class ShareRequest(BaseModel):
    doctor_id: uuid.UUID
    start_date: datetime
    end_date: datetime

@router.post("")
async def upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_patient)
):
    content = await file.read()
    try:
        result = upload_medical_file(
            db, patient_id=current.user_id,
            file_name=file.filename,
            file_bytes=content,
            file_type=file.content_type or "application/octet-stream",
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/mine")
def my_files(
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_patient)
):
    result = get_patient_files(db, patient_id=current.user_id)
    return {"success": True, "data": result}

@router.post("/{file_id}/share")
def share(
    file_id: uuid.UUID,
    body: ShareRequest,
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_patient)
):
    try:
        result = share_file(
            db, file_id=file_id, patient_id=current.user_id,
            doctor_id=body.doctor_id,
            start_date=body.start_date,
            end_date=body.end_date,
        )
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/shares")
def my_shares(
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_patient),
):
    """List all shares (active/expired/revoked) created by the current patient."""
    from app.services.file_service import get_patient_shares

    result = get_patient_shares(db, patient_id=current.user_id)
    return {"success": True, "data": result}

@router.post("/{file_id}/revoke")
def revoke(
    file_id: uuid.UUID,
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_patient)
):
    try:
        revoke_file(db, file_id=file_id, patient_id=current.user_id)
        return {"success": True, "data": {"revoked": True}}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{file_id}")
def delete_uploaded_file(
    file_id: uuid.UUID,
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_patient)
):
    try:
        delete_file(db, file_id=file_id, patient_id=current.user_id)
        return {"success": True, "data": {"deleted": True}}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{file_id}/access")
def access(
    file_id: uuid.UUID,
    permission_id: uuid.UUID,
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_doctor)
):
    result = authorize(db=db, permission_id=permission_id,
                       doctor_id=current.user_id)
    if result.outcome == AuthorizeOutcome.OK:
        return {"success": True, "data": {
            "url": result.file_url,
            "name": result.file_name
        }}
    if result.outcome in (AuthorizeOutcome.DENY_NOT_FOUND,
                          AuthorizeOutcome.DENY_WRONG_DOCTOR):
        raise HTTPException(status_code=404, detail="Not found")
    raise HTTPException(status_code=403, detail="Access denied")