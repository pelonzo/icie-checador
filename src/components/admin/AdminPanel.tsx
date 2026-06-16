import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { getAllPermisos, getMonthlyReport } from '../../lib/adminApi';
import type { PermisoVacacion, MonthlyIncidenciaSummary } from '../../types/admin';
import { PERMISO_LABELS } from '../../types/admin';
import { format, parseISO } from 'date-fns';
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

export function AdminPanel({ adminEmail, onNavigate }: AdminPanelProps) {
  const [pendingPermisos, setPendingPermisos] = useState<PermisoVacacion[]>([]);
  const [monthlyReport, setMonthlyReport]     = useState<MonthlyIncidenciaSummary[]>([]);
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

  const totalRetardos   = monthlyReport.reduce((s, e) => s + e.retardos, 0);
  const totalAusencias  = monthlyReport.reduce((s, e) => s + e.ausenciasSJ, 0);
  const employeesBonus  = monthlyReport.filter((e) => e.bonoPuntualidad).length;

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
