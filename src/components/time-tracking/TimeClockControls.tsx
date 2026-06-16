import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Utensils, Coffee, HelpCircle } from 'lucide-react';
import { type LocalTimeEntry, type LocalPause } from '../../lib/db';
import { differenceInSeconds } from 'date-fns';

interface TimeClockControlsProps {
  activeEntry: LocalTimeEntry | undefined;
  activePause: LocalPause | null;
  activeEntryPauses: LocalPause[];
  onClockIn: () => void;
  onClockOut: () => void;
  onStartPause: (type: 'meal' | 'break' | 'other') => void;
  onEndPause: () => void;
}

export function TimeClockControls({
  activeEntry,
  activePause,
  activeEntryPauses,
  onClockIn,
  onClockOut,
  onStartPause,
  onEndPause
}: TimeClockControlsProps) {
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const timerRef = useRef<any>(null);

  // Calcular el tiempo transcurrido neto en tiempo real
  const calculateRealtimeSeconds = () => {
    if (!activeEntry) return 0;

    const now = new Date();
    const clockInTime = new Date(activeEntry.clockIn);

    // Tiempo bruto transcurrido en segundos
    let grossSeconds = differenceInSeconds(now, clockInTime);
    if (grossSeconds < 0) grossSeconds = 0;

    // Calcular segundos de pausas finalizadas
    let totalPauseSeconds = activeEntryPauses.reduce((sum, pause) => {
      if (pause.endTime) {
        return sum + differenceInSeconds(new Date(pause.endTime), new Date(pause.startTime));
      }
      return sum;
    }, 0);

    // Si hay una pausa activa actualmente, sumamos su duración hasta ahora
    if (activePause) {
      const pauseStartTime = new Date(activePause.startTime);
      const activePauseSeconds = differenceInSeconds(now, pauseStartTime);
      totalPauseSeconds += activePauseSeconds > 0 ? activePauseSeconds : 0;
    }

    const netSeconds = grossSeconds - totalPauseSeconds;
    return netSeconds > 0 ? netSeconds : 0;
  };

  // Actualizar el cronómetro cada segundo
  useEffect(() => {
    if (activeEntry && activeEntry.status !== 'completed') {
      setSecondsElapsed(calculateRealtimeSeconds());

      timerRef.current = setInterval(() => {
        setSecondsElapsed(calculateRealtimeSeconds());
      }, 1000);
    } else {
      setSecondsElapsed(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeEntry, activePause, activeEntryPauses]);

  // Formatear segundos a HH:MM:SS
  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  // Porcentaje para el arco de progreso (supone una jornada de 8 horas = 28800 segundos)
  const progressPercent = activeEntry
    ? Math.min((secondsElapsed / 28800) * 100, 100)
    : 0;

  // Parámetros de arco circular SVG
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const handlePauseSelect = (type: 'meal' | 'break' | 'other') => {
    onStartPause(type);
    setShowPauseMenu(false);
  };

  return (
    <div className="glass-panel p-8 rounded-[2.5rem] shadow-premium flex flex-col items-center justify-between min-h-[380px] w-full transition-all duration-300 hover:shadow-card-hover border border-card-border relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute -right-20 -top-20 w-48 h-48 bg-accent-gold-light/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Title */}
      <div className="flex justify-between items-center w-full mb-4">
        <h3 className="font-bold text-lg text-text-dark">Control de Tiempo</h3>
        <span className="text-xs bg-white border border-card-border px-3 py-1 rounded-full text-text-muted font-semibold flex items-center gap-1 shadow-sm">
          <span className={`w-2 h-2 rounded-full ${activeEntry ? (activeEntry.status === 'paused' ? 'bg-amber-400 animate-pulse' : 'bg-green-500 animate-pulse') : 'bg-gray-300'}`}></span>
          {activeEntry ? (activeEntry.status === 'paused' ? 'Pausado' : 'Trabajando') : 'Sin iniciar'}
        </span>
      </div>

      {/* Circular Timer Widget */}
      <div className="relative w-48 h-48 flex items-center justify-center my-4">
        {/* SVG Progress Ring */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
          {/* Dotted Track */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            className="stroke-[#e6e2d4] fill-none"
            strokeWidth="3"
            strokeDasharray="4 6"
          />
          {/* Active Progress Ring */}
          {activeEntry && (
            <circle
              cx="100"
              cy="100"
              r={radius}
              className="stroke-accent-gold fill-none transition-all duration-1000 ease-out"
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* Digital Clock readout */}
        <div className="absolute flex flex-col items-center text-center">
          <span className="text-3xl font-extrabold tracking-tight text-text-dark font-mono leading-none">
            {activeEntry ? formatTime(secondsElapsed) : '00:00:00'}
          </span>
          <span className="text-[10px] uppercase font-bold text-text-muted mt-2 tracking-wider">
            {activeEntry ? 'Tiempo de Trabajo' : 'Inicia jornada'}
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="w-full flex items-center justify-center gap-4 mt-4 z-10">
        {!activeEntry ? (
          /* Clock In Button */
          <button
            onClick={onClockIn}
            className="w-14 h-14 bg-nav-active hover:bg-black text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
            title="Iniciar jornada (Clock In)"
          >
            <Play className="w-6 h-6 fill-white stroke-none ml-1" />
          </button>
        ) : (
          /* Active Workday Controls */
          <>
            {activeEntry.status === 'paused' ? (
              /* Resume Pause */
              <button
                onClick={onEndPause}
                className="w-12 h-12 bg-accent-gold text-text-dark hover:bg-accent-gold-dark rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
                title="Reanudar jornada"
              >
                <Play className="w-5 h-5 fill-text-dark stroke-none ml-0.5" />
              </button>
            ) : (
              /* Start Pause Menu Trigger */
              <div className="relative">
                <button
                  onClick={() => setShowPauseMenu(!showPauseMenu)}
                  className="w-12 h-12 bg-white border border-card-border hover:bg-gray-50 text-text-dark rounded-full flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all"
                  title="Pausar jornada"
                >
                  <Pause className="w-5 h-5" />
                </button>

                {/* Pause Category Popup Menu */}
                {showPauseMenu && (
                  <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-44 glass-panel-dark text-white rounded-2xl p-2 shadow-2xl z-20 flex flex-col gap-1 animate-scaleUp">
                    <div className="text-[10px] uppercase font-bold text-gray-400 px-3 py-1.5 border-b border-white/10 mb-1">
                      Categoría de pausa
                    </div>
                    <button
                      onClick={() => handlePauseSelect('meal')}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-white/15 rounded-xl text-left transition-all"
                    >
                      <Utensils className="w-3.5 h-3.5 text-accent-gold" />
                      <span>Comida</span>
                    </button>
                    <button
                      onClick={() => handlePauseSelect('break')}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-white/15 rounded-xl text-left transition-all"
                    >
                      <Coffee className="w-3.5 h-3.5 text-accent-gold" />
                      <span>Descanso</span>
                    </button>
                    <button
                      onClick={() => handlePauseSelect('other')}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold hover:bg-white/15 rounded-xl text-left transition-all"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-accent-gold" />
                      <span>Otra pausa</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Clock Out / Stop Button */}
            <button
              onClick={() => {
                if (window.confirm('¿Estás seguro de que deseas finalizar tu jornada laboral actual?')) {
                  onClockOut();
                }
              }}
              className="w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
              title="Registrar salida (Clock Out)"
            >
              <Square className="w-4 h-4 fill-white stroke-none" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
