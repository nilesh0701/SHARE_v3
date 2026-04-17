import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db import get_db
from app.dependencies import get_current_user, require_doctor, CurrentUser
from app.services.doctor_service import (
    get_doctors, get_doctor_by_id,
    get_doctor_availability, set_availability
)
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/doctors", tags=["doctors"])

class AvailabilitySlot(BaseModel):
    day_of_week: int
    start_time: str
    end_time: str
    slot_duration_minutes: int = 30

@router.get("")
def search_doctors(
    specialty: Optional[str] = Query(None),
    consultation_type: Optional[str] = Query(None),
    gender: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    results = get_doctors(db, specialty=specialty,
                          consultation_type=consultation_type, gender=gender)
    return {"success": True, "data": results}

@router.get("/{doctor_id}")
def doctor_profile(doctor_id: uuid.UUID, db: Session = Depends(get_db)):
    try:
        result = get_doctor_by_id(db, doctor_id=doctor_id)
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{doctor_id}/availability")
def doctor_slots(doctor_id: uuid.UUID, db: Session = Depends(get_db)):
    result = get_doctor_availability(db, doctor_id=doctor_id)
    return {"success": True, "data": result}

@router.post("/availability")
def update_availability(
    slots: List[AvailabilitySlot],
    db: Session = Depends(get_db),
    current: CurrentUser = Depends(require_doctor)
):
    set_availability(db, doctor_id=current.user_id,
                     slots=[s.dict() for s in slots])
    return {"success": True, "data": {"message": "Availability updated"}}