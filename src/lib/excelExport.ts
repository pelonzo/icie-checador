// ============================================================
// Exportador Excel formato Pandapé — ICIE Checador
// Genera dos hojas: "Incidencias ICIE" y "Resumen Descuentos"
// ============================================================

import * as XLSX from 'xlsx';
import type { MonthlyIncidenciaSummary, Incidencia } from '../types/admin';

function getPeriodLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const months = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
  ];
  const startM = m === 1 ? 12 : m - 1;
  const startY = m === 1 ? y - 1 : y;
  return `${months[startM - 1]} 27 - ${months[m - 1]} 26, ${y}`;
}

export function exportIncidenciasExcel(
  period: string,
  summary: MonthlyIncidenciaSummary[],
  incidencias: Incidencia[]
): void {
  const wb = XLSX.utils.book_new();
  const periodLabel = getPeriodLabel(period);

  // ── HOJA 1: Incidencias ICIE ────────────────────────────────
  const sheet1: (string | number)[][] = [
    [`Reporte de incidencias ${periodLabel}`],
    ['Institución: ICIE'],
    [],
    [
      'N°', 'Nombre', 'Puesto',
      'Ausencias', 'Incapacidades', 'Vacaciones',
      'Retardos', 'Descuento x retardos',
      'Total No checadas',
      'Permisos Minutos', 'Reposiciones Minutos',
      'Bono Puntualidad', 'Bono Asistencia',
    ],
    ...summary.map((row, i) => [
      i + 1,
      row.employeeName,
      row.position,
      row.ausenciasPSGS,
      row.incapacidades,
      row.vacaciones,
      row.retardos,
      row.descuentoRetardos,
      row.noChecadas,
      row.permisoMinutos,
      row.reposicionMinutos,
      row.bonoPuntualidad ? 250 : 0,
      row.bonoAsistencia  ? 250 : 0,
    ]),
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1);
  ws1['!cols'] = [
    { wch: 4 },  // N°
    { wch: 28 }, // Nombre
    { wch: 22 }, // Puesto
    { wch: 10 }, // Ausencias
    { wch: 13 }, // Incapacidades
    { wch: 11 }, // Vacaciones
    { wch: 9 },  // Retardos
    { wch: 20 }, // Desc. x retardos
    { wch: 17 }, // No checadas
    { wch: 17 }, // Permisos Min
    { wch: 21 }, // Repos. Min
    { wch: 16 }, // Bono Punt.
    { wch: 15 }, // Bono Asist.
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Incidencias ICIE');

  // ── HOJA 2: Resumen Descuentos ──────────────────────────────
  // Agrupar incidencias por empleado, excluyendo bonos
  const byEmp: Record<string, {
    retardos:   string[];
    faltas:     string[];
    noChecadas: string[];
  }> = {};

  for (const inc of incidencias) {
    if (inc.type === 'bono_puntualidad') continue;
    if (!byEmp[inc.employeeId]) {
      byEmp[inc.employeeId] = { retardos: [], faltas: [], noChecadas: [] };
    }
    if (inc.type === 'retardo') {
      byEmp[inc.employeeId].retardos.push(`${inc.date} (${inc.minutes ?? 0}min)`);
    } else if (inc.type === 'ausencia_sj') {
      byEmp[inc.employeeId].faltas.push(inc.date);
    } else if (inc.type === 'no_checada') {
      byEmp[inc.employeeId].noChecadas.push(inc.date);
    }
  }

  const sheet2: (string | number)[][] = [
    ['ID', 'Nombre', 'Retardos (Fechas)', 'Faltas (Fechas)', 'No Checadas (Fechas)'],
  ];

  // Solo empleados con al menos una incidencia en Resumen
  for (const row of summary) {
    const detail = byEmp[row.employeeId];
    if (!detail) continue;
    const hasAny =
      detail.retardos.length   > 0 ||
      detail.faltas.length     > 0 ||
      detail.noChecadas.length > 0;
    if (!hasAny) continue;

    sheet2.push([
      row.employeeId,
      row.employeeName,
      detail.retardos.join(', ')   || '',
      detail.faltas.join(', ')     || '',
      detail.noChecadas.join(', ') || '',
    ]);
  }

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2);
  ws2['!cols'] = [
    { wch: 12 }, // ID
    { wch: 28 }, // Nombre
    { wch: 55 }, // Retardos
    { wch: 45 }, // Faltas
    { wch: 45 }, // No Checadas
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumen Descuentos');

  // Descargar el archivo
  XLSX.writeFile(wb, `Incidencias_${period}.xlsx`);
}
