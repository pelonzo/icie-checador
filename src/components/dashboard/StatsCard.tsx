import { Clock, Coffee, Sparkles, RefreshCw } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  progress?: number; // 0 a 100 para barra de progreso
  iconType: 'clock' | 'coffee' | 'sync' | 'default';
  progressColor?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  progress,
  iconType,
  progressColor = 'bg-accent-gold'
}: StatsCardProps) {
  const getIcon = () => {
    switch (iconType) {
      case 'clock':
        return <Clock className="w-5 h-5 text-accent-gold-dark" />;
      case 'coffee':
        return <Coffee className="w-5 h-5 text-amber-600" />;
      case 'sync':
        return <RefreshCw className="w-5 h-5 text-green-600" />;
      default:
        return <Sparkles className="w-5 h-5 text-blue-600" />;
    }
  };

  const getIconBg = () => {
    switch (iconType) {
      case 'clock':
        return 'bg-accent-gold-light/60 border-accent-gold/20';
      case 'coffee':
        return 'bg-amber-50 border-amber-100';
      case 'sync':
        return 'bg-green-50 border-green-100';
      default:
        return 'bg-blue-50 border-blue-100';
    }
  };

  return (
    <div className="glass-panel p-6 rounded-[2rem] border border-card-border shadow-premium flex flex-col justify-between hover:shadow-card-hover hover:scale-[1.01] transition-all duration-300 relative overflow-hidden">
      {/* Background flare */}
      <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
          {title}
        </span>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${getIconBg()}`}>
          {getIcon()}
        </div>
      </div>

      <div className="flex flex-col">
        <span className="text-3xl font-extrabold text-text-dark tracking-tight leading-none mb-1">
          {value}
        </span>
        {subtitle && (
          <span className="text-xs text-text-muted font-medium">
            {subtitle}
          </span>
        )}
      </div>

      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between text-[10px] font-bold text-text-muted mb-1">
            <span>Progreso Semanal</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-[#e9e5db] rounded-full overflow-hidden border border-white/50">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${progressColor}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
export default StatsCard;
