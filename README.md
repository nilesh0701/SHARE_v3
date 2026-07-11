# SHARE

Patient–doctor telemedicine platform with appointment booking and secure, consent-based medical record sharing.

## Key features

- **Role-based access** — JWT authentication with `PATIENT`, `DOCTOR`, and `ADMIN` roles
- **Patient registration** — Self-service signup; accounts are immediately `ACTIVE`
- **Doctor registration & verification** — Doctors upload a PNG certificate (Cloudinary); account stays `PENDING` until an admin approves or rejects
- **Doctor discovery** — Search approved, active doctors by specialty, consultation type, and gender
- **Availability & booking** — Doctors set weekly slots; patients book appointments; doctors confirm bookings
- **Consultation modes** — `VIDEO` (auto-generated Jitsi Meet link) or `IN_PERSON`
- **Medical records** — Patients upload files to Cloudinary; share with doctors only when an upcoming appointment exists
- **Consent-based file access** — Time-bound, revocable permissions; doctors access files only after `authorize()` checks; all access attempts are audit-logged
- **Admin dashboard** — Review pending doctors, approve/reject applications, download certificates, view aggregate reports
- **Demo payment UI** — Frontend payment page simulates checkout; no real payment processor is integrated

> **Not yet implemented:** The `review` table exists in the schema but has no API endpoints or UI.

## Tech stack

### Backend

| Package | Version |
|---------|---------|
| FastAPI | 0.135.1 |
| Uvicorn | 0.41.0 |
| SQLAlchemy | 2.0.48 |
| psycopg2-binary | 2.9.11 |
| Pydantic | 2.12.5 |
| pydantic-settings | 2.13.1 |
| python-jose | 3.5.0 |
| bcrypt | 5.0.0 |
| Cloudinary | 1.44.1 |
| Alembic | 1.18.4 |

### Frontend

| Package | Version |
|---------|---------|
| Next.js | 16.1.6 |
| React | 19.2.3 |
| TypeScript | ^5 |
| Tailwind CSS | ^4 |
| TanStack React Query | ^5.90.21 |
| Axios | ^1.13.6 |

## Project structure

```
SHARE_v2/
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI routers
│   │   │   ├── auth.py       # Patient/doctor registration, login
│   │   │   ├── doctors.py    # Doctor search, profiles, availability
│   │   │   ├── appointments.py
│   │   │   ├── files.py      # Upload, share, revoke, extend permissions
│   │   │   ├── admin.py      # Doctor verification, reports
│   │   │   └── doctor_extras.py  # Doctor appointment detail, shared-file views
│   │   ├── services/         # Business logic (auth, appointments, files, authorize, admin)
│   │   ├── models/
│   │   │   └── tables.py     # SQLAlchemy Core table definitions
│   │   ├── dependencies.py   # JWT auth + role guards
│   │   ├── config.py         # Settings from .env
│   │   ├── db.py             # PostgreSQL engine + session
│   │   └── main.py           # App entry point
│   ├── scripts/
│   │   └── init_db.py        # One-time schema bootstrap
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── (auth)/           # login, register
│   │   ├── (patient)/        # dashboard, search, doctor detail, appointments, records, payment
│   │   ├── (doctor)/         # doctor-dashboard, doctor-availability
│   │   └── (admin)/          # admin-dashboard
│   ├── components/           # Shared UI (auth bootstrap, PDF viewer, theme)
│   └── lib/                  # axios client, auth helpers
└── start.sh                  # Starts backend + frontend dev servers
```

## Prerequisites

- **Python** 3.11+
- **Node.js** 20+ (inferred from `@types/node: ^20` in `frontend/package.json`)
- **PostgreSQL**
- **Cloudinary account** — medical file and doctor certificate storage
- **Jitsi Meet** — video consultations use public `meet.jit.si` rooms (no account required)

## Setup & run

### Environment variables

Create `backend/.env` with every variable read by `config.py` and `db.py`:

```env
DATABASE_URL=
DB_SSLMODE=require
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
JWT_SECRET=
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=120
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

`pydantic-settings` maps field names to uppercase env keys (e.g. `database_url` → `DATABASE_URL`). `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES`, and `DB_SSLMODE` have defaults.

**SSL mode:**

- Cloud-hosted PostgreSQL (e.g. Neon, Supabase, RDS): leave `DB_SSLMODE=require` (default).
- Local PostgreSQL without SSL: set `DB_SSLMODE=disable` in `.env`.

### Backend

```bash
cd backend
python -m venv venv

# Windows (Git Bash / MSYS)
source venv/Scripts/activate

# macOS / Linux
# source venv/bin/activate

pip install -r requirements.txt
```

Create the database schema (one-time, or after schema changes in `tables.py`):

```bash
python -m scripts.init_db
```

Start the API server:

```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

API base URL is hardcoded to `http://127.0.0.1:8000` in `frontend/lib/axios.ts`. No frontend `.env` is required.

### Run both (root script)

`start.sh` resolves its own directory and starts the backend (Uvicorn on port 8000) and frontend (`npm run dev` on port 3000) in parallel:

```bash
chmod +x start.sh
./start.sh
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://127.0.0.1:8000 |
| Swagger UI | http://127.0.0.1:8000/docs |
| ReDoc | http://127.0.0.1:8000/redoc |

### Other npm scripts

```bash
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
```

## API documentation

FastAPI auto-generates interactive docs — treat `/docs` as the source of truth for request/response shapes.

| Tag | Prefix | Purpose |
|-----|--------|---------|
| `auth` | `/auth` | Patient/doctor registration, login |
| `doctors` | `/doctors` | Search doctors, profiles, availability (doctor-only write) |
| `appointments` | `/appointments` | Book, list, confirm, cancel, delete |
| `files` | `/files` | Upload, share, revoke, extend, doctor access |
| `admin` | `/admin` | Pending doctors, approve/reject, reports, certificate download |
| `doctor-extras` | `/doctor` | Appointment detail, shared-file listings, secure PDF stream |

Also: `GET /health`

## User roles

### PATIENT

- Register and log in immediately (`ACTIVE`)
- Search doctors and book appointments
- Upload medical files; share with a doctor only when an upcoming appointment exists
- Set share windows, revoke access, extend permissions
- Cancel own appointments (reason required); delete appointments after they end

### DOCTOR

- Register with PNG certificate; account is `PENDING` until admin approval
- Cannot log in while `PENDING` or `INACTIVE`
- Set weekly availability; confirm appointments
- View appointment details and files shared with them (active, non-revoked, in-window permissions)
- Access shared files via `authorize()` — denied if revoked, expired, wrong doctor, or file deleted; attempts are audit-logged
- Cancel/delete own appointments (same rules as patients)

### ADMIN

- Not stored in the database — authenticated via `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`
- Receives a JWT with role `ADMIN` and a fixed UUID (`00000000-0000-0000-0000-000000000000`)
- List pending/all doctors; approve or reject applications
- Download doctor certificates; view aggregate reports

## License

License: TBD
