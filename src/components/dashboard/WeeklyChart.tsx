import { useState, useMemo } from 'react';
import { type LocalTimeEntry, type LocalPause } from '../../lib/db';
import { calculateWorkedHours, formatHoursMinutes } from '../../utils/calculations';
import { 
  startOfWeek, 
  addDays, 
  format 
} from 'date-fns';
import { es } from 'date-fns/locale';

interface WeeklyChartProps {
  entries: LocalTimeEntry[];
  pauses: LocalPause[];
}

interface DayData {
  dayName: string; // e.g., "L"
  dateStr: string; // YYYY-MM-DD
  hours: number;
  label: string; // e.g., "5h 23m"
}

export function WeeklyChart({ entries, pauses }: WeeklyChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Obtener los datos de los 7 días de la semana actual (comenzando en Lunes)
  const chartData = useMemo(() => {
    const today = new Date();
    // Comenzamos la semana en lunes (es-ES estándar)
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    
    const days: DayData[] = [];
    
    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(weekStart, i);
      const dateStr = format(dayDate, 'yyyy-MM-dd');
      
      // Encontrar todas las entradas de este día
      const dayEntries = entries.filter(e => e.date === dateStr);
      
      let totalHours = 0;
      
      for (const entry of dayEntries) {
        if (entry.status === 'completed' && entry.totalHours !== null) {
          totalHours += entry.totalHours;
        } else if (entry.status === 'active' || entry.status === 'paused') {
          // Si está activa, calculamos las horas transcurridas hasta ahora
          const dayPauses = pauses.filter(p => p.timeEntryId === entry.id);
          const currentHours = calculateWorkedHours({
            clockIn: entry.clockIn,
            clockOut: new Date().toISOString(), // Salida simulada ahora mismo
            pauses: dayPauses
          });
          totalHours += currentHours;
        }
      }

      // Dar formato a las horas
      const hrsPart = Math.floor(totalHours);
      const minsPart = Math.round((totalHours - hrsPart) * 60);
      const label = totalHours > 0 
        ? `${hrsPart}h ${minsPart.toString().padStart(2, '0')}m`
        : '0h';

      // Nombre del día en español (L, M, M, J, V, S, D)
      const dayLetter = format(dayDate, 'eeeeee', { locale: es }).toUpperCase();

      days.push({
        dayName: dayLetter.substring(0, 1), // tomar primera letra
        dateStr,
        hours: Math.round(totalHours * 100) / 100,
        label
      });
    }
    
    return days;
  }, [entries, pauses]);

  // Horas totales de la semana actual
  const totalHoursThisWeek = useMemo(() => {
    const sum = chartData.reduce((acc, curr) => acc + curr.hours, 0);
    return Math.round(sum * 10) / 10;
  }, [chartData]);

  // Altura máxima para escalar en el gráfico SVG (asumimos 10 horas máximo por defecto)
  const maxChartHours = useMemo(() => {
    const maxVal = Math.max(...chartData.map(d => d.hours));
    return maxVal > 8 ? Math.ceil(maxVal) : 8;
  }, [chartData]);

  return (
    <div className="glass-panel p-6 rounded-[2.5rem] border border-card-border shadow-premium flex flex-col justify-between min-h-[300px] w-full transition-all duration-300 hover:shadow-card-hover">
      {/* Chart Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">Progreso</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-extrabold text-text-dark tracking-tight leading-none">
              {formatHoursMinutes(totalHoursThisWeek)}
            </span>
            <span className="text-xs text-text-muted font-bold">Tiempo esta semana</span>
          </div>
        </div>
        
        {/* Mockup decoration arrow */}
        <div className="w-8 h-8 rounded-full bg-white border border-card-border flex items-center justify-center text-text-dark font-bold text-sm shadow-sm cursor-pointer hover:bg-gray-50">
          ↗
        </div>
      </div>

      {/* SVG Bar Chart Area */}
      <div className="relative flex-1 flex items-end justify-between px-2 h-44">
        {/* Render tooltip above active bar */}
        {hoveredIndex !== null && chartData[hoveredIndex].hours > 0 && (
          <div 
            className="absolute bg-accent-gold text-text-dark text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md border border-accent-gold-dark/20 z-10 -translate-x-1/2 transition-all duration-200 pointer-events-none"
            style={{
              left: `${(hoveredIndex * 14.28) + 7.14}%`,
              bottom: `${Math.min((chartData[hoveredIndex].hours / maxChartHours) * 100 + 12, 100)}%`
            }}
          >
            {chartData[hoveredIndex].label}
          </div>
        )}

        {/* The Bars */}
        {chartData.map((day, idx) => {
          // Altura en porcentaje para el bar fill
          const heightPercent = Math.min((day.hours / maxChartHours) * 100, 100);
          const isHovered = hoveredIndex === idx;

          return (
            <div 
              key={day.dateStr}
              className="flex flex-col items-center flex-1 cursor-pointer group"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Vertical Bar Cylinder */}
              <div className="w-4 h-32 bg-[#e9e5db]/40 rounded-full relative overflow-hidden border border-white/30 flex items-end">
                {/* Bar Fill */}
                <div 
                  className={`w-full rounded-full transition-all duration-500 ease-out ${
                    isHovered 
                      ? 'bg-accent-gold shadow-sm shadow-accent-gold/40' 
                      : 'bg-text-dark'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                ></div>
              </div>

              {/* Day Label */}
              <span className={`text-[10px] font-bold mt-2.5 transition-colors ${
                isHovered ? 'text-accent-gold-dark' : 'text-text-muted'
              }`}>
                {day.dayName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default WeeklyChart;
