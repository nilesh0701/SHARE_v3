import uuid
from enum import Enum
from dataclasses import dataclass
from typing import Optional
from datetime import datetime, timezone
import sqlalchemy as sa
from sqlalchemy.orm import Session
from app.models.tables import file_permission, user, medical_file, audit_log


class AuthorizeOutcome(str, Enum):
    OK = "OK"
    DENY_NOT_FOUND = "DENY_NOT_FOUND"
    DENY_REVOKED = "DENY_REVOKED"
    DENY_NOT_STARTED = "DENY_NOT_STARTED"
    DENY_EXPIRED = "DENY_EXPIRED"
    DENY_WRONG_DOCTOR = "DENY_WRONG_DOCTOR"
    DENY_FILE_DELETED = "DENY_FILE_DELETED"
    DENY_DOCTOR_INACTIVE = "DENY_DOCTOR_INACTIVE"


@dataclass
class AuthorizeResult:
    outcome: AuthorizeOutcome
    file_url: Optional[str] = None
    file_name: Optional[str] = None


def authorize(*, db: Session, permission_id: uuid.UUID,
              doctor_id: uuid.UUID) -> AuthorizeResult:

    stmt = (
        sa.select(
            file_permission.c.id,
            file_permission.c.doctor_id,
            file_permission.c.file_id,
            file_permission.c.revoked_at,
            file_permission.c.granted_at,
            file_permission.c.expires_at,
            user.c.status.label("doctor_status"),
            medical_file.c.deleted_at.label("file_deleted_at"),
            medical_file.c.cloudinary_url,
            medical_file.c.name.label("file_name"),
        )
        .select_from(
            file_permission
            .join(user, user.c.id == file_permission.c.doctor_id)
            .join(medical_file, medical_file.c.id == file_permission.c.file_id)
        )
        .where(file_permission.c.id == permission_id)
    )

    row = db.execute(stmt).fetchone()
    now = datetime.now(timezone.utc)

    if row is None:
        outcome, url, name = AuthorizeOutcome.DENY_NOT_FOUND, None, None
    elif row.doctor_id != doctor_id:
        outcome, url, name = AuthorizeOutcome.DENY_WRONG_DOCTOR, None, None
    elif row.revoked_at is not None:
        outcome, url, name = AuthorizeOutcome.DENY_REVOKED, None, None
    elif row.granted_at.replace(tzinfo=timezone.utc) > now:
        outcome, url, name = AuthorizeOutcome.DENY_NOT_STARTED, None, None
    elif row.expires_at.replace(tzinfo=timezone.utc) <= now:
        outcome, url, name = AuthorizeOutcome.DENY_EXPIRED, None, None
    elif row.doctor_status != "ACTIVE":
        outcome, url, name = AuthorizeOutcome.DENY_DOCTOR_INACTIVE, None, None
    elif row.file_deleted_at is not None:
        outcome, url, name = AuthorizeOutcome.DENY_FILE_DELETED, None, None
    else:
        outcome = AuthorizeOutcome.OK
        url = row.cloudinary_url
        name = row.file_name

    db.execute(audit_log.insert().values(
        permission_id=permission_id,
        doctor_id=doctor_id,
        file_id=row.file_id if row else None,
        outcome=outcome.value,
        deny_reason=None if outcome == AuthorizeOutcome.OK else outcome.value,
    ))
    db.commit()

    return AuthorizeResult(outcome=outcome, file_url=url, file_name=name)