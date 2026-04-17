import uuid
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.db import get_db
from app.services.auth_service import register_patient, register_doctor, login_user
from app.services.file_service import cloudinary
import cloudinary.uploader

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register/patient")
def reg_patient(
    email: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    phone: str = Form(None),
    date_of_birth: str = Form(None),
    db: Session = Depends(get_db)
):
    try:
        result = register_patient(db, email=email, password=password,
                                  full_name=full_name, phone=phone,
                                  date_of_birth=date_of_birth)
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/register/doctor")
async def reg_doctor(
    email: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    specialty: str = Form(...),
    bio: str = Form(...),
    consultation_fee: int = Form(...),
    consultation_type: str = Form(...),
    clinic_address: str = Form(None),
    gender: str = Form(None),
    certificate: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        cert_ext = os.path.splitext(certificate.filename or "")[1].lower()
        cert_content_type = (certificate.content_type or "").lower()
        if cert_ext != ".png" and cert_content_type != "image/png":
            raise ValueError("Only PNG certificate files are allowed")

        cert_bytes = await certificate.read()
        upload_result = cloudinary.uploader.upload(
            cert_bytes,
            folder="medshare/certificates",
            resource_type="image",
            format="png",
        )
        cert_url = upload_result["secure_url"]

        result = register_doctor(
            db, email=email, password=password, full_name=full_name,
            specialty=specialty, bio=bio, consultation_fee=consultation_fee,
            consultation_type=consultation_type, clinic_address=clinic_address,
            gender=gender, certificate_url=cert_url,
        )
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login")
def login(
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        token = login_user(db, email=email, password=password)
        return {"success": True, "data": {"access_token": token, "token_type": "bearer"}}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))