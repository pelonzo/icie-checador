import { useState, useEffect, useCallback } from 'react';
import {
  CalendarOff,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  RefreshCw,
  ChevronDown,
  MessageSquare,
  Umbrella,
  ShieldCheck,
  Stethoscope,
  Timer,
} from 'lucide-react';
import {
  getAllPermisos,
  getMyPermisos,
  requestPermiso,
  reviewPermiso,
} from '../../lib/adminApi';
import type { PermisoVacacion, PermisosType, PermisoStatus } from '../../types/admin';
import { PERMISO_LABELS, PERMISO_STATUS_LABELS } from '../../types/admin';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface PermisosVacacionesProps {
  userEmail: string;
  isAdmin: boolean;
  employeeId?: string;
}

type TabView = 'pending' | 'all' | 'mine';

const PERMISO_ICONS: Record<PermisosType, typeof CalendarOff> = {
  vacaciones:       Umbrella,
  permiso_pgss:     ShieldCheck,
  permiso_sin_goce: CalendarOff,
  incapacidad:      Stethoscope,
  permiso_horas:    Timer,
};

const STATUS_STYLES: Record<PermisoStatus, string> = {
  pending:  'text-amber-700 bg-amber-50 border-amber-100',
  approved: 'text-green-700 bg-green-50 border-green-100',
  rejected: 'text-red-700 bg-red-50 border-red-100',
};

function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  return differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;
}

