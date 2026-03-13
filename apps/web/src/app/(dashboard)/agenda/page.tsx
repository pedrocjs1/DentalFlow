import { cookies } from "next/headers";
import { apiServerFetch } from "@/lib/api";
import { AgendaClient } from "./agenda-client";
import type { WorkingHoursEntry } from "@/components/agenda/calendar-utils";

export default async function AgendaPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const [dentistsData, treatmentTypesData, workingHoursData] = await Promise.allSettled([
    apiServerFetch<{ dentists: any[] }>("/api/v1/agenda/dentists", cookieHeader),
    apiServerFetch<{ treatmentTypes: any[] }>("/api/v1/agenda/treatment-types", cookieHeader),
    apiServerFetch<{ tenantHours: WorkingHoursEntry[] }>("/api/v1/agenda/working-hours", cookieHeader),
  ]);

  const dentists = dentistsData.status === "fulfilled" ? dentistsData.value.dentists : [];
  const treatmentTypes = treatmentTypesData.status === "fulfilled" ? treatmentTypesData.value.treatmentTypes : [];
  const tenantHours = workingHoursData.status === "fulfilled" ? workingHoursData.value.tenantHours : [];

  return (
    <div className="h-full flex flex-col">
      <AgendaClient
        initialDentists={dentists}
        initialTreatmentTypes={treatmentTypes}
        initialTenantHours={tenantHours}
      />
    </div>
  );
}
