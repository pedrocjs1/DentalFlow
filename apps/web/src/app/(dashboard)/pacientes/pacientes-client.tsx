"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Search, UserPlus, Users, ChevronLeft, ChevronRight } from "lucide-react";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  birthdate: string | null;
  tags: string[];
  lastVisitAt: string | null;
  createdAt: string;
}

interface Props {
  data: { patients: Patient[]; total: number; page: number; limit: number };
  search: string;
}

function getAge(birthdate: string | null): string {
  if (!birthdate) return "—";
  const age = Math.floor((Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return `${age} años`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export function PacientesClient({ data, search: initialSearch }: Props) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();

  function handleSearch(value: string) {
    setSearchValue(value);
    startTransition(() => {
      const params = new URLSearchParams();
      if (value) params.set("search", value);
      router.push(`/pacientes?${params.toString()}`);
    });
  }

  const totalPages = Math.ceil(data.total / data.limit);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pacientes</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {data.total} paciente{data.total !== 1 ? "s" : ""} en total
          </p>
        </div>
        <button
          onClick={() => {/* TODO: open create patient modal */}}
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <UserPlus className="h-4 w-4" />
          Nuevo paciente
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono, email..."
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white transition-all duration-200"
        />
        {isPending && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
        {data.patients.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary-400" />
            </div>
            {initialSearch ? (
              <>
                <p className="text-sm font-medium text-gray-600">Sin resultados</p>
                <p className="text-xs text-gray-400 mt-1">
                  No se encontraron pacientes para &ldquo;{initialSearch}&rdquo;
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-gray-700">
                  Agregá tu primer paciente
                </p>
                <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
                  Empezá a construir tu base de pacientes para gestionar citas, tratamientos y comunicaciones
                </p>
                <button
                  onClick={() => {/* TODO: open create patient modal */}}
                  className="mt-4 inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-all duration-200"
                >
                  <UserPlus className="h-4 w-4" />
                  Agregar paciente
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Teléfono</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Edad</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Última visita</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Tags</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.patients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                    onClick={() => router.push(`/pacientes/${patient.id}`)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary-700">
                            {patient.firstName?.[0] ?? ""}{patient.lastName?.[0] ?? ""}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {patient.firstName}{patient.lastName ? ` ${patient.lastName}` : ""}
                          </p>
                          {patient.email && (
                            <p className="text-xs text-gray-400">{patient.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 hidden md:table-cell">{patient.phone}</td>
                    <td className="px-4 py-3.5 text-gray-600 hidden lg:table-cell">{getAge(patient.birthdate)}</td>
                    <td className="px-4 py-3.5 text-gray-600 hidden lg:table-cell">{formatDate(patient.lastVisitAt)}</td>
                    <td className="px-4 py-3.5 hidden xl:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {patient.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {patient.tags.length > 3 && (
                          <span className="text-xs text-gray-400">+{patient.tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/pacientes/${patient.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Ver ficha
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
                <span className="text-xs text-gray-400">
                  Mostrando {(data.page - 1) * data.limit + 1}–
                  {Math.min(data.page * data.limit, data.total)} de {data.total}
                </span>
                <div className="flex gap-1.5">
                  {data.page > 1 && (
                    <button
                      onClick={() => {
                        const params = new URLSearchParams();
                        if (searchValue) params.set("search", searchValue);
                        params.set("page", String(data.page - 1));
                        router.push(`/pacientes?${params.toString()}`);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-xs"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      Anterior
                    </button>
                  )}
                  {data.page < totalPages && (
                    <button
                      onClick={() => {
                        const params = new URLSearchParams();
                        if (searchValue) params.set("search", searchValue);
                        params.set("page", String(data.page + 1));
                        router.push(`/pacientes?${params.toString()}`);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-xs"
                    >
                      Siguiente
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
