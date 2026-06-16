import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  CalendarOff,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  RefreshCw,
  BarChart2,
  Wifi,
  WifiOff,
  LogIn,
} from 'lucide-react';
import { getAllPermisos, getMonthlyReport, getPresenceData } from '../../lib/adminApi';
import type { PermisoVacacion, MonthlyIncidenciaSummary } from '../../types/admin';
import type { EmployeePresence } from '../../lib/adminApi';
import { PERMISO_LABELS } from '../../types/admin';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type AdminView = 'dashboard' | 'employees' | 'permisos' | 'incidencias';

interface AdminPanelProps {
  adminEmail: string;
  onNavigate?: (view: AdminView) => void;
}

function currentPeriod(): string {
  const now = new Date();
  const day = now.getDate();
  const year = now.getFullYear();
  const month = day >= 27 ? now.getMonth() + 1 : now.getMonth();
  const realMonth = month === 0 ? 12 : month;
  const realYear  = month === 0 ? year - 1 : year;
  return `${realYear}-${String(realMonth).padStart(2, '0')}`;
}

// ─── Helpers de presencia ─────────────────────────────────────

const PRESENCE_CONFIG = {
  working: {
    dot:   'bg-green-500',
    ring:  'ring-green-200',
    label: 'Trabajando',
    text:  'text-green-700',
    bg:    'bg-green-50',
    Icon:  LogIn,
  },
  done: {
    dot:   'bg-blue-400',
    ring:  'ring-blue-100',
    label: 'Jornada completa',
    text:  'text-blue-600',
    bg:    'bg-blue-50',
    Icon:  CheckCircle,
  },
  online: {
    dot:   'bg-yellow-400',
    ring:  'ring-yellow-100',
    label: 'En línea',
    text:  'text-yellow-700',
    bg:    'bg-yellow-50',
    Icon:  Wifi,
  },
  inactive: {
    dot:   'bg-gray-300',
    ring:  'ring-gray-100',
    label: 'Sin actividad hoy',
    text:  'text-text-muted',
    bg:    'bg-[#e9e5db]/40',
    Icon:  WifiOff,
  },
} as const;

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

