// ============================================================
// MÓDULO DE ADMINISTRACIÓN — API client con Supabase
// ============================================================

import { supabase } from './supabase';
import type {
  Employee,
  PermisoVacacion,
  PermisoStatus,
  PermisosType,
  Incidencia,
  IncidenciaType,
  MonthlyIncidenciaSummary,
} from '../types/admin';
import { format, parseISO, differenceInMinutes } from 'date-fns';

// ─── Helpers de mapeo DB → TS ─────────────────────────────────

function rowToEmployee(r: Record<string, unknown>): Employee {
  return {
    id:               r.id as string,
    fullName:         r.full_name as string,
    preferredName:    (r.preferred_name as string) ?? '',
    lastName:         (r.last_name as string) ?? '',
    position:         (r.position as string) ?? '',
    department:       (r.department as string) ?? '',
    scheduleLabel:    (r.schedule_label as string) ?? '',
    entryTime:        (r.entry_time as string) ?? '08:00',
    toleranceMinutes: (r.tolerance_minutes as number) ?? 10,
    hiredAt:          (r.hired_at as string) ?? '',
    vacationManager:  (r.vacation_manager as string) ?? '',
    status:           (r.status as Employee['status']) ?? 'active',
    userEmail:        (r.user_email as string) ?? '',
    vacationBalance:  (r.vacation_balance as number) ?? 0,
    createdAt:        (r.created_at as string) ?? '',
  };
}

function rowToPermiso(r: Record<string, unknown>): PermisoVacacion {
  return {
    id:           r.id as string,
    employeeId:   r.employee_id as string,
    type:         r.type as PermisosType,
    startDate:    r.start_date as string,
    endDate:      r.end_date as string,
    days:         r.days as number,
    hours:        r.hours as number | undefined,
    reason:       (r.reason as string) ?? '',
    status:       r.status as PermisoStatus,
    requestedAt:  r.requested_at as string,
    reviewedBy:   r.reviewed_by as string | undefined,
    reviewedAt:   r.reviewed_at as string | undefined,
    adminNotes:   r.admin_notes as string | undefined,
    documentUrl:  r.document_url as string | undefined,
  };
}

function rowToIncidencia(r: Record<string, unknown>): Incidencia {
  return {
    id:           r.id as string,
    employeeId:   r.employee_id as string,
    date:         r.date as string,
    type:         r.type as IncidenciaType,
    minutes:      r.minutes as number | undefined,
    discountDays: r.discount_days as number | undefined,
    notes:        r.notes as string | undefined,
    source:       (r.source as Incidencia['source']) ?? 'manual',
    permisoRef:   r.permiso_ref as string | undefined,
    period:       r.period as string,
    createdAt:    r.created_at as string,
    createdBy:    (r.created_by as string) ?? '',
  };
}

// ─── EMPLEADOS ───────────────────────────────────────────────

export async function getEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('full_name');
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToEmployee);
}

export async function addEmployee(
  employee: Omit<Employee, 'createdAt'>
): Promise<void> {
  const { error } = await supabase.from('employees').insert({
    id:                employee.id,
    full_name:         employee.fullName,
    preferred_name:    employee.preferredName,
    last_name:         employee.lastName,
    position:          employee.position,
    department:        employee.department,
    schedule_label:    employee.scheduleLabel,
    entry_time:        employee.entryTime,
    tolerance_minutes: employee.toleranceMinutes,
    hired_at:          employee.hiredAt || null,
    vacation_manager:  employee.vacationManager,
    status:            employee.status,
    user_email:        employee.userEmail,
    vacation_balance:  employee.vacationBalance,
  });
  if (error) throw new Error(error.message);
}

