import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Download,
  RefreshCw,
  Calculator,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  User,
} from 'lucide-react';
import {
  getMonthlyReport,
  getIncidencias,
  calculatePeriodIncidencias,
} from '../../lib/adminApi';
import type { MonthlyIncidenciaSummary, Incidencia } from '../../types/admin';
import { INCIDENCIA_LABELS } from '../../types/admin';
import { format, parseISO, subMonths, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

interface IncidenciasPanelProps {
  adminEmail: string;
}

function getPeriodLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const end   = new Date(y, m - 1, 26);
  const start = new Date(y, m - 2, 27);
  return `27 ${format(start, 'MMM', { locale: es })} – 26 ${format(end, 'MMM yyyy', { locale: es })}`;
}

function currentPeriod(): string {
  const now = new Date();
  const day = now.getDate();
  const y   = now.getFullYear();
  const m   = day >= 27 ? now.getMonth() + 1 : now.getMonth();
  const realM = m === 0 ? 12 : m;
  const realY = m === 0 ? y - 1 : y;
  return `${realY}-${String(realM).padStart(2, '0')}`;
}

function navigatePeriod(period: string, direction: 1 | -1): string {
  const [y, m] = period.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  const next = direction === 1 ? addMonths(date, 1) : subMonths(date, 1);
  return format(next, 'yyyy-MM');
}

type ViewMode = 'summary' | 'detail';

