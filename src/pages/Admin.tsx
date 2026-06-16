import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AdminPanel } from '../components/admin/AdminPanel';
import { EmployeeList } from '../components/admin/EmployeeList';
import { PermisosVacaciones } from '../components/admin/PermisosVacaciones';
import { IncidenciasPanel } from '../components/admin/IncidenciasPanel';
import { isAdminEmail } from '../config/adminRoles';

type AdminSubView = 'dashboard' | 'employees' | 'permisos' | 'incidencias';

interface AdminProps {
  userEmail: string;
  employeeId?: string;
}

export function Admin({ userEmail, employeeId }: AdminProps) {
  const [subView, setSubView] = useState<AdminSubView>('dashboard');
  const isAdmin = isAdminEmail(userEmail);

  if (!isAdmin && !employeeId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-text-muted text-sm font-semibold">Acceso restringido.</p>
      </div>
    );
  }

  // Empleado no-admin: solo ve sus propias solicitudes
  if (!isAdmin) {
    return (
      <PermisosVacaciones
        userEmail={userEmail}
        isAdmin={false}
        employeeId={employeeId}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {subView !== 'dashboard' && (
        <button
          onClick={() => setSubView('dashboard')}
          className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text-dark transition-colors self-start"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver al Panel Admin
        </button>
      )}

      {subView === 'dashboard' && (
        <AdminPanel
          adminEmail={userEmail}
          onNavigate={(view) => setSubView(view as AdminSubView)}
        />
      )}
      {subView === 'employees' && (
        <EmployeeList adminEmail={userEmail} />
      )}
      {subView === 'permisos' && (
        <PermisosVacaciones userEmail={userEmail} isAdmin employeeId={employeeId} />
      )}
      {subView === 'incidencias' && (
        <IncidenciasPanel adminEmail={userEmail} />
      )}
    </div>
  );
}
