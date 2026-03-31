import dynamic from "next/dynamic";

const EstadisticasClient = dynamic(
  () => import("./estadisticas-client").then((m) => m.EstadisticasClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Cargando estadísticas...
      </div>
    ),
  }
);

export default function EstadisticasPage() {
  return <EstadisticasClient />;
}
