import { useState, useEffect } from 'react';
import { X, CalendarOff, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { type PermisosType, PERMISO_LABELS } from '../../types/admin';
import { requestPermiso, getMyEmployee } from '../../lib/adminApi';
import { eachDayOfInterval, isWeekend, parseISO, format } from 'date-fns';

interface SolicitarPermisoModalProps {
  userEmail: string;
  onClose: () => void;
  onSuccess: () => void;
}

function countBusinessDays(start: string, end: string): number {
  if (!start || !end || start > end) return 0;
  const days = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) });
  return days.filter(d => !isWeekend(d)).length;
}

export function SolicitarPermisoModal({ userEmail, onClose, onSuccess }: SolicitarPermisoModalProps) {
  const today = format(new Date(), 'yyyy-MM-dd');

  const [type, setType]           = useState<PermisosType>('vacaciones');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate]     = useState(today);
  const [hours, setHours]         = useState(1);
  const [reason, setReason]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  const isHours = type === 'permiso_horas';
  const days = isHours ? 0 : countBusinessDays(startDate, endDate);

  useEffect(() => {
    getMyEmployee(userEmail).then(emp => {
      if (emp) setEmployeeId(emp.id);
    });
  }, [userEmail]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId) { setError('No se encontró tu registro de colaborador. Pide al admin que te registre.'); return; }
    if (!reason.trim()) { setError('Por favor describe el motivo.'); return; }
    if (!isHours && days === 0) { setError('El rango no incluye días hábiles (lunes a viernes).'); return; }

    setLoading(true);
    setError('');
    try {
      await requestPermiso({
        employeeId,
        type,
        startDate,
        endDate: isHours ? startDate : endDate,
        days: isHours ? 0 : days,
        hours: isHours ? hours : undefined,
        reason: reason.trim(),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar la solicitud.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#faf8f5] border border-card-border w-full max-w-lg rounded-[2rem] p-8 shadow-2xl animate-scaleUp">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <CalendarOff className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-text-dark">Nueva Solicitud</h2>
              <p className="text-xs text-text-muted">Permiso o vacaciones</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/60 rounded-full transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Tipo */}
          <div>
            <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wider">
              Tipo de solicitud
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value as PermisosType)}
              className="w-full bg-white border border-card-border rounded-xl px-3 py-2.5 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-accent-gold/40"
            >
              {(Object.entries(PERMISO_LABELS) as [PermisosType, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Fechas / Horas */}
          {isHours ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wider">Fecha</label>
                <input
                  type="date" value={startDate} min={today}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-white border border-card-border rounded-xl px-3 py-2.5 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-accent-gold/40"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wider">Horas</label>
                <input
                  type="number" value={hours} min={1} max={8}
                  onChange={e => setHours(Number(e.target.value))}
                  className="w-full bg-white border border-card-border rounded-xl px-3 py-2.5 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-accent-gold/40"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wider">Fecha inicio</label>
                <input
                  type="date" value={startDate} min={today}
                  onChange={e => {
                    setStartDate(e.target.value);
                    if (e.target.value > endDate) setEndDate(e.target.value);
                  }}
                  className="w-full bg-white border border-card-border rounded-xl px-3 py-2.5 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-accent-gold/40"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wider">Fecha fin</label>
                <input
                  type="date" value={endDate} min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-white border border-card-border rounded-xl px-3 py-2.5 text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-accent-gold/40"
                />
              </div>
            </div>
          )}

          {/* Días hábiles calculados */}
          {!isHours && days > 0 && (
            <div className="flex items-center gap-2 text-xs font-semibold text-text-muted bg-white/60 border border-card-border rounded-xl px-3 py-2">
              <Clock className="w-3.5 h-3.5 text-accent-gold-dark" />
              <span>{days} día{days !== 1 ? 's' : ''} hábil{days !== 1 ? 'es' : ''} solicitado{days !== 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Motivo */}
          <div>
            <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wider">Motivo</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Describe brevemente el motivo de tu solicitud..."
              className="w-full bg-white border border-card-border rounded-xl px-3 py-2.5 text-sm text-text-dark resize-none focus:outline-none focus:ring-2 focus:ring-accent-gold/40"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-3 bg-white border border-card-border text-text-dark rounded-full text-sm font-semibold hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !employeeId}
              className="flex-1 py-3 bg-nav-active text-white rounded-full text-sm font-semibold shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Enviar solicitud
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
