export const PIXELS_PER_MINUTE = 1.5;

export function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  // Get Monday
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);

  return Array.from({ length: 6 }, (_, i) => {
    const dd = new Date(d);
    dd.setDate(d.getDate() + i);
    return dd;
  });
}

export function getDayDate(date: Date): Date[] {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return [d];
}

export function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(":").map(Number);
  return { hours: h, minutes: m ?? 0 };
}

export function timeToMinutes(timeStr: string): number {
  const { hours, minutes } = parseTime(timeStr);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getTopOffset(time: Date, startMinutes: number): number {
  const minutes = time.getHours() * 60 + time.getMinutes();
  return Math.max(0, (minutes - startMinutes) * PIXELS_PER_MINUTE);
}

export function getHeight(startTime: Date, endTime: Date): number {
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  return Math.max(20, duration * PIXELS_PER_MINUTE);
}

export function snapTo15Min(date: Date): Date {
  const d = new Date(date);
  const minutes = d.getMinutes();
  const snapped = Math.round(minutes / 15) * 15;
  d.setMinutes(snapped, 0, 0);
  return d;
}

export function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export const DAY_NAMES_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const DAY_NAMES_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export interface AgendaAppointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  googleEventId: string | null;
  patient: { id: string; firstName: string; lastName: string; phone: string };
  dentist: { id: string; name: string; color: string };
  chair: { id: string; name: string } | null;
  treatmentType: { id: string; name: string; color: string | null; durationMin: number } | null;
}

export interface AgendaDentist {
  id: string;
  name: string;
  color: string;
  specialty: string | null;
  birthdate?: string | null;
  email?: string | null;
  userId?: string | null;
  treatmentIds?: string[];
}

export interface WorkingHoursEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

// Compute calendar bounds from working hours (clinic-level)
export function getCalendarBounds(tenantHours: WorkingHoursEntry[]): {
  startHour: number;
  endHour: number;
} {
  if (tenantHours.length === 0) return { startHour: 8, endHour: 20 };

  const activeHours = tenantHours.filter((h) => h.isActive);
  if (activeHours.length === 0) return { startHour: 8, endHour: 20 };

  const startMinutes = Math.min(...activeHours.map((h) => timeToMinutes(h.startTime)));
  const endMinutes = Math.max(...activeHours.map((h) => timeToMinutes(h.endTime)));

  return {
    startHour: Math.floor(startMinutes / 60),
    endHour: Math.ceil(endMinutes / 60),
  };
}

// Is this day/dentist combination available per working hours?
export function isDentistAvailable(
  dayOfWeek: number, // 1=Mon..6=Sat
  dentistId: string,
  dentistHours: Array<WorkingHoursEntry & { dentistId: string }>,
  tenantHours: WorkingHoursEntry[]
): WorkingHoursEntry | null {
  // Check dentist-specific hours first
  const dentistDay = dentistHours.find(
    (h) => h.dentistId === dentistId && h.dayOfWeek === dayOfWeek && h.isActive
  );
  if (dentistDay) return dentistDay;

  // Fallback to tenant hours
  const tenantDay = tenantHours.find((h) => h.dayOfWeek === dayOfWeek && h.isActive);
  return tenantDay ?? null;
}