export function PermisosVacaciones({ userEmail, isAdmin, employeeId }: PermisosVacacionesProps) {
  const [tab, setTab]             = useState<TabView>(isAdmin ? 'pending' : 'mine');
  const [permisos, setPermisos]   = useState<PermisoVacacion[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting]   = useState(false);

  const [form, setForm] = useState({
    type: 'vacaciones' as PermisosType,
    startDate: '',
    endDate: '',
    hours: '',
    reason: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let data: PermisoVacacion[] = [];
      if (tab === 'mine') {
        data = await getMyPermisos(userEmail);
      } else {
        data = await getAllPermisos(
          tab === 'pending' ? { status: 'pending' } : undefined
        );
      }
      setPermisos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tab, userEmail]);

  useEffect(() => { load(); }, [load]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;
    setSubmitting(true);
    try {
      const days = form.type === 'permiso_horas'
        ? 0
        : calcDays(form.startDate, form.endDate);
      await requestPermiso({
        employeeId,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        days,
        hours: form.type === 'permiso_horas' ? Number(form.hours) : undefined,
        reason: form.reason,
      });
      setShowNewForm(false);
      setForm({ type: 'vacaciones', startDate: '', endDate: '', hours: '', reason: '' });
      await load();
    } catch (err) {
      alert('Error al enviar la solicitud. Intenta de nuevo.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (permisoId: string, decision: PermisoStatus) => {
    setSubmitting(true);
    try {
      await reviewPermiso(userEmail, permisoId, decision, reviewNotes);
      setReviewingId(null);
      setReviewNotes('');
      await load();
    } catch (err) {
      alert('Error al procesar la solicitud.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const tabs: { id: TabView; label: string; show: boolean }[] = [
    { id: 'pending', label: 'Pendientes',    show: isAdmin },
    { id: 'all',     label: 'Todas',         show: isAdmin },
    { id: 'mine',    label: 'Mis Solicitudes', show: true },
  ];

  return (
    <div className="flex flex-col gap-6 w-full animate-fadeIn">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-text-dark tracking-tight mb-1">
            Permisos y Vacaciones
          </h1>
          <p className="text-sm text-text-muted">
            {isAdmin
              ? 'Gestiona y aprueba las solicitudes de los colaboradores.'
              : 'Consulta y solicita tus permisos y vacaciones.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2.5 border border-card-border bg-white hover:bg-gray-50 text-text-dark rounded-full text-sm font-semibold transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {employeeId && (
            <button
              onClick={() => setShowNewForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-nav-active hover:bg-black text-white rounded-full text-sm font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nueva Solicitud
            </button>
          )}
        </div>
      </div>

      <div className="glass-panel p-1.5 rounded-2xl border border-card-border inline-flex gap-1 self-start">
        {tabs.filter((t) => t.show).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === t.id
                ? 'bg-nav-active text-white shadow'
                : 'text-text-muted hover:text-text-dark'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="glass-panel rounded-[2rem] border border-card-border shadow-premium overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center gap-3 text-text-muted text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Cargando solicitudes...
          </div>
        ) : permisos.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <CalendarOff className="w-12 h-12 text-text-muted/30 mb-3" />
            <p className="text-sm font-bold text-text-muted">No hay solicitudes</p>
          </div>
        ) : (
          <div className="divide-y divide-card-border">
            <div className="hidden md:grid grid-cols-12 gap-3 px-6 py-3 bg-[#e9e5db]/30 text-[10px] font-bold text-text-muted uppercase tracking-wider">
              <span className="col-span-3">Colaborador</span>
              <span className="col-span-2">Tipo</span>
              <span className="col-span-2">Período</span>
              <span className="col-span-1 text-center">Días</span>
              <span className="col-span-2">Solicitado</span>
              <span className="col-span-2 text-right">Estado / Acción</span>
            </div>
            {permisos.map((p) => {
              const Icon = PERMISO_ICONS[p.type];
              const isReviewing = reviewingId === p.id;
              return (
                <div key={p.id} className="px-6 py-4 hover:bg-white/40 transition-colors">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="col-span-3">
                      <p className="text-sm font-bold text-text-dark">{p.employeeName ?? p.employeeId}</p>
                      {p.reason && <p className="text-xs text-text-muted truncate max-w-[200px]">{p.reason}</p>}
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      <span className="text-xs font-semibold text-text-dark">{PERMISO_LABELS[p.type]}</span>
                    </div>
                    <div className="col-span-2 text-xs text-text-muted">
                      {format(parseISO(p.startDate), 'dd/MM')} – {format(parseISO(p.endDate), 'dd/MM/yyyy')}
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="text-sm font-extrabold text-text-dark">
                        {p.type === 'permiso_horas' ? `${p.hours}h` : `${p.days}d`}
                      </span>
                    </div>
                    <div className="col-span-2 text-xs text-text-muted">
                      {format(parseISO(p.requestedAt), "dd/MM/yy 'a las' HH:mm", { locale: es })}
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                      {p.status !== 'pending' || !isAdmin ? (
                        <span className={`text-[10px] font-bold border px-2.5 py-1 rounded-full ${STATUS_STYLES[p.status]}`}>
                          {PERMISO_STATUS_LABELS[p.status]}
                          {p.reviewedBy && ` · ${p.reviewedBy}`}
                        </span>
                      ) : (
                        <button
                          onClick={() => { setReviewingId(isReviewing ? null : p.id); setReviewNotes(''); }}
                          className="flex items-center gap-1 text-xs font-bold text-text-dark border border-card-border bg-white hover:bg-gray-50 px-3 py-1.5 rounded-xl transition-all"
                        >
                          Revisar <ChevronDown className={`w-3 h-3 transition-transform ${isReviewing ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isReviewing && isAdmin && (
                    <div className="mt-4 p-4 bg-[#f5f3ef] border border-card-border rounded-2xl flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Notas para el colaborador (opcional)
                      </div>
                      <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        rows={2}
                        placeholder="Motivo de rechazo, instrucciones adicionales..."
                        className="w-full text-sm text-text-dark bg-white border border-card-border rounded-xl p-3 resize-none focus:outline-none focus:ring-1 focus:ring-black/20"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => { setReviewingId(null); setReviewNotes(''); }}
                          className="px-4 py-2 border border-card-border bg-white hover:bg-gray-50 text-text-dark rounded-full text-xs font-bold transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          disabled={submitting}
                          onClick={() => handleReview(p.id, 'rejected')}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-full text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Rechazar
                        </button>
                        <button
                          disabled={submitting}
                          onClick={() => handleReview(p.id, 'approved')}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-full text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Aprobar
                        </button>
                      </div>
                    </div>
                  )}

                  {p.adminNotes && p.status !== 'pending' && (
                    <div className="mt-2 text-xs text-text-muted bg-white/60 border border-card-border rounded-xl px-3 py-2 flex items-start gap-2">
                      <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{p.adminNotes}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showNewForm && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleRequest}
            className="bg-[#faf8f5] border border-card-border max-w-lg w-full rounded-[2rem] p-8 shadow-2xl flex flex-col gap-5"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-text-dark flex items-center gap-2">
                <CalendarOff className="w-5 h-5 text-amber-500" />
                Nueva Solicitud
              </h2>
              <button type="button" onClick={() => setShowNewForm(false)} className="text-text-muted hover:text-text-dark transition-colors text-xl font-light">×</button>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Tipo de Solicitud</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as PermisosType }))}
                className="w-full text-sm font-semibold text-text-dark bg-white border border-card-border p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-accent-gold"
              >
                {(Object.entries(PERMISO_LABELS) as [PermisosType, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Fecha Inicio</label>
                <input
                  type="date" required
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full text-sm text-text-dark bg-white border border-card-border p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-accent-gold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  {form.type === 'permiso_horas' ? 'Fecha del Permiso' : 'Fecha Fin'}
                </label>
                <input
                  type="date" required
                  value={form.endDate}
                  min={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="w-full text-sm text-text-dark bg-white border border-card-border p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-accent-gold"
                />
              </div>
            </div>

            {form.type === 'permiso_horas' && (
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Número de Horas</label>
                <input
                  type="number" min="0.5" max="8" step="0.5" required
                  value={form.hours}
                  onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                  className="w-full text-sm text-text-dark bg-white border border-card-border p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-accent-gold"
                />
              </div>
            )}

            {form.startDate && form.endDate && form.type !== 'permiso_horas' && (
              <div className="text-xs font-bold text-text-muted bg-[#e9e5db]/50 border border-card-border rounded-xl px-4 py-2.5">
                Total: <span className="text-text-dark">{calcDays(form.startDate, form.endDate)} día{calcDays(form.startDate, form.endDate) !== 1 ? 's' : ''}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Motivo / Descripción</label>
              <textarea
                required rows={3}
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Describe brevemente el motivo de la solicitud..."
                className="w-full text-sm text-text-dark bg-white border border-card-border p-3 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-accent-gold"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="flex-1 py-3 bg-white border border-card-border hover:bg-gray-50 text-text-dark rounded-full text-sm font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 bg-nav-active hover:bg-black disabled:bg-gray-400 text-white rounded-full text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-2"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {submitting ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
