
export type AppointmentStep =
  | "service"
  | "branch"
  | "date"
  | "time"
  | "review"
  | "confirmation";

export interface AppointmentService {
  id: string;
  name: string;
  description: string;
  duration?: string;
}

export interface AppointmentBranch {
  id: string;
  name: string;
  address?: string;
  city?: string;
  province?: string;
  phone?: string;
  hours?: string;
  isOpen?: boolean;
}

export interface AppointmentBookingData {
  service: AppointmentService | null;
  branch: AppointmentBranch | null;
  date: string | null;
  time: string | null;
  appointmentId: string | null;
}

