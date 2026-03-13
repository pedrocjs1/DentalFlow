"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Search, UserPlus } from "lucide-react";

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pacientes</h2>
          <p className="text-sm text-gray-500 mt-0.5">{data.total} paciente{data.total !== 1 ? "s" : ""} en total</p>
        </div>
        <button
          onClick={() => {/* TODO: open create patient modal */}}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Nuevo paciente
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono, email..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        />
        {isPending && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {data.patients.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-400">
            {initialSearch
              ? `No se encontraron pacientes para "${initialSearch}"`
              : "No hay pacientes registrados aún."}
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Paciente</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Teléfono</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Edad</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Última visita</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tags</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.patients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/pacientes/${patient.id}`)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary-700">
                            {patient.firstName[0]}{patient.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {patient.firstName} {patient.lastName}
                          </p>
                          {patient.email && (
                            <p className="text-xs text-gray-400">{patient.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{patient.phone}</td>
                    <td className="px-4 py-3.5 text-gray-600">{getAge(patient.birthdate)}</td>
                    <td className="px-4 py-3.5 text-gray-600">{formatDate(patient.lastVisitAt)}</td>
                    <td className="px-4 py-3.5">
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
                        Ver ficha →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t flex items-center justify-between text-sm text-gray-600">
                <span>
                  Mostrando {(data.page - 1) * data.limit + 1}–
                  {Math.min(data.page * data.limit, data.total)} de {data.total}
                </span>
                <div className="flex gap-2">
                  {data.page > 1 && (
                    <button
                      onClick={() => {
                        const params = new URLSearchParams();
                        if (searchValue) params.set("search", searchValue);
                        params.set("page", String(data.page - 1));
                        router.push(`/pacientes?${params.toString()}`);
                      }}
                      className="px-3 py-1 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      ← Anterior
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
                      className="px-3 py-1 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      Siguiente →
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
