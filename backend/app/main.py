from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, doctors, appointments, files, admin
from app.api import doctor_extras   # naya import
 # include

app = FastAPI(title="SHARE", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(doctors.router)
app.include_router(appointments.router)
app.include_router(files.router)
app.include_router(admin.router)
app.include_router(doctor_extras.router)  

@app.get("/health")
def health():
    return {"status": "ok", "service": "SHARE API"}