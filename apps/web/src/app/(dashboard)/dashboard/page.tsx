import { cookies } from "next/headers";
import { apiServerFetch } from "@/lib/api";
import { DashboardClient } from "./dashboard-client";

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  source: string;
  patient: { firstName: string; lastName: string; phone?: string };
  dentist: { name: string; color: string };
  treatmentType: { name: string } | null;
}

interface DashboardStats {
  stats: {
    appointmentsToday: number;
    newPatientsThisMonth: number;
    totalPatients: number;
    openConversations: number;
    activeCampaigns: number;
  };
  appointmentsTodayList: Appointment[];
  upcomingAppointments: Appointment[];
  tenant: { name: string; plan: string; subscriptionStatus: string };
  user: { name: string; email: string; role: string };
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  let data: DashboardStats | null = null;

  try {
    data = await apiServerFetch<DashboardStats>(
      "/api/v1/dashboard/stats",
      cookieHeader
    );
  } catch {
    // Will render fallback UI
  }

  return <DashboardClient data={data} />;
}
