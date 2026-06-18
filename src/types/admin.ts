// ============================================================
// MÓDULO DE ADMINISTRACIÓN — Tipos TypeScript
// Sistema de Control Horario ICIE
// ============================================================

export type EmployeeStatus = 'active' | 'inactive';

export interface Employee {
  id: string;               // DEPT-NNNN (ej. ACAD-0007)
  fullName: string;
  preferredName: string;
  lastName: string;
  position: string;
  department: string;
  scheduleLabel: string;    // "L a V 08:00-17:00"
  entryTime: string;        // HH:MM
  toleranceMinutes: number;
  hiredAt: string;          // YYYY-MM-DD
  vacationManager: string;  // email del gestor
  status: EmployeeStatus;
  userEmail: string;        // email de Google / Supabase
  vacationBalance: number;  // días disponibles
  createdAt: string;
}

export type PermisosType =
  | 'vacaciones'
  | 'permiso_pgss'       // Con Goce de Sueldo
  | 'permiso_sin_goce'
  | 'incapacidad'
  | 'permiso_horas';     // Por horas

export type PermisoStatus = 'pending' | 'approved' | 'rejected';

export interface PermisoVacacion {
  id: string;
  employeeId: string;
  employeeName?: string;
  type: PermisosType;
  startDate: string;      // YYYY-MM-DD
  endDate: string;        // YYYY-MM-DD
  days: number;
  hours?: number;
  reason: string;
  status: PermisoStatus;
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  adminNotes?: string;
  documentUrl?: string;
}

export type IncidenciaType =
  | 'retardo'
  | 'ausencia_sj'
  | 'no_checada'
  | 'incapacidad'
  | 'bono_puntualidad';

export type IncidenciaSource = 'auto' | 'manual';

export interface Incidencia {
  id: string;
  employeeId: string;
  employeeName?: string;
  date: string;           // YYYY-MM-DD
  type: IncidenciaType;
  minutes?: number;
  discountDays?: number;
  notes?: string;
  source: IncidenciaSource;
  permisoRef?: string;
  period: string;         // YYYY-MM
  createdAt: string;
  createdBy: string;
}

export interface MonthlyIncidenciaSummary {
  employeeId: string;
  employeeName: string;
  position: string;
  department: string;
  ausenciasPSGS: number;
  incapacidades: number;
  vacaciones: number;
  retardos: number;
  retardoMinutos: number;
  ausenciasSJ: number;
  noChecadas: number;
  permisosDias: number;
  permisoMinutos: number;    // minutos de permiso_horas aprobados
  reposicionMinutos: number; // siempre 0 (no implementado aún)
  descuentoRetardos: number;
  descuentoAusencias: number;
  bonoPuntualidad: boolean;
  bonoAsistencia: boolean;   // true si ausenciasSJ === 0
}

// ─── Etiquetas legibles ──────────────────────────────────────

export const PERMISO_LABELS: Record<PermisosType, string> = {
  vacaciones:       'Vacaciones',
  permiso_pgss:     'Permiso con Goce (PSGS)',
  permiso_sin_goce: 'Permiso Sin Goce',
  incapacidad:      'Incapacidad Médica',
  permiso_horas:    'Permiso por Horas',
};

export const INCIDENCIA_LABELS: Record<IncidenciaType, string> = {
  retardo:          'Retardo',
  ausencia_sj:      'Ausencia Sin Justif.',
  no_checada:       'No Checada',
  incapacidad:      'Incapacidad',
  bono_puntualidad: 'Bono Puntualidad',
};

export const PERMISO_STATUS_LABELS: Record<PermisoStatus, string> = {
  pending:  'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};
