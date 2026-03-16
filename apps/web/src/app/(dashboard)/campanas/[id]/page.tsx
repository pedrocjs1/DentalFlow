import { CampanaDetailClient } from "./campana-detail-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CampanaDetailPage({ params }: Props) {
  const { id } = await params;
  return <CampanaDetailClient id={id} />;
}