export async function updateEmployee(
  employeeId: string,
  fields: Partial<Employee>
): Promise<void> {
  const dbFields: Record<string, unknown> = {};
  if (fields.fullName        !== undefined) dbFields.full_name         = fields.fullName;
  if (fields.preferredName   !== undefined) dbFields.preferred_name    = fields.preferredName;
  if (fields.lastName        !== undefined) dbFields.last_name         = fields.lastName;
  if (fields.position        !== undefined) dbFields.position          = fields.position;
  if (fields.department      !== undefined) dbFields.department        = fields.department;
  if (fields.scheduleLabel   !== undefined) dbFields.schedule_label    = fields.scheduleLabel;
  if (fields.entryTime       !== undefined) dbFields.entry_time        = fields.entryTime;
  if (fields.toleranceMinutes !== undefined) dbFields.tolerance_minutes = fields.toleranceMinutes;
  if (fields.hiredAt         !== undefined) dbFields.hired_at          = fields.hiredAt || null;
  if (fields.vacationManager !== undefined) dbFields.vacation_manager  = fields.vacationManager;
  if (fields.status          !== undefined) dbFields.status            = fields.status;
  if (fields.userEmail       !== undefined) dbFields.user_email        = fields.userEmail;
  if (fields.vacationBalance !== undefined) dbFields.vacation_balance  = fields.vacationBalance;

  const { error } = await supabase
    .from('employees')
    .update(dbFields)
    .eq('id', employeeId);
  if (error) throw new Error(error.message);
}

// ─── PERMISOS Y VACACIONES ───────────────────────────────────

export async function requestPermiso(
  request: {
    employeeId: string;
    type: PermisosType;
    startDate: string;
    endDate: string;
    days: number;
    hours?: number;
    reason: string;
    documentUrl?: string;
  }
): Promise<void> {
  const { error } = await supabase.from('permisos_vacaciones').insert({
    employee_id:  request.employeeId,
    type:         request.type,
    start_date:   request.startDate,
    end_date:     request.endDate,
    days:         request.days,
    hours:        request.hours ?? null,
    reason:       request.reason,
    document_url: request.documentUrl ?? null,
    status:       'pending',
  });
  if (error) throw new Error(error.message);
}

/** Empleado: su propio registro */
export async function getMyEmployee(userEmail: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('user_email', userEmail)
    .single();
  if (error || !data) return null;
  return rowToEmployee(data as Record<string, unknown>);
}

