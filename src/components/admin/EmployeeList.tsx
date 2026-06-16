import { useState, useEffect } from 'react';
import {
  Users, Plus, Search, RefreshCw, Edit3, UserCheck, UserX, X, Save,
} from 'lucide-react';
import { getEmployees, addEmployee, updateEmployee } from '../../lib/adminApi';
import type { Employee, EmployeeStatus } from '../../types/admin';

interface EmployeeListProps {
  adminEmail: string;
}

type FormMode = 'add' | 'edit' | null;

const DEPARTMENTS = [
  'Desarrollo Académico', 'Contabilidad', 'Comercial',
  'Intendencia y Mantenimiento', 'Recursos Humanos', 'Dirección', 'TI', 'Otro',
];

const emptyForm = (): Omit<Employee, 'createdAt'> => ({
  id: '', fullName: '', preferredName: '', lastName: '',
  position: '', department: DEPARTMENTS[0], scheduleLabel: 'L a V 08:00-17:00',
  entryTime: '08:00', toleranceMinutes: 10, hiredAt: '',
  vacationManager: '', status: 'active', userEmail: '', vacationBalance: 0,
});

export function EmployeeList({ adminEmail: _adminEmail }: EmployeeListProps) {
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState<EmployeeStatus | ''>('active');
  const [formMode, setFormMode]     = useState<FormMode>(null);
  const [form, setForm]             = useState<Omit<Employee, 'createdAt'>>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setEmployees(await getEmployees());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = employees.filter((e) => {
    const matchSearch = !search || e.fullName.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase());
    const matchDept   = !filterDept   || e.department === filterDept;
    const matchStatus = !filterStatus || e.status === filterStatus;
    return matchSearch && matchDept && matchStatus;
  });

  const openAdd  = () => { setForm(emptyForm()); setFormMode('add'); };
  const openEdit = (emp: Employee) => { setForm(emp); setFormMode('edit'); };
  const closeForm = () => setFormMode(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (formMode === 'add') {
        await addEmployee(form);
      } else if (formMode === 'edit') {
        await updateEmployee(form.id, form);
      }
      closeForm();
      await load();
    } catch (err) {
      alert('Error al guardar el colaborador.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (emp: Employee) => {
    const newStatus: EmployeeStatus = emp.status === 'active' ? 'inactive' : 'active';
    try {
      await updateEmployee(emp.id, { status: newStatus });
      await load();
    } catch {
      alert('Error al cambiar el estado.');
    }
  };

  const fieldCls = 'w-full text-sm font-semibold text-text-dark bg-white border border-card-border p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-accent-gold';
  const labelCls = 'block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5';

  return (
    <div className="flex flex-col gap-6 w-full animate-fadeIn">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-text-dark tracking-tight mb-1">Colaboradores</h1>
          <p className="text-sm text-text-muted">Alta, baja y edición de empleados registrados.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 px-4 py-2.5 border border-card-border bg-white hover:bg-gray-50 text-text-dark rounded-full text-sm font-semibold transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-nav-active hover:bg-black text-white rounded-full text-sm font-semibold shadow-md transition-all active:scale-95 cursor-pointer">
            <Plus className="w-4 h-4" /> Nuevo Colaborador
          </button>
        </div>
      </div>

      <div className="glass-panel p-4 rounded-[1.75rem] border border-card-border flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-card-border rounded-xl px-3.5 py-2 flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-text-muted" />
          <input
            type="text" placeholder="Buscar por nombre o ID..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="text-sm text-text-dark bg-transparent border-none outline-none w-full placeholder:text-text-muted/50"
          />
        </div>
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="text-xs font-semibold text-text-dark bg-white border border-card-border px-3 py-2 rounded-xl focus:outline-none">
          <option value="">Todos los dptos.</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as EmployeeStatus | '')} className="text-xs font-semibold text-text-dark bg-white border border-card-border px-3 py-2 rounded-xl focus:outline-none">
          <option value="">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      <div className="glass-panel rounded-[2rem] border border-card-border shadow-premium overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center gap-3 text-text-muted text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" /> Cargando colaboradores...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Users className="w-12 h-12 text-text-muted/30 mb-3" />
            <p className="text-sm font-bold text-text-muted">No se encontraron colaboradores</p>
          </div>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-12 gap-3 px-6 py-3 bg-[#e9e5db]/30 text-[10px] font-bold text-text-muted uppercase tracking-wider">
              <span className="col-span-1">ID</span>
              <span className="col-span-3">Nombre</span>
              <span className="col-span-2">Puesto</span>
              <span className="col-span-2">Departamento</span>
              <span className="col-span-2 text-center">Horario</span>
              <span className="col-span-1 text-center">Estado</span>
              <span className="col-span-1 text-right">Acciones</span>
            </div>
            <div className="divide-y divide-card-border">
              {filtered.map((emp) => (
                <div key={emp.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 px-6 py-4 items-center hover:bg-white/40 transition-colors">
                  <div className="col-span-1">
                    <span className="text-[10px] font-extrabold text-text-muted bg-[#e9e5db]/60 border border-card-border px-2 py-0.5 rounded-md font-mono">{emp.id}</span>
                  </div>
                  <div className="col-span-3">
                    <p className="text-sm font-bold text-text-dark">{emp.fullName}</p>
                    <p className="text-xs text-text-muted">{emp.userEmail}</p>
                  </div>
                  <div className="col-span-2 text-xs font-semibold text-text-dark">{emp.position}</div>
                  <div className="col-span-2 text-xs text-text-muted">{emp.department}</div>
                  <div className="col-span-2 text-center text-xs font-mono text-text-dark">{emp.entryTime}</div>
                  <div className="col-span-1 flex justify-center">
                    <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${emp.status === 'active' ? 'text-green-700 bg-green-50 border-green-100' : 'text-text-muted bg-gray-50 border-gray-100'}`}>
                      {emp.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="col-span-1 flex justify-end gap-1.5">
                    <button onClick={() => openEdit(emp)} className="p-1.5 border border-card-border bg-white hover:bg-gray-50 rounded-lg transition-all" title="Editar">
                      <Edit3 className="w-3.5 h-3.5 text-text-dark" />
                    </button>
                    <button onClick={() => toggleStatus(emp)} className="p-1.5 border border-card-border bg-white hover:bg-gray-50 rounded-lg transition-all" title={emp.status === 'active' ? 'Dar de baja' : 'Reactivar'}>
                      {emp.status === 'active' ? <UserX className="w-3.5 h-3.5 text-red-500" /> : <UserCheck className="w-3.5 h-3.5 text-green-500" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {formMode && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSubmit} className="bg-[#faf8f5] border border-card-border max-w-2xl w-full rounded-[2rem] p-8 shadow-2xl flex flex-col gap-5 my-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-text-dark flex items-center gap-2">
                {formMode === 'add' ? <><Plus className="w-5 h-5 text-green-500" /> Nuevo Colaborador</> : <><Edit3 className="w-5 h-5 text-amber-500" /> Editar Colaborador</>}
              </h2>
              <button type="button" onClick={closeForm} className="text-text-muted hover:text-text-dark transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className={labelCls}>ID Empleado (DEPT-NNNN)</label>
                <input required value={form.id} onChange={(e) => setForm((f) => ({ ...f, id: e.target.value.toUpperCase() }))} placeholder="Ej. ACAD-0010" className={fieldCls} disabled={formMode === 'edit'} />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className={labelCls}>Departamento</label>
                <select value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className={fieldCls}>
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Nombre Completo</label>
                <input required value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Nombre completo oficial" className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Nombre Preferido</label>
                <input value={form.preferredName} onChange={(e) => setForm((f) => ({ ...f, preferredName: e.target.value }))} placeholder="Como aparece en reportes" className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Primer Apellido</label>
                <input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className={fieldCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Puesto / Área</label>
                <input required value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Correo Google (login)</label>
                <input type="email" required value={form.userEmail} onChange={(e) => setForm((f) => ({ ...f, userEmail: e.target.value }))} placeholder="usuario@icie.mx" className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Fecha de Contratación</label>
                <input type="date" required value={form.hiredAt} onChange={(e) => setForm((f) => ({ ...f, hiredAt: e.target.value }))} className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Hora de Entrada Oficial</label>
                <input type="time" required value={form.entryTime} onChange={(e) => setForm((f) => ({ ...f, entryTime: e.target.value }))} className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Tolerancia (minutos)</label>
                <input type="number" min="0" max="30" value={form.toleranceMinutes} onChange={(e) => setForm((f) => ({ ...f, toleranceMinutes: Number(e.target.value) }))} className={fieldCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Descripción del Horario</label>
                <input value={form.scheduleLabel} onChange={(e) => setForm((f) => ({ ...f, scheduleLabel: e.target.value }))} placeholder="Ej. L a V 08:00-17:00" className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Gestor de Vacaciones (email)</label>
                <input type="email" value={form.vacationManager} onChange={(e) => setForm((f) => ({ ...f, vacationManager: e.target.value }))} className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Días de Vacaciones Disponibles</label>
                <input type="number" min="0" value={form.vacationBalance} onChange={(e) => setForm((f) => ({ ...f, vacationBalance: Number(e.target.value) }))} className={fieldCls} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeForm} className="flex-1 py-3 bg-white border border-card-border hover:bg-gray-50 text-text-dark rounded-full text-sm font-semibold transition-all">Cancelar</button>
              <button type="submit" disabled={submitting} className="flex-1 py-3 bg-nav-active hover:bg-black disabled:bg-gray-400 text-white rounded-full text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-2">
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {submitting ? 'Guardando...' : 'Guardar Colaborador'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
