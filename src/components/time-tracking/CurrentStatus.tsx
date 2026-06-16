import { LogIn, Coffee, Clock, Utensils, HelpCircle } from 'lucide-react';
import { type LocalTimeEntry, type LocalPause } from '../../lib/db';
import { format } from 'date-fns';

interface CurrentStatusProps {
  activeEntry: LocalTimeEntry | undefined;
  activeEntryPauses: LocalPause[];
}

export function CurrentStatus({
  activeEntry,
  activeEntryPauses
}: CurrentStatusProps) {
  if (!activeEntry) {
    return (
      <div className="glass-panel p-6 rounded-[2.5rem] border border-card-border shadow-premium text-center flex flex-col justify-center items-center h-full min-h-[160px]">
        <Clock className="w-10 h-10 text-text-muted/40 mb-2" />
        <p className="text-sm font-bold text-text-muted">No hay ninguna jornada activa</p>
        <p className="text-xs text-text-muted/70 mt-1 max-w-[200px]">
          Haz clic en el botón de reproducción del Tracker para iniciar tu registro.
        </p>
      </div>
    );
  }

  const formatTimeStr = (isoString: string) => {
    return format(new Date(isoString), 'hh:mm a');
  };

  const getPauseIcon = (type: string) => {
    switch (type) {
      case 'meal':
        return <Utensils className="w-3.5 h-3.5" />;
      case 'break':
        return <Coffee className="w-3.5 h-3.5" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5" />;
    }
  };

  const getPauseLabel = (type: string) => {
    switch (type) {
      case 'meal':
        return 'Almuerzo/Comida';
      case 'break':
        return 'Café/Descanso';
      default:
        return 'Otro';
    }
  };

  return (
    <div className="glass-panel p-6 rounded-[2.5rem] border border-card-border shadow-premium flex flex-col h-full min-h-[220px]">
      <h4 className="font-bold text-sm text-text-dark uppercase tracking-wider mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-accent-gold" />
        <span>Detalles de Hoy</span>
      </h4>

      {/* Entry Time */}
      <div className="flex items-center gap-3 bg-white/60 p-3.5 rounded-2xl border border-card-border mb-4">
        <div className="w-8 h-8 bg-green-50 text-green-600 rounded-full flex items-center justify-center border border-green-100">
          <LogIn className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-text-muted">Entrada Registrada</span>
          <span className="text-sm font-bold text-text-dark">
            {formatTimeStr(activeEntry.clockIn)}
          </span>
        </div>
      </div>

      {/* Pauses List */}
      <div className="flex-1 flex flex-col justify-start">
        <span className="text-[10px] uppercase font-bold text-text-muted mb-2 px-1">Registros de Pausas</span>
        
        {activeEntryPauses.length === 0 ? (
          <p className="text-xs text-text-muted italic px-1">No se han registrado pausas hoy.</p>
        ) : (
          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
            {activeEntryPauses.map((pause) => (
              <div 
                key={pause.id}
                className="flex items-center justify-between p-2.5 bg-white/40 border border-card-border rounded-xl text-xs"
              >
                <div className="flex items-center gap-2">
                  <div className="text-accent-gold-dark bg-accent-gold-light/60 p-1.5 rounded-lg border border-accent-gold/10">
                    {getPauseIcon(pause.type)}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-text-dark">{getPauseLabel(pause.type)}</span>
                    <span className="text-[10px] text-text-muted">
                      {formatTimeStr(pause.startTime)}
                      {pause.endTime ? ` - ${formatTimeStr(pause.endTime)}` : ' (Activa)'}
                    </span>
                  </div>
                </div>

                {pause.endTime && pause.duration !== null ? (
                  <span className="font-bold text-text-dark bg-[#e9e5db]/60 border border-card-border px-2 py-0.5 rounded-md font-mono text-[10px]">
                    {pause.duration} min
                  </span>
                ) : (
                  <span className="font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md text-[9px] animate-pulse">
                    En curso
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