/** Empleado: sus propias solicitudes */
export async function getMyPermisos(userEmail: string): Promise<PermisoVacacion[]> {
  // Buscar el employee_id vinculado a este email
  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('user_email', userEmail)
    .single();

  if (!emp) return [];

  const { data, error } = await supabase
    .from('permisos_vacaciones')
    .select('*')
    .eq('employee_id', emp.id)
    .order('requested_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToPermiso);
}

/** Admin: todas las solicitudes */
export async function getAllPermisos(
  filter?: { status?: PermisoStatus; employeeId?: string }
): Promise<PermisoVacacion[]> {
  let q = supabase
    .from('permisos_vacaciones')
    .select('*, employees(full_name)')
    .order('requested_at', { ascending: false });

  if (filter?.status)     q = q.eq('status', filter.status);
  if (filter?.employeeId) q = q.eq('employee_id', filter.employeeId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return (data ?? []).map(r => ({
    ...rowToPermiso(r as Record<string, unknown>),
    employeeName: (r as Record<string, unknown>)['employees']
      ? ((r as Record<string, unknown>)['employees'] as Record<string, unknown>)['full_name'] as string
      : undefined,
  }));
}

/** Admin: aprobar o rechazar */
export async function reviewPermiso(
  adminEmail: string,
  permisoId: string,
  decision: PermisoStatus,
  adminNotes?: string
): Promise<void> {
  const { error } = await supabase
    .from('permisos_vacaciones')
    .update({
      status:      decision,
      reviewed_by: adminEmail,
      reviewed_at: new Date().toISOString(),
      admin_notes: adminNotes ?? null,
    })
    .eq('id', permisoId);
  if (error) throw new Error(error.message);
}

export async function getVacationBalance(
  _userEmail: string,
  employeeId: string
): Promise<{ balance: number; used: number; total: number }> {
  const { data: emp } = await supabase
    .from('employees')
    .select('vacation_balance')
    .eq('id', employeeId)
    .single();

  const total = emp?.vacation_balance ?? 0;

  const { data: permisos } = await supabase
    .from('permisos_vacaciones')
    .select('days')
    .eq('employee_id', employeeId)
    .eq('type', 'vacaciones')
    .eq('status', 'approved');

  const used = (permisos ?? []).reduce((sum, p) => sum + (p.days as number), 0);

  return { total, used, balance: total - used };
}

// ─── INCIDENCIAS ─────────────────────────────────────────────

export async function getIncidencias(
  period: string,
  employeeId?: string
): Promise<Incidencia[]> {
  let q = supabase
    .from('incidencias')
    .select('*, employees(full_name)')
    .eq('period', period)
    .order('date');

  if (employeeId) q = q.eq('employee_id', employeeId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return (data ?? []).map(r => ({
    ...rowToIncidencia(r as Record<string, unknown>),
    employeeName: (r as Record<string, unknown>)['employees']
      ? ((r as Record<string, unknown>)['employees'] as Record<string, unknown>)['full_name'] as string
      : undefined,
  }));
}

export async function saveIncidencia(
  adminEmail: string,
  inc: Omit<Incidencia, 'id' | 'createdAt' | 'createdBy' | 'source'>
): Promise<void> {
  const { error } = await supabase.from('incidencias').insert({
    employee_id:  inc.employeeId,
    date:         inc.date,
    type:         inc.type,
    minutes:      inc.minutes ?? null,
    discount_days: inc.discountDays ?? null,
    notes:        inc.notes ?? null,
    source:       'manual',
    permiso_ref:  inc.permisoRef ?? null,
    period:       inc.period,
    created_by:   adminEmail,
  });
  if (error) throw new Error(error.message);
}

/**
 * Calcula incidencias del período 27-26 a partir de time_entries.
 * Se ejecuta en el frontend comparando entradas contra el schedule del empleado.
 */
export async function calculatePeriodIncidencias(
  adminEmail: string,
  period: string   // YYYY-MM
): Promise<{ created: number; updated: number }> {
  // Período ICIE: del día 27 del mes anterior al 26 del mes actual
  const [year, month] = period.split('-').map(Number);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;
  const periodStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-27`;
  const periodEnd   = `${year}-${String(month).padStart(2, '0')}-26`;

  // Obtener empleados activos
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('*')
    .eq('status', 'active');

  if (empErr) throw new Error(empErr.message);

  // Obtener todas las entradas del período
  const { data: timeEntries, error: teErr } = await supabase
    .from('time_entries')
    .select('user_id, date, clock_in, clock_out, status')
    .gte('date', periodStart)
    .lte('date', periodEnd);

  if (teErr) throw new Error(teErr.message);

  // Obtener permisos aprobados del período
  const { data: permisos } = await supabase
    .from('permisos_vacaciones')
    .select('employee_id, start_date, end_date, type')
    .eq('status', 'approved')
    .gte('start_date', periodStart)
    .lte('end_date', periodEnd);

  // Obtener perfiles para vincular user_id con employee
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email');

  const emailById = Object.fromEntries(
    (profiles ?? []).map(p => [p.id as string, p.email as string])
  );

  let created = 0;
  let updated = 0;

  // Calcular días laborables del período (L-V)
  const businessDays: string[] = [];
  const d = new Date(periodStart + 'T12:00:00');
  const endD = new Date(periodEnd + 'T12:00:00');
  while (d <= endD) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      businessDays.push(format(d, 'yyyy-MM-dd'));
    }
    d.setDate(d.getDate() + 1);
  }

  // Eliminar incidencias auto anteriores del período para recalcular
  await supabase
    .from('incidencias')
    .delete()
    .eq('period', period)
    .eq('source', 'auto');

  for (const emp of employees ?? []) {
    const empEmail    = emp.user_email as string;
    const empId       = emp.id as string;
    const entryTime   = (emp.entry_time as string) ?? '08:00';
    const tolerance   = (emp.tolerance_minutes as number) ?? 10;

    // Entradas del empleado en el período
    const empEntries = (timeEntries ?? []).filter(te => {
      const email = emailById[te.user_id as string];
      return email === empEmail;
    });

    // checkedDays unused — kept for future reference
    // const checkedDays = new Set(empEntries.map(te => te.date as string));

    // Permisos del empleado
    const empPermisos = (permisos ?? []).filter(p => p.employee_id === empId);
    const permisoDays = new Set<string>();
    for (const p of empPermisos) {
      const s = new Date((p.start_date as string) + 'T12:00:00');
      const e = new Date((p.end_date as string) + 'T12:00:00');
      const cur = new Date(s);
      while (cur <= e) {
        const dow = cur.getDay();
        if (dow !== 0 && dow !== 6) {
          permisoDays.add(format(cur, 'yyyy-MM-dd'));
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    const toInsert: Record<string, unknown>[] = [];
    let retardoCount = 0;

    for (const day of businessDays) {
      if (permisoDays.has(day)) continue;  // Día con permiso aprobado

      const entry = empEntries.find(te => te.date === day);

      if (!entry) {
        // Ausencia Sin Justificación
        toInsert.push({
          employee_id:  empId,
          date:         day,
          type:         'ausencia_sj',
          discount_days: 1,
          source:       'auto',
          period,
          created_by:   adminEmail,
        });
      } else {
        // Verificar retardo
        const maxEntry = new Date(`${day}T${entryTime}:00`);
        maxEntry.setMinutes(maxEntry.getMinutes() + tolerance);

        const actualIn = parseISO(entry.clock_in as string);
        const lateMin  = differenceInMinutes(actualIn, maxEntry);

        if (lateMin > 0) {
          retardoCount++;
          toInsert.push({
            employee_id:  empId,
            date:         day,
            type:         'retardo',
            minutes:      lateMin,
            discount_days: lateMin > 30 ? 0.5 : 0,  // Más de 30 min → medio día
            source:       'auto',
            period,
            created_by:   adminEmail,
          });
        }

        // No checada (entró pero no registró salida)
        if (!entry.clock_out && entry.status === 'active') {
          toInsert.push({
            employee_id:  empId,
            date:         day,
            type:         'no_checada',
            source:       'auto',
            period,
            created_by:   adminEmail,
          });
        }
      }
    }

    // Bono de puntualidad (cero retardos en el período)
    if (retardoCount === 0 && businessDays.length > 0) {
      toInsert.push({
        employee_id: empId,
        date:        periodEnd,
        type:        'bono_puntualidad',
        source:      'auto',
        period,
        created_by:  adminEmail,
      });
    }

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase
        .from('incidencias')
        .insert(toInsert);
      if (!insErr) created += toInsert.length;
    }
  }

  return { created, updated };
}

/** Resumen mensual para el reporte de incidencias */
export async function getMonthlyReport(
  period: string
): Promise<MonthlyIncidenciaSummary[]> {
  const { data: incs, error } = await supabase
    .from('incidencias')
    .select('*, employees(full_name, position, department)')
    .eq('period', period);

  if (error) throw new Error(error.message);

  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, position, department')
    .eq('status', 'active');

  const summaryMap: Record<string, MonthlyIncidenciaSummary> = {};

  for (const emp of employees ?? []) {
    const empId = emp.id as string;
    summaryMap[empId] = {
      employeeId:        empId,
      employeeName:      emp.full_name as string,
      position:          (emp.position as string) ?? '',
      department:        (emp.department as string) ?? '',
      ausenciasPSGS:     0,
      incapacidades:     0,
      vacaciones:        0,
      retardos:          0,
      retardoMinutos:    0,
      ausenciasSJ:       0,
      noChecadas:        0,
      permisosDias:      0,
      descuentoRetardos: 0,
      descuentoAusencias: 0,
      bonoPuntualidad:   false,
    };
  }

  // Agregar incidencias por empleado
  for (const inc of incs ?? []) {
    const empId = inc.employee_id as string;
    if (!summaryMap[empId]) continue;
    const s = summaryMap[empId];

    switch (inc.type as IncidenciaType) {
      case 'retardo':
        s.retardos++;
        s.retardoMinutos    += (inc.minutes as number) ?? 0;
        s.descuentoRetardos += (inc.discount_days as number) ?? 0;
        break;
      case 'ausencia_sj':
        s.ausenciasSJ++;
        s.descuentoAusencias += (inc.discount_days as number) ?? 1;
        break;
      case 'no_checada':
        s.noChecadas++;
        break;
      case 'incapacidad':
        s.incapacidades++;
        break;
      case 'bono_puntualidad':
        s.bonoPuntualidad = true;
        break;
    }
  }

  // Agregar permisos aprobados
  const [year, month] = period.split('-').map(Number);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;
  const periodStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-27`;
  const periodEnd   = `${year}-${String(month).padStart(2, '0')}-26`;

  const { data: permisos } = await supabase
    .from('permisos_vacaciones')
    .select('employee_id, type, days')
    .eq('status', 'approved')
    .gte('start_date', periodStart)
    .lte('end_date', periodEnd);

  for (const p of permisos ?? []) {
    const empId = p.employee_id as string;
    if (!summaryMap[empId]) continue;
    const s = summaryMap[empId];
    switch (p.type as PermisosType) {
      case 'permiso_pgss':    s.ausenciasPSGS += (p.days as number); break;
      case 'incapacidad':     s.incapacidades += (p.days as number); break;
      case 'permiso_horas':
      case 'permiso_sin_goce': s.permisosDias += (p.days as number); break;
    }
  }

  return Object.values(summaryMap).sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName)
  );
}

// ─── PRESENCIA ───────────────────────────────────────────────

export interface EmployeePresence {
  userEmail:    string;
  fullName:     string;
  preferredName: string;
  position:     string;
  department:   string;
  /** 'working'  = fichado hoy sin clock_out
   *  'done'     = completó jornada hoy (tiene clock_out)
   *  'online'   = last_seen < 5 min pero sin entrada hoy
   *  'inactive' = sin actividad hoy */
  status:       'working' | 'done' | 'online' | 'inactive';
  clockIn?:     string;   // ISO timestamp si está trabajando
  clockOut?:    string;   // ISO timestamp si ya terminó
  lastSeenAt?:  string;   // ISO timestamp de último acceso
  avatarUrl?:   string;   // foto de perfil de Google
}

export async function getPresenceData(): Promise<EmployeePresence[]> {
  const today = format(new Date(), 'yyyy-MM-dd');

  // Entradas de hoy (activas y completadas)
  const { data: entries } = await supabase
    .from('time_entries')
    .select('user_id, clock_in, clock_out, status')
    .eq('date', today);

  // Perfiles con last_seen_at y avatar
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, last_seen_at, avatar_url');

  // Empleados activos
  const { data: employees } = await supabase
    .from('employees')
    .select('user_email, full_name, preferred_name, position, department')
    .eq('status', 'active');

  if (!employees) return [];

  const now = new Date();
  const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos

  // Índice: userId → entry de hoy
  const entryByUserId = Object.fromEntries(
    (entries ?? []).map(e => [e.user_id as string, e])
  );

  // Índice: email → profile
  const profileByEmail = Object.fromEntries(
    (profiles ?? []).map(p => [p.email as string, p])
  );

  return employees.map(emp => {
    const email   = emp.user_email as string;
    const profile = profileByEmail[email];
    const entry   = profile ? entryByUserId[profile.id as string] : undefined;
    const lastSeen = profile?.last_seen_at
      ? new Date(profile.last_seen_at as string)
      : null;
    const isOnline = lastSeen
      ? now.getTime() - lastSeen.getTime() < ONLINE_THRESHOLD_MS
      : false;

    let status: EmployeePresence['status'];
    if (entry && !entry.clock_out) {
      status = 'working';
    } else if (entry && entry.clock_out) {
      status = 'done';
    } else if (isOnline) {
      status = 'online';
    } else {
      status = 'inactive';
    }

    return {
      userEmail:     email,
      fullName:      emp.full_name as string,
      preferredName: (emp.preferred_name as string) ?? '',
      position:      (emp.position as string) ?? '',
      department:    (emp.department as string) ?? '',
      status,
      clockIn:    entry?.clock_in  as string | undefined,
      clockOut:   entry?.clock_out as string | undefined,
      lastSeenAt: profile?.last_seen_at as string | undefined,
      avatarUrl:  profile?.avatar_url as string | undefined,
    };
  });
}
