# SHARE — Healthcare Platform

A full-stack healthcare appointment and medical file sharing platform.
Patients book doctors, manage private medical records, and share files securely.
Doctors get verified before going live. Admins manage verifications.

---

## What it does

- Patients search and book verified doctors
- Patients upload medical records privately (stored on Cloudinary)
- Patients share files with a specific doctor for an appointment-bound access window
- Patients can revoke file access at any time
- Doctors register with a medical certificate and wait for admin approval
- Doctors manage availability and confirm/cancel appointments
- Doctors see patient names directly on appointment cards in the dashboard
- Doctors can view a persistent "Current Schedule" list below Set Availability
- Video appointments get a Jitsi meeting link automatically
- Admin approves/rejects doctors and views platform reports
- Every file access attempt is permanently audit logged
- Single `authorize()` function enforces all file access — no exceptions
- File access is auto-revoked after the linked appointment end time

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12 + FastAPI |
| Database | Neon (cloud PostgreSQL — free tier) |
| File Storage | Cloudinary (free tier) |
| Frontend | Next.js 14 + TypeScript + TailwindCSS |
| Auth | JWT (stored in memory) |
| Video Calls | Jitsi Meet (free, no API key) |

---

## Project Structure
```
medshare/
├── start.sh                    ← Start everything with one command
├── backend/
│   ├── .env                    ← Environment variables (create from .env.example)
│   ├── requirements.txt        ← Python dependencies
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── db.py
│       ├── dependencies.py
│       ├── models/tables.py    ← Database schema (10 tables)
│       ├── services/
│       │   ├── authorize.py    ← Core file access enforcement
│       │   ├── auth_service.py
│       │   ├── file_service.py
│       │   ├── doctor_service.py
│       │   ├── appointment_service.py
│       │   └── admin_service.py
│       └── api/
│           ├── auth.py
│           ├── doctors.py
│           ├── appointments.py
│           ├── files.py
│           └── admin.py
└── frontend/
    ├── app/
    │   ├── (auth)/login/
    │   ├── (auth)/register/
    │   ├── (patient)/dashboard/
    │   ├── (patient)/search/
    │   ├── (patient)/doctor/[id]/
    │   ├── (patient)/appointments/
    │   ├── (patient)/records/
    │   ├── (patient)/payment/
    │   ├── (doctor)/doctor-dashboard/
    │   ├── (doctor)/doctor-availability/
    │   └── (admin)/admin-dashboard/
    ├── lib/
    │   ├── axios.ts
    │   └── auth.ts
    └── types/index.ts
```

---

## Prerequisites

Install these before starting:

