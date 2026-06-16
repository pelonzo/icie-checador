import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { calculateWorkedHours } from '../utils/calculations';
import { format, startOfMonth, subMonths, differenceInMinutes } from 'date-fns';

// ─── Tipos locales (espejo de las tablas de Supabase) ─────────

export interface LocalTimeEntry {
  id: string;
  userId: string;
  date: string;           // YYYY-MM-DD
  clockIn: string;        // ISO timestamp
  clockOut: string | null;
  totalHours: number | null;
  status: 'active' | 'paused' | 'completed';
  editedManually: boolean;
}

export interface LocalPause {
  id: string;
  timeEntryId: string;
  startTime: string;
  endTime: string | null;
  type: 'meal' | 'break' | 'other';
  duration: number | null;  // minutos
}

// ─── Mapeo DB → local ─────────────────────────────────────────

function mapEntry(row: Record<string, unknown>): LocalTimeEntry {
  return {
    id:            row.id as string,
    userId:        row.user_id as string,
    date:          row.date as string,
    clockIn:       row.clock_in as string,
    clockOut:      (row.clock_out as string | null) ?? null,
    totalHours:    (row.total_hours as number | null) ?? null,
    status:        row.status as LocalTimeEntry['status'],
    editedManually: (row.edited_manually as boolean) ?? false,
  };
}

function mapPause(row: Record<string, unknown>): LocalPause {
  return {
    id:           row.id as string,
    timeEntryId:  row.time_entry_id as string,
    startTime:    row.start_time as string,
    endTime:      (row.end_time as string | null) ?? null,
    type:         row.type as LocalPause['type'],
    duration:     (row.duration as number | null) ?? null,
  };
}

// ─── Hook principal ───────────────────────────────────────────

