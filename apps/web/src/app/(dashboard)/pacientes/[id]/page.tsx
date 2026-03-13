import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { apiServerFetch } from "@/lib/api";
import { PatientDetailClient } from "./patient-detail-client";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  let patient: any;
  try {
    patient = await apiServerFetch(`/api/v1/patients/${id}`, cookieHeader);
  } catch {
    notFound();
  }

  // Parallel fetch all clinical data
  const [medicalHistory, odontogramData, treatmentPlanData, visitNotesData, periodontogramData] =
    await Promise.allSettled([
      apiServerFetch(`/api/v1/patients/${id}/medical-history`, cookieHeader),
      apiServerFetch(`/api/v1/patients/${id}/odontogram`, cookieHeader),
      apiServerFetch(`/api/v1/patients/${id}/treatment-plan`, cookieHeader),
      apiServerFetch(`/api/v1/patients/${id}/visit-notes`, cookieHeader),
      apiServerFetch(`/api/v1/patients/${id}/periodontogram`, cookieHeader),
    ]);

  return (
    <PatientDetailClient
      patient={patient}
      medicalHistory={medicalHistory.status === "fulfilled" ? medicalHistory.value : null}
      odontogramFindings={(odontogramData.status === "fulfilled" ? (odontogramData.value as any).findings : null) ?? []}
      treatmentPlan={(treatmentPlanData.status === "fulfilled" ? (treatmentPlanData.value as any).plan : null) ?? null}
      visitNotes={(visitNotesData.status === "fulfilled" ? (visitNotesData.value as any).notes : null) ?? []}
      visitNotesTotal={(visitNotesData.status === "fulfilled" ? (visitNotesData.value as any).total : null) ?? 0}
      periodontogramLatest={(periodontogramData.status === "fulfilled" ? (periodontogramData.value as any).latest : null) ?? null}
      periodontogramHistory={(periodontogramData.status === "fulfilled" ? (periodontogramData.value as any).history : null) ?? []}
    />
  );
}
