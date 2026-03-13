import { cookies } from "next/headers";
import { apiServerFetch } from "@/lib/api";
import { PacientesClient } from "./pacientes-client";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  birthdate: string | null;
  tags: string[];
  lastVisitAt: string | null;
  nextVisitDue: string | null;
  createdAt: string;
}

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const params = await searchParams;

  const search = params.search ?? "";
  const page = params.page ?? "1";

  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  qs.set("page", page);
  qs.set("limit", "20");

  let data: { patients: Patient[]; total: number; page: number; limit: number } = {
    patients: [],
    total: 0,
    page: 1,
    limit: 20,
  };

  try {
    data = await apiServerFetch<typeof data>(
      `/api/v1/patients?${qs.toString()}`,
      cookieHeader
    );
  } catch {}

  return <PacientesClient data={data} search={search} />;
}
