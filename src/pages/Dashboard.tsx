import { useState, useEffect, useMemo } from 'react';
import { formatHoursMinutes } from '../utils/calculations';
import { TimeClockControls } from '../components/time-tracking/TimeClockControls';
import { CurrentStatus } from '../components/time-tracking/CurrentStatus';
import { WeeklyChart } from '../components/dashboard/WeeklyChart';
import { StatsCard } from '../components/dashboard/StatsCard';
import {
  Laptop,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  Circle,
  FileSpreadsheet,
  CalendarOff,
  ChevronRight,
} from 'lucide-react';
import { type UserProfile } from '../hooks/useAuth';
import { type LocalTimeEntry, type LocalPause, db } from '../lib/db';
import { isToday } from 'date-fns';

interface DashboardProps {
  user: UserProfile;
  entries: LocalTimeEntry[];
  pauses: LocalPause[];
  activeEntry: LocalTimeEntry | undefined;
  activePause: LocalPause | null;
  activeEntryPauses: LocalPause[];
  clockIn: () => void;
  clockOut: () => void;
  startPause: (type: 'meal' | 'break' | 'other') => void;
  endPause: () => void;
}

export function Dashboard({
  user,
  entries,
  pauses,
  activeEntry,
  activePause,
  activeEntryPauses,
  clockIn,
  clockOut,
  startPause,
  endPause
}: DashboardProps) {

  const [openAccordion, setOpenAccordion] = useState<string | null>('devices');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Obtener detalles del dispositivo del usuario actual
  const deviceDetails = useMemo(() => {
    if (typeof window === 'undefined') return { os: 'Desconocido', browser: 'Desconocido' };
    const ua = navigator.userAgent;
    let os = 'Windows';
    if (ua.indexOf('Mac') !== -1) os = 'macOS';
    else if (ua.indexOf('Linux') !== -1) os = 'Linux';
    else if (ua.indexOf('iPhone') !== -1 || ua.indexOf('iPad') !== -1) os = 'iOS';
    else if (ua.indexOf('Android') !== -1) os = 'Android';

    let browser = 'Chrome';
    if (ua.indexOf('Safari') !== -1 && ua.indexOf('Chrome') === -1) browser = 'Safari';
    else if (ua.indexOf('Firefox') !== -1) browser = 'Firefox';
    else if (ua.indexOf('Edg') !== -1) browser = 'Edge';

    return { os, browser };
  }, []);

  // Escuchar el tamaño de la cola de sincronización de IndexedDB
  useEffect(() => {
    async function updateSyncCount() {
      try {
        const count = await db.syncQueue.count();
        setPendingSyncCount(count);
      } catch (e) {
        console.error(e);
      }
    }

    updateSyncCount();
    // Suscribir a la tabla de cola usando un intervalo rápido
    const interval = setInterval(updateSyncCount, 1500);
    return () => clearInterval(interval);
  }, []);

  const toggleAccordion = (id: string) => {
    setOpenAccordion(openAccordion === id ? null : id);
  };

  // Horas del mes actual para el badge del usuario
  const totalHoursThisMonth = useMemo(() => {
    const startOfCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthEntries = entries.filter(e => {
      if (e.status !== 'completed' || !e.totalHours) return false;
      const entryDate = new Date(e.clockIn);
      return entryDate >= startOfCurrentMonth;
    });
    const total = monthEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0);
    return Math.round(total * 10) / 10;
  }, [entries]);

  // Hitos del día actual (checklist)
  const todayMilestones = useMemo(() => {
    const milestones = [
      { id: 'login', text: 'Sesión iniciada con Google', completed: true },
      { id: 'clockin', text: 'Registrar entrada (Clock In)', completed: !!activeEntry },
      { id: 'break1', text: 'Realizar descanso/pausa', completed: activeEntryPauses.length > 0 },
      { id: 'clockout', text: 'Registrar salida (Clock Out)', completed: entries.some(e => e.status === 'completed' && isToday(new Date(e.clockIn))) },
    ];
    const completedCount = milestones.filter(m => m.completed).length;
    return { list: milestones, completedCount, total: milestones.length };
  }, [activeEntry, activeEntryPauses, entries]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">

      {/* Left Column: Profile Card and Accordion (Span 3) */}
      <section className="lg:col-span-3 flex flex-col gap-6 w-full">
        {/* Profile Card */}
        <div className="glass-panel rounded-[2.5rem] border border-card-border p-6 shadow-premium relative overflow-hidden flex flex-col items-center text-center">
          {/* Accent decoration */}
          <div className="absolute top-0 inset-x-0 h-2 bg-accent-gold"></div>

          <div className="relative mt-4 mb-4">
            <img src={user?.avatarUrl ? user.avatarUrl : `https://ui-avatars.com/api/?name=${user?.fullName || 'Colaborador'}&background=8cc63f&color=fff`}
              alt="Foto de perfil"
              className="w-28 h-28 rounded-full border-4 border-white shadow-lg object-cover mx-auto"
            />
            <span className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
              <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping"></span>
            </span>
          </div>

          <h2 className="text-xl font-extrabold text-text-dark tracking-tight leading-tight mb-1">
            {user.fullName}
          </h2>
          <span className="text-xs text-text-muted font-bold tracking-wider uppercase mb-4">
            Colaborador Google
          </span>

          {/* Monthly hours pill */}
          <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-nav-active text-white rounded-full text-xs font-semibold shadow-md">
            <Clock className="w-3.5 h-3.5 text-accent-gold" />
            <span>{formatHoursMinutes(totalHoursThisMonth)} trabajadas</span>
          </div>
        </div>

        {/* Accordion Menu */}
        <div className="glass-panel rounded-[2.5rem] border border-card-border p-5 shadow-premium flex flex-col gap-2">
          {/* Item 1: Dispositivos */}
          <div className="border-b border-card-border pb-2 last:border-0 last:pb-0">
            <button
              onClick={() => toggleAccordion('devices')}
              className="flex justify-between items-center w-full py-2.5 text-left text-sm font-bold text-text-dark hover:text-accent-gold-dark transition-colors"
            >
              <span>Dispositivos</span>
              {openAccordion === 'devices' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openAccordion === 'devices' && (
              <div className="pt-1.5 pb-2.5 pl-1 flex items-center gap-3 animate-slideDown">
                <div className="w-10 h-10 bg-white/80 border border-card-border rounded-xl flex items-center justify-center text-text-dark shadow-sm">
                  <Laptop className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-text-dark">{deviceDetails.os} Laptop</span>
                  <span className="text-[10px] text-text-muted">Navegador {deviceDetails.browser}</span>
                </div>
              </div>
            )}
          </div>

          {/* Item 2: Resumen Corporativo */}
          <div className="border-b border-card-border pb-2 last:border-0 last:pb-0">
            <button
              onClick={() => toggleAccordion('compensation')}
              className="flex justify-between items-center w-full py-2.5 text-left text-sm font-bold text-text-dark hover:text-accent-gold-dark transition-colors"
            >
              <span>Resumen Corporativo</span>
              {openAccordion === 'compensation' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openAccordion === 'compensation' && (
              <div className="pt-1.5 pb-2.5 text-xs text-text-muted space-y-2 pl-1 animate-slideDown">
                <div className="flex justify-between font-semibold">
                  <span>Sueldo Base:</span>
                  <span className="text-text-dark">$1,200 USD</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Puesto:</span>
                  <span className="text-text-dark">Colaborador</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Rol de Acceso:</span>
                  <span className="text-text-dark">User</span>
                </div>
              </div>
            )}
          </div>

          {/* Item 3: Soporte / Google Sheets */}
          <div className="border-b border-card-border pb-2 last:border-0 last:pb-0">
            <button
              onClick={() => toggleAccordion('support')}
              className="flex justify-between items-center w-full py-2.5 text-left text-sm font-bold text-text-dark hover:text-accent-gold-dark transition-colors"
            >
              <span>Ayuda e Integración</span>
              {openAccordion === 'support' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openAccordion === 'support' && (
              <div className="pt-1.5 pb-2.5 text-xs text-text-muted space-y-2 pl-1 animate-slideDown">
                <p className="leading-relaxed">
                  Tus marcas se guardan al instante localmente en IndexedDB. Al recuperar la red, se sincronizan con las pestañas de tu hoja de cálculo.
                </p>
                <div className="flex items-center gap-1.5 text-accent-gold-dark font-bold hover:underline cursor-pointer">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Ver hoja en Drive</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Middle Column: Welcome, Stats row, and Main widgets grid (Span 6) */}
      <section className="lg:col-span-6 flex flex-col gap-6 w-full">
        {/* Welcome message */}
        <div className="flex flex-col">
          <h1 className="text-3xl md:text-4xl font-extrabold text-text-dark tracking-tight mb-1">
            ¡Bienvenido {user.fullName.split(' ')[0]}!
          </h1>
          <p className="text-sm text-text-muted">
            Gestiona tu jornada laboral y revisa tus estadísticas semanales.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Horas Semana"
            value={formatHoursMinutes(totalHoursThisMonth)}
            subtitle="Acumulado semanal"
            progress={Math.round((totalHoursThisMonth / 40) * 100)}
            iconType="clock"
          />
          <StatsCard
            title="Pausas de Hoy"
            value={`${activeEntryPauses.length}`}
            subtitle={`${activeEntryPauses.reduce((sum, p) => sum + (p.duration || 0), 0)} min acumulados`}
            iconType="coffee"
          />
          <StatsCard
            title="Estado Sync"
            value={pendingSyncCount === 0 ? 'Al día' : `${pendingSyncCount} pendientes`}
            subtitle={pendingSyncCount === 0 ? 'Sincronizado con Sheets' : 'Guardado offline local'}
            iconType="sync"
            progressColor="bg-green-500"
          />
        </div>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          <WeeklyChart entries={entries} pauses={pauses} />
          <TimeClockControls
            activeEntry={activeEntry}
            activePause={activePause}
            activeEntryPauses={activeEntryPauses}
            onClockIn={clockIn}
            onClockOut={clockOut}
            onStartPause={startPause}
            onEndPause={endPause}
          />
        </div>
      </section >

      {/* Right Column: Today's Status & Milestone Checklist (Span 3) */}
      < section className="lg:col-span-3 flex flex-col gap-6 w-full" >
        {/* Today's Pause Status and Timeline */}
        < CurrentStatus
          activeEntry={activeEntry}
          activeEntryPauses={activeEntryPauses}
        />

        {/* Today's Activity / Milestone Checklist Widget */}
        < div className="glass-panel p-6 rounded-[2.5rem] border border-card-border shadow-premium flex flex-col" >
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-sm text-text-dark uppercase tracking-wider">
              Hitos de Hoy
            </h4>
            <span className="text-xs bg-[#e9e5db]/60 border border-card-border px-2.5 py-0.5 rounded-full text-text-dark font-extrabold font-mono">
              {todayMilestones.completedCount}/{todayMilestones.total}
            </span>
          </div>

          {/* List representing the checklist */}
          <div className="space-y-3">
            {todayMilestones.list.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 bg-white/40 border border-card-border rounded-xl transition-all"
              >
                <span className={`text-xs font-semibold ${m.completed ? 'line-through text-text-muted' : 'text-text-dark'}`}>
                  {m.text}
                </span>
                <div>
                  {m.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-accent-gold fill-accent-gold-light" />
                  ) : (
                    <Circle className="w-4 h-4 text-text-muted/40" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div >

        {/* Acceso rápido: solicitar permiso */}
        <button
          onClick={onNavigatePermisos}
          className="glass-panel p-5 rounded-[2rem] border border-card-border shadow-premium flex items-center gap-4 hover:bg-white/60 active:scale-[0.98] transition-all text-left group w-full"
        >
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
            <CalendarOff className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-dark">Solicitar Permiso</p>
            <p className="text-xs text-text-muted">Vacaciones, permisos y más</p>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted group-hover:translate-x-0.5 transition-transform shrink-0" />
        </button>
      </section >

    </div >
  );
}
export default Dashboard;