export function IncidenciasPanel({ adminEmail }: IncidenciasPanelProps) {
  const [period, setPeriod]   = useState(currentPeriod());
  const [mode, setMode]       = useState<ViewMode>('summary');
  const [summary, setSummary] = useState<MonthlyIncidenciaSummary[]>([]);
  const [detail, setDetail]   = useState<Incidencia[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [calcResult, setCalcResult]   = useState<{ created: number; updated: number } | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMonthlyReport(period);
      setSummary(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  const loadDetail = useCallback(async (employeeId?: string) => {
    setLoading(true);
    try {
      const data = await getIncidencias(period, employeeId);
      setDetail(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (mode === 'summary') {
      loadSummary();
    } else {
      loadDetail(selectedEmployee ?? undefined);
    }
  }, [mode, period, selectedEmployee, loadSummary, loadDetail]);

  const handleCalculate = async () => {
    setCalculating(true);
    setCalcResult(null);
    try {
      const res = await calculatePeriodIncidencias(adminEmail, period);
      setCalcResult(res);
      await loadSummary();
    } catch (err) {
      alert('Error al calcular incidencias. Revisa la consola.');
      console.error(err);
    } finally {
      setCalculating(false);
    }
  };

  const exportCSV = () => {
    const headers = ['ID', 'Nombre', 'Departamento', 'Puesto', 'Aus. PSGS', 'Incap.', 'Vacaciones', 'Retardos', 'Min. Retardo', 'Aus. SJ', 'No Checadas', 'Permisos Días', 'Desc. Ret.', 'Desc. Aus.', 'Bono'];
    const rows = summary.map((r) => [
      r.employeeId, r.employeeName, r.department, r.position,
      r.ausenciasPSGS, r.incapacidades, r.vacaciones,
      r.retardos, r.retardoMinutos, r.ausenciasSJ, r.noChecadas,
      r.permisosDias, r.descuentoRetardos, r.descuentoAusencias,
      r.bonoPuntualidad ? 'SI' : 'NO',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Incidencias_${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totals = summary.reduce(
    (acc, r) => ({
      retardos:   acc.retardos   + r.retardos,
      ausenciasSJ: acc.ausenciasSJ + r.ausenciasSJ,
      vacaciones:  acc.vacaciones  + r.vacaciones,
      noChecadas:  acc.noChecadas  + r.noChecadas,
      bono:        acc.bono        + (r.bonoPuntualidad ? 1 : 0),
    }),
    { retardos: 0, ausenciasSJ: 0, vacaciones: 0, noChecadas: 0, bono: 0 }
  );

  return (
    <div className="flex flex-col gap-6 w-full animate-fadeIn">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-text-dark tracking-tight mb-1">Incidencias</h1>
          <p className="text-sm text-text-muted">Reporte mensual de retardos, ausencias, vacaciones y puntualidad.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleCalculate}
            disabled={calculating}
            className="flex items-center gap-2 px-4 py-2.5 border border-card-border bg-white hover:bg-gray-50 text-text-dark rounded-full text-sm font-semibold transition-all disabled:opacity-50"
          >
            {calculating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />}
            {calculating ? 'Calculando...' : 'Recalcular'}
          </button>
          <button
            onClick={exportCSV}
            disabled={summary.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-nav-active hover:bg-black disabled:bg-gray-300 text-white rounded-full text-sm font-semibold shadow-md transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {calcResult && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-100 text-green-700 text-sm font-semibold px-5 py-3.5 rounded-2xl">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Cálculo completado: {calcResult.created} incidencias nuevas, {calcResult.updated} actualizadas.
        </div>
      )}

      {/* Navegación de período */}
      <div className="glass-panel p-4 rounded-[1.75rem] border border-card-border flex items-center justify-between gap-4">
        <button onClick={() => setPeriod((p) => navigatePeriod(p, -1))} className="p-2 hover:bg-[#e9e5db] rounded-xl transition-all">
          <ChevronLeft className="w-4 h-4 text-text-dark" />
        </button>
        <div className="text-center">
          <p className="text-base font-extrabold text-text-dark">{getPeriodLabel(period)}</p>
          <p className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">Período de nómina 27–26</p>
        </div>
        <button
          onClick={() => setPeriod((p) => navigatePeriod(p, 1))}
          disabled={period >= currentPeriod()}
          className="p-2 hover:bg-[#e9e5db] rounded-xl transition-all disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4 text-text-dark" />
        </button>
      </div>

      {/* Tabs */}
      <div className="glass-panel p-1.5 rounded-2xl border border-card-border inline-flex gap-1 self-start">
        {(['summary', 'detail'] as ViewMode[]).map((v) => (
          <button
            key={v}
            onClick={() => { setMode(v); setSelectedEmployee(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === v ? 'bg-nav-active text-white shadow' : 'text-text-muted hover:text-text-dark'
            }`}
          >
            {v === 'summary' ? 'Resumen Mensual' : 'Detalle por Día'}
          </button>
        ))}
      </div>

      {/* Totales rápidos */}
      {mode === 'summary' && !loading && summary.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Retardos',    value: totals.retardos,   color: 'text-red-500'   },
            { label: 'Ausencias SJ', value: totals.ausenciasSJ, color: 'text-red-700' },
            { label: 'Vacaciones',  value: totals.vacaciones,  color: 'text-blue-600' },
            { label: 'No Checadas', value: totals.noChecadas,  color: 'text-amber-600' },
            { label: 'Con Bono',    value: `${totals.bono}/${summary.length}`, color: 'text-green-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-panel p-4 rounded-2xl border border-card-border text-center">
              <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
              <p className="text-[10px] text-text-muted uppercase tracking-wider mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla resumen */}
      {mode === 'summary' && (
        <div className="glass-panel rounded-[2rem] border border-card-border shadow-premium overflow-hidden">
          {loading ? (
            <div className="p-12 flex items-center justify-center gap-3 text-text-muted text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" /> Cargando...
            </div>
          ) : summary.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <AlertTriangle className="w-12 h-12 text-text-muted/30 mb-3" />
              <p className="text-sm font-bold text-text-muted">Sin datos para este período</p>
              <p className="text-xs text-text-muted/60 mt-1">Usa "Recalcular" para generar las incidencias.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]">
                <thead>
                  <tr className="bg-[#e9e5db]/30 text-text-muted uppercase tracking-wider text-[10px] font-bold">
                    <th className="text-left px-5 py-3 sticky left-0 bg-[#e9e5db]/30">Colaborador</th>
                    <th className="px-3 py-3 text-center">Aus. PSGS</th>
                    <th className="px-3 py-3 text-center">Incap.</th>
                    <th className="px-3 py-3 text-center">Vacac.</th>
                    <th className="px-3 py-3 text-center">Retardos</th>
                    <th className="px-3 py-3 text-center">Min.</th>
                    <th className="px-3 py-3 text-center">Aus. SJ</th>
                    <th className="px-3 py-3 text-center">No Chec.</th>
                    <th className="px-3 py-3 text-center">Desc. Ret.</th>
                    <th className="px-3 py-3 text-center">Desc. Aus.</th>
                    <th className="px-3 py-3 text-center">Bono</th>
                    <th className="px-3 py-3 text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {summary.map((row) => (
                    <tr key={row.employeeId} className="hover:bg-white/40 transition-colors">
                      <td className="px-5 py-3.5 sticky left-0 bg-transparent">
                        <p className="font-bold text-text-dark">{row.employeeName}</p>
                        <p className="text-text-muted">{row.department}</p>
                      </td>
                      <td className="px-3 py-3.5 text-center font-semibold text-text-dark">{row.ausenciasPSGS || '–'}</td>
                      <td className="px-3 py-3.5 text-center font-semibold text-text-dark">{row.incapacidades || '–'}</td>
                      <td className={`px-3 py-3.5 text-center font-bold ${row.vacaciones > 0 ? 'text-blue-600' : 'text-text-muted'}`}>{row.vacaciones || '–'}</td>
                      <td className={`px-3 py-3.5 text-center font-bold ${row.retardos > 0 ? 'text-red-500' : 'text-text-muted'}`}>{row.retardos || '–'}</td>
                      <td className="px-3 py-3.5 text-center text-text-muted">{row.retardoMinutos > 0 ? `${row.retardoMinutos}m` : '–'}</td>
                      <td className={`px-3 py-3.5 text-center font-bold ${row.ausenciasSJ > 0 ? 'text-red-700' : 'text-text-muted'}`}>{row.ausenciasSJ || '–'}</td>
                      <td className={`px-3 py-3.5 text-center font-bold ${row.noChecadas > 0 ? 'text-amber-600' : 'text-text-muted'}`}>{row.noChecadas || '–'}</td>
                      <td className="px-3 py-3.5 text-center text-text-muted">{row.descuentoRetardos > 0 ? row.descuentoRetardos.toFixed(2) : '–'}</td>
                      <td className="px-3 py-3.5 text-center text-text-muted">{row.descuentoAusencias > 0 ? row.descuentoAusencias.toFixed(2) : '–'}</td>
                      <td className="px-3 py-3.5 text-center">
                        {row.bonoPuntualidad
                          ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                          : <XCircle className="w-4 h-4 text-text-muted/30 mx-auto" />
                        }
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <button
                          onClick={() => { setSelectedEmployee(row.employeeId); setMode('detail'); }}
                          className="text-[10px] font-bold text-text-muted hover:text-text-dark border border-card-border bg-white hover:bg-gray-50 px-2.5 py-1.5 rounded-lg transition-all"
                        >
                          Ver →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Vista detalle */}
      {mode === 'detail' && (
        <div className="flex flex-col gap-4">
          <div className="glass-panel p-4 rounded-[1.75rem] border border-card-border flex items-center gap-3 flex-wrap">
            <User className="w-4 h-4 text-text-muted shrink-0" />
            <select
              value={selectedEmployee ?? ''}
              onChange={(e) => setSelectedEmployee(e.target.value || null)}
              className="text-sm font-semibold text-text-dark bg-transparent border-none outline-none flex-1 min-w-[180px]"
            >
              <option value="">— Todos los colaboradores —</option>
              {summary.map((r) => (
                <option key={r.employeeId} value={r.employeeId}>{r.employeeName}</option>
              ))}
            </select>
          </div>

          <div className="glass-panel rounded-[2rem] border border-card-border shadow-premium overflow-hidden">
            {loading ? (
              <div className="p-12 flex items-center justify-center gap-3 text-text-muted text-sm">
                <RefreshCw className="w-4 h-4 animate-spin" /> Cargando...
              </div>
            ) : detail.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle className="w-12 h-12 text-green-300 mb-3 mx-auto" />
                <p className="text-sm font-bold text-text-muted">Sin incidencias en el período</p>
              </div>
            ) : (
              <>
                <div className="hidden md:grid grid-cols-12 gap-3 px-6 py-3 bg-[#e9e5db]/30 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  <span className="col-span-2">Fecha</span>
                  <span className="col-span-3">Colaborador</span>
                  <span className="col-span-3">Tipo</span>
                  <span className="col-span-2 text-center">Minutos</span>
                  <span className="col-span-2 text-right">Origen</span>
                </div>
                <div className="divide-y divide-card-border">
                  {detail.map((inc) => (
                    <div key={inc.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 px-6 py-4 items-center hover:bg-white/40 transition-colors">
                      <div className="col-span-2 text-sm font-bold text-text-dark">
                        {format(parseISO(inc.date), 'dd/MM/yyyy')}
                        <span className="text-[10px] text-text-muted block">
                          {format(parseISO(inc.date), 'EEEE', { locale: es })}
                        </span>
                      </div>
                      <div className="col-span-3 text-sm font-semibold text-text-dark">
                        {inc.employeeName ?? inc.employeeId}
                      </div>
                      <div className="col-span-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                          inc.type === 'retardo'            ? 'text-red-600 bg-red-50 border-red-100'
                          : inc.type === 'ausencia_sj'     ? 'text-red-800 bg-red-50 border-red-100'
                          : inc.type === 'no_checada'      ? 'text-amber-700 bg-amber-50 border-amber-100'
                          : inc.type === 'bono_puntualidad' ? 'text-green-700 bg-green-50 border-green-100'
                          : 'text-blue-700 bg-blue-50 border-blue-100'
                        }`}>
                          {INCIDENCIA_LABELS[inc.type]}
                        </span>
                      </div>
                      <div className="col-span-2 text-center font-mono font-bold text-text-dark">
                        {inc.minutes ? `+${inc.minutes}m` : '—'}
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <span className="text-[10px] font-semibold text-text-muted border border-card-border bg-white/60 px-2 py-1 rounded-lg">
                          {inc.source === 'auto' ? 'Automático' : 'Manual'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
