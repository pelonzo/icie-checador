import { ShieldCheck, Users, Settings2, BarChart3 } from 'lucide-react';

/**
 * Panel de administración — solo visible para usuarios cuyo correo
 * esté registrado en ADMIN_EMAILS. Por ahora contiene un diseño
 * base con secciones placeholder para futuras funcionalidades.
 */
export function AdminPanel() {
  const sectionCards = [
    {
      id: 'users',
      icon: Users,
      title: 'Gestión de Usuarios',
      description: 'Administra cuentas, roles y permisos del equipo.',
      status: 'Próximamente',
    },
    {
      id: 'reports',
      icon: BarChart3,
      title: 'Reportes Avanzados',
      description: 'Genera reportes de horas por departamento y período.',
      status: 'Próximamente',
    },
    {
      id: 'settings',
      icon: Settings2,
      title: 'Configuración Global',
      description: 'Horarios base, tolerancias y políticas de pausas.',
      status: 'Próximamente',
    },
  ] as const;

  return (
    <div className="flex flex-col gap-6 w-full animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-text-dark tracking-tight mb-1 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-gold-light/60 border border-accent-gold/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-accent-gold-dark" />
            </div>
            Panel de Administración
          </h1>
          <p className="text-sm text-text-muted">
            Herramientas de gestión exclusivas para administradores del sistema.
          </p>
        </div>

        {/* Admin badge */}
        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent-gold-light/40 text-accent-gold-dark border border-accent-gold/30 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5" />
          Acceso Admin
        </span>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sectionCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <div
              key={card.id}
              className="glass-panel p-6 rounded-[2rem] border border-card-border shadow-premium flex flex-col justify-between hover:shadow-card-hover hover:scale-[1.01] transition-all duration-300 relative overflow-hidden min-h-[200px]"
            >
              {/* Background flare */}
              <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-accent-gold/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-accent-gold-light/40 border border-accent-gold/20 flex items-center justify-center">
                  <IconComponent className="w-6 h-6 text-accent-gold-dark" />
                </div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider bg-[#e9e5db]/60 border border-card-border px-2.5 py-1 rounded-full">
                  {card.status}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <h3 className="text-base font-bold text-text-dark">
                  {card.title}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  {card.description}
                </p>
              </div>

              {/* Disabled action area */}
              <button
                disabled
                className="mt-5 w-full py-2.5 bg-[#e9e5db]/40 border border-card-border text-text-muted rounded-full text-xs font-semibold cursor-not-allowed opacity-60"
              >
                En desarrollo
              </button>
            </div>
          );
        })}
      </div>

      {/* Informational banner */}
      <div className="glass-panel p-5 rounded-[2rem] border border-card-border shadow-premium flex items-start gap-4">
        <div className="w-10 h-10 shrink-0 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-text-dark">
            Nota de Seguridad
          </span>
          <p className="text-xs text-text-muted leading-relaxed mt-1">
            Este panel es accesible únicamente para los correos electrónicos autorizados en la configuración del sistema.
            Todas las acciones administrativas quedan registradas con fines de auditoría.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
