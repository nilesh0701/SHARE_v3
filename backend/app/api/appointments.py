import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.db import get_db
from app.dependencies import get_current_user, require_patient, require_doctor, CurrentUser
from app.services.appointment_service import (
    book_appointment, get_appointments, update_appointment_status
)

router = APIRouter(prefix="/appointments", tags=["appointments"])

class BookRequest(BaseModel):
    doctor_id: uuid.UUID
    scheduled_at: datetime
    consultation_type: str
    notes: Optional[str] = None

@router.post("")
def book(
    body: BookRequest,
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_patient)
):
    try:
        result = book_appointment(
            db, patient_id=current.user_id,
            doctor_id=body.doctor_id,
            scheduled_at=body.scheduled_at,
            consultation_type=body.consultation_type,
            notes=body.notes,
        )
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/mine")
def my_appointments(
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(get_current_user)
):
    result = get_appointments(db, user_id=current.user_id, role=current.role)
    return {"success": True, "data": result}

@router.put("/{appointment_id}/confirm")
def confirm(
    appointment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_doctor)
):
    try:
        update_appointment_status(db, appointment_id=appointment_id,
                                  new_status="CONFIRMED",
                                  user_id=current.user_id, role=current.role)
        return {"success": True, "data": {"status": "CONFIRMED"}}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{appointment_id}/cancel")
def cancel(
    appointment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(get_current_user)
):
    try:
        update_appointment_status(db, appointment_id=appointment_id,
                                  new_status="CANCELLED",
                                  user_id=current.user_id, role=current.role)
        return {"success": True, "data": {"status": "CANCELLED"}}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))