export function useTimeTracking(userId: string | undefined) {
  const [entries, setEntries] = useState<LocalTimeEntry[]>([]);
  const [pauses, setPauses]   = useState<LocalPause[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!userId) {
      setEntries([]);
      setPauses([]);
      return;
    }

    // Cargar los últimos 2 meses para el historial
    const since = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');

    const { data: entriesData, error: eErr } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('date', since)
      .order('date', { ascending: false });

    if (eErr) {
      console.error('Error cargando entradas:', eErr.message);
      return;
    }

    const mapped = (entriesData ?? []).map(mapEntry);
    setEntries(mapped);

    if (mapped.length === 0) {
      setPauses([]);
      return;
    }

    const entryIds = mapped.map(e => e.id);
    const { data: pausesData, error: pErr } = await supabase
      .from('pauses')
      .select('*')
      .in('time_entry_id', entryIds);

    if (pErr) {
      console.error('Error cargando pausas:', pErr.message);
    } else {
      setPauses((pausesData ?? []).map(mapPause));
    }
  }, [userId]);

  // Carga inicial
  useEffect(() => {
    setIsLoading(true);
    loadData().finally(() => setIsLoading(false));
  }, [userId, loadData]);

  // Jornada activa
  const activeEntry = useMemo(
    () => entries.find(e => e.status === 'active' || e.status === 'paused'),
    [entries]
  );

  // Pausa activa
  const activePause = useMemo(() => {
    if (!activeEntry || activeEntry.status !== 'paused') return null;
    return pauses.find(p => p.timeEntryId === activeEntry.id && p.endTime === null) ?? null;
  }, [activeEntry, pauses]);

  // Pausas de la jornada activa
  const activeEntryPauses = useMemo(
    () => (activeEntry ? pauses.filter(p => p.timeEntryId === activeEntry.id) : []),
    [activeEntry, pauses]
  );

  // ─── CLOCK IN ─────────────────────────────────────────────

  const clockIn = useCallback(async () => {
    if (!userId || activeEntry) {
      if (activeEntry) alert('Ya existe una jornada de trabajo activa.');
      return;
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const hasEntryToday = entries.some(e => e.date === todayStr);
    if (hasEntryToday) {
      const confirm = window.confirm(
        'Ya tienes un registro hoy. ¿Deseas iniciar una nueva jornada?'
      );
      if (!confirm) return;
    }

    const nowISO = new Date().toISOString();

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        user_id:  userId,
        date:     todayStr,
        clock_in: nowISO,
        status:   'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error en clockIn:', error.message);
      alert('No se pudo registrar la entrada. Verifica tu conexión.');
      return;
    }

    setEntries(prev => [mapEntry(data), ...prev]);
  }, [userId, activeEntry, entries]);

  // ─── CLOCK OUT ────────────────────────────────────────────

  const clockOut = useCallback(async () => {
    if (!userId || !activeEntry) return;

    const nowISO = new Date().toISOString();

    // Cerrar pausa activa si existe
    if (activePause) {
      const duration = differenceInMinutes(new Date(nowISO), new Date(activePause.startTime));
      await supabase
        .from('pauses')
        .update({ end_time: nowISO, duration })
        .eq('id', activePause.id);
    }

    // Pausas actualizadas para cálculo de horas
    const updatedPauses = [
      ...pauses.filter(p => p.timeEntryId !== activeEntry.id || p.endTime !== null),
      ...(activePause
        ? [{ ...activePause, endTime: nowISO, duration: differenceInMinutes(new Date(nowISO), new Date(activePause.startTime)) }]
        : []),
    ].filter(p => p.timeEntryId === activeEntry.id);

    const workedHours = calculateWorkedHours({
      clockIn:  activeEntry.clockIn,
      clockOut: nowISO,
      pauses:   updatedPauses,
    });

    const { error } = await supabase
      .from('time_entries')
      .update({
        clock_out:   nowISO,
        total_hours: workedHours,
        status:      'completed',
      })
      .eq('id', activeEntry.id);

    if (error) {
      console.error('Error en clockOut:', error.message);
      alert('No se pudo registrar la salida. Verifica tu conexión.');
      return;
    }

    await loadData();
  }, [userId, activeEntry, activePause, pauses, loadData]);

  // ─── START PAUSE ──────────────────────────────────────────

  const startPause = useCallback(async (type: 'meal' | 'break' | 'other') => {
    if (!userId || !activeEntry || activeEntry.status === 'paused') return;

    const nowISO = new Date().toISOString();

    // Insertar pausa
    const { data: pauseData, error: pErr } = await supabase
      .from('pauses')
      .insert({
        time_entry_id: activeEntry.id,
        start_time:    nowISO,
        type,
      })
      .select()
      .single();

    if (pErr) {
      console.error('Error iniciando pausa:', pErr.message);
      return;
    }

    // Actualizar status de la jornada
    await supabase
      .from('time_entries')
      .update({ status: 'paused' })
      .eq('id', activeEntry.id);

    setPauses(prev => [...prev, mapPause(pauseData)]);
    setEntries(prev =>
      prev.map(e => e.id === activeEntry.id ? { ...e, status: 'paused' as const } : e)
    );
  }, [userId, activeEntry]);

  // ─── END PAUSE ────────────────────────────────────────────

  const endPause = useCallback(async () => {
    if (!userId || !activeEntry || !activePause) return;

    const nowISO = new Date().toISOString();
    const duration = differenceInMinutes(new Date(nowISO), new Date(activePause.startTime));

    await supabase
      .from('pauses')
      .update({ end_time: nowISO, duration })
      .eq('id', activePause.id);

    await supabase
      .from('time_entries')
      .update({ status: 'active' })
      .eq('id', activeEntry.id);

    await loadData();
  }, [userId, activeEntry, activePause, loadData]);

  // ─── EDICIÓN MANUAL ───────────────────────────────────────

  const editEntryManual = useCallback(async (
    entryId: string,
    newClockIn: string,
    newClockOut: string | null
  ) => {
    if (!userId) return;

    const entryPauses = pauses.filter(p => p.timeEntryId === entryId);
    const workedHours = newClockOut
      ? calculateWorkedHours({ clockIn: newClockIn, clockOut: newClockOut, pauses: entryPauses })
      : null;

    const { error } = await supabase
      .from('time_entries')
      .update({
        clock_in:        newClockIn,
        clock_out:       newClockOut,
        total_hours:     workedHours,
        edited_manually: true,
        status:          newClockOut ? 'completed' : 'active',
      })
      .eq('id', entryId);

    if (error) {
      console.error('Error en edición manual:', error.message);
      return;
    }

    await loadData();
  }, [userId, pauses, loadData]);

  return {
    entries,
    pauses,
    activeEntry,
    activePause,
    activeEntryPauses,
    isLoading,
    clockIn,
    clockOut,
    startPause,
    endPause,
    editEntryManual,
    refresh: loadData,
  };
}
