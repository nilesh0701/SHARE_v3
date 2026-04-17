export interface User {
  user_id: string;
  email: string;
  role: "PATIENT" | "DOCTOR" | "ADMIN";
}

export interface Doctor {
  user_id: string;
  full_name: string;
  specialty: string;
  bio: string;
  consultation_fee: number;
  consultation_type: "VIDEO" | "IN_PERSON" | "BOTH";
  clinic_address?: string;
  gender?: string;
  verification_status: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  consultation_type: "VIDEO" | "IN_PERSON";
  meeting_link?: string;
  payment_status: "PENDING" | "PAID";
  payment_amount: number;
  notes?: string;
}

export interface MedicalFile {
  id: string;
  name: string;
  cloudinary_url: string;
  file_type: string;
  size_bytes: number;
  uploaded_at: string;
}