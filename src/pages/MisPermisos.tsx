import { useState, useEffect, useCallback } from 'react';
import { CalendarOff, Plus, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getMyPermisos } from '../lib/adminApi';
import { type PermisoVacacion } from '../types/admin';
import { PERMISO_LABELS, PERMISO_STATUS_LABELS } from '../types/admin';
import { SolicitarPermisoModal } from '../components/permisos/SolicitarPermisoModal';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface MisPermisosProps {
  userEmail: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  pending:  { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700',  icon: Clock },
  approved: { bg: 'bg-green-50 border-green-100', text: 'text-green-700',  icon: CheckCircle },
  rejected: { bg: 'bg-red-50   border-red-100',   text: 'text-red-700',    icon: XCircle },
};

export function MisPermisos({ userEmail }: MisPermisosProps) {
  const [permisos, setPermisos]   = useState<PermisoVacacion[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPermisos(await getMyPermisos(userEmail));
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col gap-6 w-full animate-fadeIn">

      {/* Encabezado */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-text-dark tracking-tight">Mis Permisos</h1>
          <p className="text-sm text-text-muted mt-0.5">Historial y solicitudes de permisos y vacaciones</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-nav-active text-white rounded-full text-sm font-semibold shadow-md hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          Nueva solicitud
        </button>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center gap-3 text-text-muted text-sm py-12 justify-center">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Cargando solicitudes...
        </div>
      ) : permisos.length === 0 ? (
        <div className="glass-panel rounded-[1.75rem] border border-card-border p-12 flex flex-col items-center gap-3 text-center shadow-premium">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-1">
            <CalendarOff className="w-7 h-7 text-amber-400" />
          </div>
          <p className="font-bold text-text-dark text-lg">Sin solicitudes aun</p>
          <p className="text-sm text-text-muted max-w-xs">
            Aqui aparecera el historial de tus permisos y vacaciones una vez que los solicites.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-3 flex items-center gap-2 px-5 py-2.5 bg-nav-active text-white rounded-full text-sm font-semibold shadow-md hover:opacity-90 transition-all"
          >
            <Plus className="w-4 h-4" />
            Hacer primera solicitud
          </button>
        </div>
      ) : (
        <div className="glass-panel rounded-[1.75rem] border border-card-border shadow-premium overflow-hidden">
          <div className="divide-y divide-card-border">
            {permisos.map(p => {
              const style = STATUS_STYLES[p.status];
              const Icon  = style.icon;
              const sameDay = p.startDate === p.endDate;
              return (
                <div key={p.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-white/40 transition-colors">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-bold text-text-dark">{PERMISO_LABELS[p.type]}</span>
                    <span className="text-xs text-text-muted">
                      {format(parseISO(p.startDate), "dd 'de' MMMM", { locale: es })}
                      {!sameDay && ` - ${format(parseISO(p.endDate), "dd 'de' MMMM yyyy", { locale: es })}`}
                      {sameDay && format(parseISO(p.startDate), ' yyyy', { locale: es })}
                      {p.days > 0 && ` - ${p.days} dia${p.days !== 1 ? 's' : ''}`}
                      {p.hours ? ` - ${p.hours}h` : ''}
                    </span>
                    {p.reason && (
                      <span className="text-xs text-text-muted/70 truncate max-w-xs mt-0.5">{p.reason}</span>
                    )}
                    {p.adminNotes && p.status === 'rejected' && (
                      <span className="text-xs text-red-600 mt-0.5 font-medium">Nota: {p.adminNotes}</span>
                    )}
                  </div>
                  <div className={`shrink-0 flex items-center gap-1.5 text-[11px] font-bold border px-3 py-1.5 rounded-full ${style.bg} ${style.text}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {PERMISO_STATUS_LABELS[p.status]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <SolicitarPermisoModal
          userEmail={userEmail}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

export default MisPermisos;