function PresenceCard({ emp }: { emp: EmployeePresence }) {
  const cfg = PRESENCE_CONFIG[emp.status];

  const subLabel = (() => {
    if (emp.status === 'working' && emp.clockIn) {
      const since = formatDistanceToNow(parseISO(emp.clockIn), { locale: es, addSuffix: false });
      return `Desde hace ${since}`;
    }
    if (emp.status === 'done' && emp.clockOut) {
      return `Salió ${formatDistanceToNow(parseISO(emp.clockOut), { locale: es, addSuffix: true })}`;
    }
    if (emp.lastSeenAt) {
      return `Visto ${formatDistanceToNow(parseISO(emp.lastSeenAt), { locale: es, addSuffix: true })}`;
    }
    return 'Sin sesión iniciada';
  })();

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/50 transition-colors">
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-full bg-[#0F2B3C]/10 flex items-center justify-center">
          <span className="text-xs font-extrabold text-[#0F2B3C]">
            {getInitials(emp.preferredName || emp.fullName)}
          </span>
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${cfg.dot} ring-2 ${cfg.ring}`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text-dark truncate">
          {emp.preferredName || emp.fullName.split(' ')[0]}
        </p>
        <p className="text-[10px] text-text-muted truncate leading-tight">{subLabel}</p>
      </div>
      <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.text} ${cfg.bg}`}>
        <cfg.Icon className="w-2.5 h-2.5" />
        {cfg.label}
      </span>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────

export function AdminPanel({ adminEmail: _adminEmail, onNavigate }: AdminPanelProps) {
  const [pendingPermisos, setPendingPermisos] = useState<PermisoVacacion[]>([]);
  const [monthlyReport, setMonthlyReport]     = useState<MonthlyIncidenciaSummary[]>([]);
  const [presence, setPresence]               = useState<EmployeePresence[]>([]);
  const [presenceLoading, setPresenceLoading] = useState(true);
  const [lastRefresh, setLastRefresh]         = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const period = currentPeriod();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [permisos, report] = await Promise.all([
          getAllPermisos({ status: 'pending' }),
          getMonthlyReport(period),
        ]);
        setPendingPermisos(permisos);
        setMonthlyReport(report);
      } catch (err) {
        console.error('Error cargando panel admin:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

  const loadPresence = useCallback(async () => {
    setPresenceLoading(true);
    try {
      const data = await getPresenceData();
      const order = { working: 0, online: 1, done: 2, inactive: 3 };
      data.sort((a, b) => order[a.status] - order[b.status]);
      setPresence(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error cargando presencia:', err);
    } finally {
      setPresenceLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPresence();
    const interval = setInterval(loadPresence, 30 * 1000);
    return () => clearInterval(interval);
  }, [loadPresence]);

  const totalRetardos   = monthlyReport.reduce((s, e) => s + e.retardos, 0);
  const totalAusencias  = monthlyReport.reduce((s, e) => s + e.ausenciasSJ, 0);
  const employeesBonus  = monthlyReport.filter((e) => e.bonoPuntualidad).length;

  const workingCount = presence.filter(e => e.status === 'working').length;
  const onlineCount  = presence.filter(e => e.status === 'working' || e.status === 'online').length;

  const periodLabel = (() => {
    const [y, m] = period.split('-').map(Number);
    const startM = m === 1 ? 12 : m - 1;
    const startY = m === 1 ? y - 1 : y;
    const start  = new Date(startY, startM - 1, 27);
    const end    = new Date(y, m - 1, 26);
    return `${format(start, "dd 'de' MMMM", { locale: es })} — ${format(end, "dd 'de' MMMM yyyy", { locale: es })}`;
  })();

  const navCards = [
    {
      view: 'employees' as AdminView,
      icon: Users,
      label: 'Colaboradores',
      desc: 'Alta, baja y edición de empleados',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      view: 'permisos' as AdminView,
      icon: CalendarOff,
      label: 'Permisos y Vacaciones',
      desc: 'Solicitudes pendientes y aprobaciones',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      badge: pendingPermisos.length,
    },
    {
      view: 'incidencias' as AdminView,
      icon: AlertTriangle,
      label: 'Incidencias',
      desc: 'Retardos, ausencias y reporte mensual',
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col gap-6 w-full animate-fadeIn">
        <h1 className="text-3xl font-extrabold text-text-dark tracking-tight">Panel de Administración</h1>
        <div className="flex items-center gap-3 text-text-muted text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Cargando datos del período...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7 w-full animate-fadeIn">

      <div>
        <h1 className="text-3xl font-extrabold text-text-dark tracking-tight mb-1">
          Panel de Administración
        </h1>
        <p className="text-sm text-text-muted">
          Período activo: <span className="font-semibold text-text-dark">{periodLabel}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Solicitudes Pendientes', value: pendingPermisos.length, icon: Clock,         color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Retardos en Período',    value: totalRetardos,          icon: AlertTriangle, color: 'text-red-500',   bg: 'bg-red-50'   },
          { label: 'Ausencias SJ',           value: totalAusencias,         icon: XCircle,       color: 'text-red-700',   bg: 'bg-red-50'   },
          { label: 'Con Bono Puntualidad',   value: employeesBonus,         icon: CheckCircle,   color: 'text-green-600', bg: 'bg-green-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="glass-panel p-5 rounded-[1.75rem] border border-card-border shadow-premium flex flex-col gap-3">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-text-dark">{value}</p>
              <p className="text-xs text-text-muted mt-0.5 leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {navCards.map(({ view, icon: Icon, label, desc, color, bg, badge }) => (
          <button
            key={view}
            onClick={() => onNavigate?.(view)}
            className="glass-panel p-6 rounded-[1.75rem] border border-card-border shadow-premium text-left hover:bg-white/60 active:scale-[0.98] transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-11 h-11 rounded-2xl ${bg} flex items-center justify-center relative`}>
                <Icon className={`w-5 h-5 ${color}`} />
                {!!badge && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-base font-bold text-text-dark">{label}</p>
            <p className="text-xs text-text-muted mt-1">{desc}</p>
          </button>
        ))}
      </div>

      {/* ── PRESENCIA HOY ────────────────────────────────────── */}
      <div className="glass-panel rounded-[1.75rem] border border-card-border shadow-premium overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
          <div className="flex items-center gap-2.5">
            <Wifi className="w-4 h-4 text-green-500" />
            <h2 className="text-sm font-bold text-text-dark">Presencia de Hoy</h2>
            <div className="flex items-center gap-1.5 ml-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-green-700 bg-green-50">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                {workingCount} trabajando
              </span>
              {onlineCount > workingCount && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-yellow-700 bg-yellow-50">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
                  {onlineCount - workingCount} en línea
                </span>
              )}
            </div>
          </div>
          <button
            onClick={loadPresence}
            disabled={presenceLoading}
            className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text-dark transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${presenceLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {presenceLoading
                ? 'Actualizando…'
                : `Hace ${formatDistanceToNow(lastRefresh, { locale: es })}`
              }
            </span>
          </button>
        </div>

        {presenceLoading && presence.length === 0 ? (
          <div className="flex items-center gap-3 text-text-muted text-xs px-6 py-5">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Cargando presencia…
          </div>
        ) : presence.length === 0 ? (
          <p className="text-xs text-text-muted px-6 py-5">Sin datos de empleados.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 divide-card-border">
            <div className="px-4 py-3 space-y-0.5 md:border-r border-card-border">
              {presence
                .filter((_, i) => i % 2 === 0)
                .map(emp => <PresenceCard key={emp.userEmail} emp={emp} />)}
            </div>
            <div className="px-4 py-3 space-y-0.5">
              {presence
                .filter((_, i) => i % 2 === 1)
                .map(emp => <PresenceCard key={emp.userEmail} emp={emp} />)}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-t border-card-border bg-[#e9e5db]/20">
          {[
            { dot: 'bg-green-500',  label: 'Trabajando (fichado)' },
            { dot: 'bg-yellow-400', label: 'En línea (< 5 min)' },
            { dot: 'bg-blue-400',   label: 'Jornada completa' },
            { dot: 'bg-gray-300',   label: 'Sin actividad' },
          ].map(({ dot, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-[10px] text-text-muted">
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              {label}
            </span>
          ))}
          <span className="ml-auto text-[10px] text-text-muted">Auto-actualiza cada 30 s</span>
        </div>
      </div>

      {pendingPermisos.length > 0 && (
        <div className="glass-panel rounded-[1.75rem] border border-card-border shadow-premium overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
            <h2 className="text-sm font-bold text-text-dark flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Solicitudes Pendientes de Aprobación
            </h2>
            <button
              onClick={() => onNavigate?.('permisos')}
              className="text-xs font-bold text-text-muted hover:text-text-dark transition-colors"
            >
              Ver todas →
            </button>
          </div>
          <div className="divide-y divide-card-border">
            {pendingPermisos.slice(0, 5).map((p) => (
              <div key={p.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-white/40 transition-colors">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-text-dark">
                    {p.employeeName ?? p.employeeId}
                  </span>
                  <span className="text-xs text-text-muted">
                    {PERMISO_LABELS[p.type]} · {format(parseISO(p.startDate), 'dd/MM')} – {format(parseISO(p.endDate), 'dd/MM/yyyy')} · {p.days} día{p.days !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className="shrink-0 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                  Pendiente
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {monthlyReport.length > 0 && (
        <div className="glass-panel rounded-[1.75rem] border border-card-border shadow-premium overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
            <h2 className="text-sm font-bold text-text-dark flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-text-muted" />
              Resumen de Incidencias del Período
            </h2>
            <button
              onClick={() => onNavigate?.('incidencias')}
              className="text-xs font-bold text-text-muted hover:text-text-dark transition-colors"
            >
              Ver reporte completo →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#e9e5db]/30 text-text-muted uppercase tracking-wider font-bold text-[10px]">
                  <th className="text-left px-6 py-3">Colaborador</th>
                  <th className="text-center px-3 py-3">Retardos</th>
                  <th className="text-center px-3 py-3">Ausencias SJ</th>
                  <th className="text-center px-3 py-3">Vacaciones</th>
                  <th className="text-center px-3 py-3">Bono</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {monthlyReport
                  .sort((a, b) => (b.retardos + b.ausenciasSJ) - (a.retardos + a.ausenciasSJ))
                  .slice(0, 8)
                  .map((row) => (
                    <tr key={row.employeeId} className="hover:bg-white/40 transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-bold text-text-dark">{row.employeeName}</p>
                        <p className="text-text-muted">{row.department}</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`font-bold ${row.retardos > 0 ? 'text-red-600' : 'text-text-muted'}`}>{row.retardos}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`font-bold ${row.ausenciasSJ > 0 ? 'text-red-700' : 'text-text-muted'}`}>{row.ausenciasSJ}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`font-bold ${row.vacaciones > 0 ? 'text-blue-600' : 'text-text-muted'}`}>{row.vacaciones}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {row.bonoPuntualidad
                          ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                          : <XCircle className="w-4 h-4 text-text-muted/40 mx-auto" />
                        }
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
  }
