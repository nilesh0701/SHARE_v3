import uuid
import sqlalchemy as sa
from sqlalchemy import (
    Table, Column, String, Text, Integer, Boolean,
    DateTime, ForeignKey, Enum, CheckConstraint, Index, text
)
from sqlalchemy.dialects.postgresql import UUID
from app.db import metadata


tenant = Table(
    "tenant", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("name", String(255), nullable=False, unique=True),
    Column("created_at", DateTime(timezone=True),
           server_default=sa.func.now(), nullable=False),
)

user = Table(
    "user", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("email", String(320), nullable=False, unique=True),
    Column("password_hash", Text, nullable=False),
    Column("role", Enum("PATIENT", "DOCTOR", "ADMIN", name="user_role"), nullable=False),
    Column("status", Enum("ACTIVE", "INACTIVE", "PENDING", name="user_status"),
           nullable=False, server_default="ACTIVE"),
    Column("created_at", DateTime(timezone=True),
           server_default=sa.func.now(), nullable=False),
)

Index("ix_user_email", user.c.email, unique=True)

doctor_profile = Table(
    "doctor_profile", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("user_id", UUID(as_uuid=True),
           ForeignKey("user.id", ondelete="RESTRICT"), nullable=False, unique=True),
    Column("full_name", String(255), nullable=False),
    Column("specialty", String(255), nullable=False),
    Column("bio", Text, nullable=True),
    Column("consultation_fee", Integer, nullable=False),
    Column("consultation_type", Enum("VIDEO", "IN_PERSON", "BOTH",
           name="consultation_type"), nullable=False),
    Column("clinic_address", Text, nullable=True),
    Column("gender", Enum("MALE", "FEMALE", "OTHER", name="gender_type"), nullable=True),
    Column("certificate_url", Text, nullable=True),
    Column("verification_status", Enum("PENDING", "APPROVED", "REJECTED",
           name="verification_status"), nullable=False, server_default="PENDING"),
    Column("rejection_reason", Text, nullable=True),
    Column("created_at", DateTime(timezone=True),
           server_default=sa.func.now(), nullable=False),
)

Index("ix_doctor_specialty", doctor_profile.c.specialty)
Index("ix_doctor_verification", doctor_profile.c.verification_status)

patient_profile = Table(
    "patient_profile", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("user_id", UUID(as_uuid=True),
           ForeignKey("user.id", ondelete="RESTRICT"), nullable=False, unique=True),
    Column("full_name", String(255), nullable=False),
    Column("date_of_birth", String(20), nullable=True),
    Column("phone", String(20), nullable=True),
    Column("created_at", DateTime(timezone=True),
           server_default=sa.func.now(), nullable=False),
)

availability = Table(
    "availability", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("doctor_id", UUID(as_uuid=True),
           ForeignKey("user.id", ondelete="RESTRICT"), nullable=False),
    Column("day_of_week", Integer, nullable=False),
    Column("start_time", String(10), nullable=False),
    Column("end_time", String(10), nullable=False),
    Column("slot_duration_minutes", Integer, nullable=False, server_default="30"),
    CheckConstraint("day_of_week >= 0 AND day_of_week <= 6",
                    name="ck_day_of_week"),
)

Index("ix_availability_doctor", availability.c.doctor_id)

appointment = Table(
    "appointment", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("patient_id", UUID(as_uuid=True),
           ForeignKey("user.id", ondelete="RESTRICT"), nullable=False),
    Column("doctor_id", UUID(as_uuid=True),
           ForeignKey("user.id", ondelete="RESTRICT"), nullable=False),
    Column("scheduled_at", DateTime(timezone=True), nullable=False),
    Column("duration_minutes", Integer, nullable=False, server_default="30"),
    Column("status", Enum("PENDING", "CONFIRMED", "CANCELLED", "COMPLETED",
           name="appointment_status"), nullable=False, server_default="PENDING"),
    Column("consultation_type", Enum("VIDEO", "IN_PERSON",
           name="appt_consultation_type"), nullable=False),
    Column("meeting_link", Text, nullable=True),
    Column("payment_status", Enum("PENDING", "PAID", name="payment_status"),
           nullable=False, server_default="PENDING"),
    Column("payment_amount", Integer, nullable=True),
    Column("notes", Text, nullable=True),
    Column("created_at", DateTime(timezone=True),
           server_default=sa.func.now(), nullable=False),
)

Index("ix_appointment_patient", appointment.c.patient_id)
Index("ix_appointment_doctor", appointment.c.doctor_id)
Index("ix_appointment_scheduled", appointment.c.scheduled_at)

medical_file = Table(
    "medical_file", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("patient_id", UUID(as_uuid=True),
           ForeignKey("user.id", ondelete="RESTRICT"), nullable=False),
    Column("name", String(512), nullable=False),
    Column("cloudinary_url", Text, nullable=False),
    Column("cloudinary_public_id", Text, nullable=False),
    Column("file_type", String(100), nullable=False),
    Column("size_bytes", Integer, nullable=False),
    Column("uploaded_at", DateTime(timezone=True),
           server_default=sa.func.now(), nullable=False),
    Column("deleted_at", DateTime(timezone=True), nullable=True),
)

Index("ix_medical_file_patient", medical_file.c.patient_id)

file_permission = Table(
    "file_permission", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("file_id", UUID(as_uuid=True),
           ForeignKey("medical_file.id", ondelete="RESTRICT"), nullable=False),
    Column("patient_id", UUID(as_uuid=True),
           ForeignKey("user.id", ondelete="RESTRICT"), nullable=False),
    Column("doctor_id", UUID(as_uuid=True),
           ForeignKey("user.id", ondelete="RESTRICT"), nullable=False),
    Column("granted_at", DateTime(timezone=True),
           server_default=sa.func.now(), nullable=False),
    Column("expires_at", DateTime(timezone=True), nullable=False),
    Column("revoked_at", DateTime(timezone=True), nullable=True),
)

Index("ix_file_permission_active", file_permission.c.file_id,
      file_permission.c.doctor_id,
      postgresql_where=text("revoked_at IS NULL"))

audit_log = Table(
    "audit_log", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("permission_id", UUID(as_uuid=True), nullable=True),
    Column("doctor_id", UUID(as_uuid=True),
           ForeignKey("user.id", ondelete="RESTRICT"), nullable=False),
    Column("file_id", UUID(as_uuid=True), nullable=True),
    Column("outcome", String(64), nullable=False),
    Column("deny_reason", String(255), nullable=True),
    Column("accessed_at", DateTime(timezone=True),
           server_default=sa.func.now(), nullable=False),
)

review = Table(
    "review", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("patient_id", UUID(as_uuid=True),
           ForeignKey("user.id", ondelete="RESTRICT"), nullable=False),
    Column("doctor_id", UUID(as_uuid=True),
           ForeignKey("user.id", ondelete="RESTRICT"), nullable=False),
    Column("appointment_id", UUID(as_uuid=True),
           ForeignKey("appointment.id", ondelete="RESTRICT"), nullable=False),
    Column("rating", Integer, nullable=False),
    Column("comment", Text, nullable=True),
    Column("created_at", DateTime(timezone=True),
           server_default=sa.func.now(), nullable=False),
    CheckConstraint("rating >= 1 AND rating <= 5", name="ck_rating_range"),
)