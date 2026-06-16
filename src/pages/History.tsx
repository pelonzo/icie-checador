import { useState, useMemo } from 'react';
import { formatHoursMinutes } from '../utils/calculations';
import {
  Download,
  Edit3,
  Calendar as CalendarIcon,
  AlertCircle,
  Save,
  X,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { type LocalTimeEntry } from '../lib/db';
import { format, isAfter, isBefore, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

interface HistoryProps {
  entries: LocalTimeEntry[];
  onEditEntry: (entryId: string, clockIn: string, clockOut: string | null) => Promise<void>;
  isAdmin: boolean;
}

export function History({ entries, onEditEntry, isAdmin }: HistoryProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Estados para el modal de edición
  const [editingEntry, setEditingEntry] = useState<LocalTimeEntry | null>(null);
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtrar registros según fechas y Ordenar cronológicamente
  const filteredEntries = useMemo(() => {
    // 1. Primero filtramos por el rango de fechas
    const filtered = entries.filter(entry => {
      const entryDate = parseISO(entry.date);
      if (!isValid(entryDate)) return true;

      if (startDate && isBefore(entryDate, parseISO(startDate))) {
        return false;
      }
      if (endDate && isAfter(entryDate, parseISO(endDate))) {
        return false;
      }
      return true;
    });

    // 2. Luego ordenamos el resultado de menor a mayor (Oldest first)
    return filtered.sort((a, b) => {
      const timeA = new Date(a.clockIn).getTime();
      const timeB = new Date(b.clockIn).getTime();
      return timeA - timeB;
    });
  }, [entries, startDate, endDate]);

  // Formatear fecha y hora para mostrar
  const formatDateTime = (isoString: string | null) => {
    if (!isoString) return '---';
    const date = new Date(isoString);
    return format(date, 'dd/MM/yyyy hh:mm a', { locale: es });
  };

  const formatTimeOnly = (isoString: string | null) => {
    if (!isoString) return '---';
    const date = new Date(isoString);
    return format(date, 'hh:mm a');
  };

  // Convertir ISO string a formato local para input `datetime-local` (YYYY-MM-DDThh:mm)
  const toDatetimeLocal = (isoString: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  // Exportar registros locales a CSV (RF-010)
  const exportToCSV = () => {
    if (filteredEntries.length === 0) {
      alert('No hay registros en el rango seleccionado para exportar.');
      return;
    }

    const headers = ['ID', 'Fecha', 'Entrada', 'Salida', 'Horas Trabajadas', 'Estado', 'Modificado Manualmente'];
    const rows = filteredEntries.map(e => [
      e.id,
      e.date,
      e.clockIn ? format(new Date(e.clockIn), 'yyyy-MM-dd HH:mm:ss') : '',
      e.clockOut ? format(new Date(e.clockOut), 'yyyy-MM-dd HH:mm:ss') : '',
      e.totalHours !== null ? e.totalHours.toString() : '0',
      e.status,
      e.editedManually ? 'SI' : 'NO'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Crear link de descarga
    const blob = new Blob(['\uFEFF', csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_horas_${startDate || 'inicio'}_a_${endDate || 'fin'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Abrir modal de edición
  const handleEditClick = (entry: LocalTimeEntry) => {
    setEditingEntry(entry);
    setEditClockIn(toDatetimeLocal(entry.clockIn));
    setEditClockOut(toDatetimeLocal(entry.clockOut));
  };

  // Guardar cambios editados (RF-009)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    setIsSubmitting(true);
    try {
      const clockInISO = new Date(editClockIn).toISOString();
      const clockOutISO = editClockOut ? new Date(editClockOut).toISOString() : null;

      // Validar orden de horas
      if (clockOutISO && isAfter(new Date(clockInISO), new Date(clockOutISO))) {
        alert('La fecha de entrada no puede ser posterior a la fecha de salida.');
        setIsSubmitting(false);
        return;
      }

      await onEditEntry(editingEntry.id, clockInISO, clockOutISO);
      setEditingEntry(null);
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al guardar los cambios.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fadeIn">
      {/* Page Title & Filter Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-text-dark tracking-tight mb-1">
            Historial de Jornadas
          </h1>
          <p className="text-sm text-text-muted">
            Revisa tus registros, edita marcas pasadas (con auditoría) y exporta tus datos.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-5 py-3 bg-nav-active hover:bg-black text-white rounded-full text-sm font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Exportar a CSV</span>
        </button>
      </div>

      {/* Date Filters Widget */}
      <div className="glass-panel p-5 rounded-[2rem] border border-card-border shadow-premium flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-text-dark uppercase tracking-wider">
          <CalendarIcon className="w-4 h-4 text-accent-gold" />
          <span>Filtrar por Rango:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white/70 px-3.5 py-2 rounded-xl border border-card-border">
            <span className="text-[10px] uppercase font-bold text-text-muted">Desde</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs font-semibold text-text-dark bg-transparent border-none outline-none focus:ring-0"
            />
          </div>

          <div className="flex items-center gap-2 bg-white/70 px-3.5 py-2 rounded-xl border border-card-border">
            <span className="text-[10px] uppercase font-bold text-text-muted">Hasta</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs font-semibold text-text-dark bg-transparent border-none outline-none focus:ring-0"
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50/50 hover:bg-red-50 border border-red-100/50 px-3 py-2 rounded-xl transition-all"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* History List */}
      <div className="glass-panel rounded-[2rem] border border-card-border shadow-premium overflow-hidden">
        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <FileText className="w-12 h-12 text-text-muted/40 mb-3" />
            <p className="text-base font-bold text-text-muted">No se encontraron registros</p>
            <p className="text-xs text-text-muted/70 mt-1 max-w-sm">
              No tienes jornadas guardadas para el filtro seleccionado. Comienza a registrar tu tiempo en el Dashboard.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-card-border">
            {/* Table Header for medium/large screens */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-[#e9e5db]/30 text-xs font-bold text-text-muted uppercase tracking-wider">
              <span className="col-span-2">Fecha</span>
              <span className="col-span-3">Entrada</span>
              <span className="col-span-3">Salida</span>
              <span className="col-span-2 text-center">Duración Neta</span>
              <span className="col-span-2 text-right">Acciones</span>
            </div>

            {/* Table Rows */}
            {filteredEntries.map((entry) => {
              return (
                <div
                  key={entry.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-white/40 transition-colors"
                >
                  {/* Date Column */}
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="md:hidden text-[10px] font-bold text-text-muted uppercase block w-16">Fecha:</div>
                    <span className="text-sm font-bold text-text-dark">
                      {format(parseISO(entry.date), 'dd/MM/yyyy')}
                    </span>
                  </div>

                  {/* Clock In Column */}
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="md:hidden text-[10px] font-bold text-text-muted uppercase block w-16">Entrada:</div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-text-dark">
                        {formatTimeOnly(entry.clockIn)}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {formatDateTime(entry.clockIn).split(' ')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Clock Out Column */}
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="md:hidden text-[10px] font-bold text-text-muted uppercase block w-16">Salida:</div>
                    {entry.clockOut ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-text-dark">
                          {formatTimeOnly(entry.clockOut)}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {formatDateTime(entry.clockOut).split(' ')[0]}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100/50 px-2 py-0.5 rounded-md animate-pulse">
                        En Curso
                      </span>
                    )}
                  </div>

                  {/* Worked Hours Column */}
                  <div className="col-span-2 flex items-center justify-between md:justify-center gap-2">
                    <div className="md:hidden text-[10px] font-bold text-text-muted uppercase block w-16">Duración:</div>
                    <div className="flex flex-col items-center md:items-center">
                      <span className="text-sm font-extrabold text-text-dark bg-[#e9e5db]/60 border border-card-border px-3 py-1 rounded-lg font-mono">
                        {formatHoursMinutes(entry.totalHours)}
                      </span>
                      {entry.editedManually && (
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100/40 px-1.5 py-0.5 rounded-full mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" />
                          <span>Auditado</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button
                      disabled={entry.status !== 'completed' || !isAdmin}
                      onClick={() => handleEditClick(entry)}
                      className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold transition-all ${entry.status === 'completed' && isAdmin
                        ? 'border-card-border bg-white text-text-dark hover:bg-gray-50 cursor-pointer'
                        : 'border-transparent text-text-muted opacity-50 cursor-not-allowed'
                        }`}
                      title={
                        !isAdmin
                          ? 'Solo los administradores pueden editar registros'
                          : entry.status !== 'completed'
                            ? 'No se puede editar una jornada activa'
                            : 'Editar jornada'
                      }
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Entry Modal Dialog (RF-009) */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="bg-[#faf8f5] border border-card-border max-w-md w-full rounded-[2rem] p-8 shadow-2xl relative animate-scaleUp"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-text-dark flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-accent-gold" />
                <span>Editar Jornada ({format(parseISO(editingEntry.date), 'dd/MM/yyyy')})</span>
              </h2>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="p-1 hover:bg-[#e9e5db] rounded-full transition-all text-text-muted hover:text-text-dark"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Audit warning indicator */}
            <div className="mb-5 p-3.5 bg-amber-50/70 border border-amber-100 rounded-2xl flex gap-3 text-xs text-amber-700">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
              <div className="flex flex-col">
                <span className="font-bold">Advertencia de Auditoría</span>
                <span className="mt-0.5 leading-relaxed">
                  Esta modificación quedará guardada de forma permanente en Google Sheets con la bandera de auditoría <strong>edited_manually</strong> en verdadero.
                </span>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5 pl-1">
                  Hora de Entrada:
                </label>
                <input
                  type="datetime-local"
                  required
                  value={editClockIn}
                  onChange={(e) => setEditClockIn(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full text-sm font-semibold text-text-dark bg-white border border-card-border p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-accent-gold disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5 pl-1">
                  Hora de Salida:
                </label>
                <input
                  type="datetime-local"
                  required
                  value={editClockOut}
                  onChange={(e) => setEditClockOut(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full text-sm font-semibold text-text-dark bg-white border border-card-border p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-accent-gold disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="flex-1 py-3 bg-white border border-card-border hover:bg-gray-50 text-text-dark rounded-full text-sm font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 bg-nav-active hover:bg-black disabled:bg-gray-400 text-white rounded-full text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Guardando...' : 'Guardar'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