- [Python 3.12](https://www.python.org/downloads/) — check "Add to PATH" during install
- [Node.js 18+](https://nodejs.org/en/download) — LTS version
- [Git](https://git-scm.com/download/win)
- [VS Code](https://code.visualstudio.com/download)

---

## Setup — First Time Only

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/medshare.git
cd /d/medshare
```

### 2. Create backend environment file

Create `backend/.env` with these values:
```env
DATABASE_URL=postgresql://neondb_owner:npg_YeUCqAh1uK2x@ep-divine-hall-a1rhub5f-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
CLOUDINARY_CLOUD_NAME=dkekh1pwd
CLOUDINARY_API_KEY=114781595295742
CLOUDINARY_API_SECRET=ask_project_owner_for_this
JWT_SECRET=medshare_super_secret_key_change_in_prod
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=120
ADMIN_EMAIL=admin@medshare.com
ADMIN_PASSWORD=admin123
```

> ⚠️ Ask the project owner for `CLOUDINARY_API_SECRET`

### 3. Install backend dependencies
```bash
cd /d/medshare/backend
python -m venv venv
source venv/Scripts/activate
pip install -r requirements.txt
```

### 4. Install frontend dependencies
```bash
cd /d/medshare/frontend
npm install
```

### 5. Make start script executable
```bash
chmod +x /d/medshare/start.sh
```

---

## Running the Project

From the project root, one command starts everything:
```bash
cd /d/medshare
./start.sh
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://127.0.0.1:8000 |
| API Docs (Swagger) | http://127.0.0.1:8000/docs |

Press `Ctrl+C` to stop everything.

---

## Test Accounts

### Admin
```
Email:    admin@medshare.com
Password: admin123
```

### Create your own test accounts
1. Go to `http://localhost:3000/register?role=patient` to register a patient
2. Go to `http://localhost:3000/register?role=doctor` to register a doctor
3. Login as admin and approve the doctor

---

## Full User Flow

### Patient flow
1. Register at `/register?role=patient`
2. Login → lands on Dashboard
3. Click "Find a Doctor" → search by specialty
4. Click a doctor → book an appointment → dummy payment
5. Go to "Medical Records" → upload a file
6. Click Share → select eligible doctor + set start → confirm
7. System automatically sets permission expiry to appointment end time
8. See shared access status countdown in Medical Records cards
9. Click Revoke at any time to remove access

### Doctor flow
1. Register at `/register?role=doctor` + upload certificate
2. Wait for admin approval
3. Login → Doctor Dashboard → set availability
4. Doctor Dashboard cards show patient full name + appointment details
5. Doctor Availability page keeps a persistent "Current Schedule" view
6. View incoming appointment requests → confirm or cancel
7. Access patient shared files only while permission is valid

### Admin flow
1. Login with admin credentials
2. View pending doctor verifications
3. Click "View Certificate" to inspect
4. Approve or Reject with a reason

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register/patient` | Register patient |
| POST | `/auth/register/doctor` | Register doctor + upload certificate |
| POST | `/auth/login` | Login → returns JWT |
| GET | `/doctors` | Search doctors with filters |
| GET | `/doctors/{id}` | Doctor profile |
| GET | `/doctors/{id}/availability` | Doctor's available slots |
| POST | `/doctors/availability` | Doctor sets availability |
| POST | `/appointments` | Patient books appointment |
| GET | `/appointments/mine` | View own appointments |
| PUT | `/appointments/{id}/confirm` | Doctor confirms |
| PUT | `/appointments/{id}/cancel` | Cancel appointment |
| POST | `/files` | Patient uploads medical file |
| GET | `/files/mine` | Patient views own files |
| POST | `/files/{id}/share` | Patient shares file with doctor |
| GET | `/files/shares` | Patient views all share permissions with status |
| POST | `/files/{id}/revoke` | Patient revokes access |
| GET | `/files/{id}/access` | Doctor accesses file (calls authorize()) |
| GET | `/doctor/appointment/{id}/detail` | Doctor appointment detail + patient profile fields |
| GET | `/doctor/shared-files/notifications` | Recent shared-file notifications for doctor |
| GET | `/doctor/shared-files/patient/{patient_id}` | Files shared by a specific patient with the doctor |
| GET | `/doctor/file/{permission_id}/view` | Secure inline PDF stream after authorize() |
| GET | `/admin/pending-doctors` | Admin views pending verifications |
| PUT | `/admin/doctors/{id}/approve` | Admin approves doctor |
| PUT | `/admin/doctors/{id}/reject` | Admin rejects doctor |
| GET | `/admin/reports` | Platform stats |

---

## Security Design

The file access system is built around a single invariant enforced in `authorize()`:

> A file can only be accessed if a valid, non-expired, non-revoked permission exists — and every access attempt is permanently logged.

- `authorize()` is the **only** place that checks file permissions
- Every access attempt writes to `audit_log` in the same transaction
- Revocation is immediate and permanent — cannot be undone
- Files are private by default — sharing requires explicit patient action
- Share expiry is tied to the patient's next upcoming appointment end time
- If appointment-linked expiry is passed, backend returns `403 Forbidden` immediately

---

## Recent Updates (Latest)

- Doctor Dashboard appointment cards now prominently show **Patient Full Name**
- Doctor Availability page now has a persistent **Current Schedule** section
- Saving availability now refreshes and shows updated slots immediately
- File share expiry is now **appointment-linked auto-revocation**
- Patient Medical Records now display shared access status with **time remaining**
- Doctor file viewing continues to be enforced by centralized `authorize()` checks

---

## Database

Hosted on [Neon](https://neon.tech) — cloud PostgreSQL, free tier.
No local database setup needed. Tables are already created.

**10 tables:**
`tenant` `user` `doctor_profile` `patient_profile` `availability`
`appointment` `medical_file` `file_permission` `audit_log` `review`

---

## File Storage

Files stored on [Cloudinary](https://cloudinary.com) — free tier (25GB).
Medical files go to `medshare/patients/{patient_id}/`
Doctor certificates go to `medshare/certificates/`

---

## Contributing

1. Clone the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Make changes
4. Commit: `git commit -m "describe what you did"`
5. Push: `git push origin feature/your-feature`
6. Open a Pull Request on GitHub

---

## What's Not Built Yet (Future Scope)

- GPS/location-based doctor search
- Real payment gateway (Razorpay/Stripe)
- Email/SMS appointment reminders
- Insurance filters
- Cancellation charges
- Mobile app
- File categories (lab reports, prescriptions, scans)
- Multi-admin support