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
  let fetchError: string | null = null;

  try {
    data = await apiServerFetch<DashboardStats>(
      "/api/v1/dashboard/stats",
      cookieHeader
    );
  } catch (e) {
    fetchError = e instanceof Error ? e.message : "Error al cargar datos";
  }

  if (fetchError || !data) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>Error al cargar el dashboard: {fetchError}</p>
      </div>
    );
  }

  return <DashboardClient data={data} />;
}
