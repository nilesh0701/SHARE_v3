# Backend (`backend/app/`)

FastAPI application for the SHARE telemedicine API.

- `api/` — HTTP routers (auth, doctors, appointments, files, admin, doctor-extras)
- `services/` — Business logic and authorization
- `models/tables.py` — PostgreSQL table definitions (SQLAlchemy Core)

Run from `backend/`: `uvicorn app.main:app --reload --port 8000`. Full setup: see the [repository root README](../../README.md).
