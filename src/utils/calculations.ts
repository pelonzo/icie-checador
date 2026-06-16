import { differenceInMinutes } from 'date-fns';

export interface Pause {
  id?: string;
  timeEntryId?: string;
  startTime: string | Date;
  endTime: string | Date | null;
  type: 'meal' | 'break' | 'other';
  duration?: number; // en minutos
}

export interface TimeEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  clockIn: string | Date;
  clockOut: string | Date | null;
  totalHours: number | null;
  status: 'active' | 'paused' | 'completed';
  editedManually: boolean;
  pauses?: Pause[];
}

export function calculateWorkedHours(entry: {
  clockIn: string | Date;
  clockOut: string | Date | null;
  pauses?: { startTime: string | Date; endTime: string | Date | null }[];
}): number {
  if (!entry.clockOut) return 0;
  
  // Convertir a objetos Date
  const start = new Date(entry.clockIn);
  const end = new Date(entry.clockOut);
  
  // 1. Calcular el tiempo bruto transcurrido en minutos
  const totalGrossMinutes = differenceInMinutes(end, start);
  
  // 2. Sumar el tiempo total consumido por todas las pausas finalizadas
  const totalPauseMinutes = (entry.pauses || []).reduce((sum, pause) => {
    if (pause.endTime) {
      return sum + differenceInMinutes(new Date(pause.endTime), new Date(pause.startTime));
    }
    return sum;
  }, 0);
  
  // 3. Restar pausas del tiempo bruto y convertir a formato decimal de horas
  const netMinutes = totalGrossMinutes - totalPauseMinutes;
  const hoursDecimal = netMinutes / 60;
  
  // Retornar redondeado a dos posiciones decimales (ej. 7.75 horas)
  return Math.round((hoursDecimal + Number.EPSILON) * 100) / 100;
}

/**
 * Transforma horas decimales a un formato legible de horas y minutos.
 * Ejemplo: 8.5 → "8h 30m", 0 → "0h", 26.25 → "26h 15m"
 */
export function formatHoursMinutes(decimalHours: number | null | undefined): string {
  if (decimalHours === null || decimalHours === undefined || Number.isNaN(Number(decimalHours)) || decimalHours === 0) {
    return '0h';
  }

  const totalMinutes = Math.round(Math.abs(decimalHours) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
