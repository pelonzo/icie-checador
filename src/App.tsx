import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useTimeTracking } from './hooks/useTimeTracking';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { History } from './pages/History';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { MisPermisos } from './pages/MisPermisos';
import { Loader2 } from 'lucide-react';
import { isAdminEmail } from './config/adminRoles';

export function App() {
  const { user, isLoading: isAuthLoading, loginWithGoogle, logout } = useAuth();

  const {
    entries,
    pauses,
    activeEntry,
    activePause,
    activeEntryPauses,
    isLoading: isTrackingLoading,
    clockIn,
    clockOut,
    startPause,
    endPause,
    editEntryManual,
  } = useTimeTracking(user?.id);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'permisos' | 'admin'>('dashboard');
  const isAdmin = isAdminEmail(user?.email);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-radial-gradient p-4">
        <div className="glass-panel p-8 rounded-[2rem] shadow-xl flex flex-col items-center text-center max-w-xs w-full border border-card-border">
          <Loader2 className="w-8 h-8 animate-spin text-accent-gold-dark mb-3" />
          <span className="text-sm font-bold text-text-dark">Iniciando aplicación</span>
          <span className="text-[10px] text-text-muted mt-1">Verificando sesión...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onGoogleLogin={loginWithGoogle} />;
  }

  return (
    <Layout
      user={user}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={logout}
      hasActiveEntry={!!activeEntry}
    >
      {isTrackingLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-accent-gold-dark mb-3" />
          <span className="text-xs font-bold text-text-muted">Cargando datos de jornada...</span>
        </div>
      ) : activeTab === 'dashboard' ? (
        <Dashboard
          user={user}
          entries={entries}
          pauses={pauses}
          activeEntry={activeEntry}
          activePause={activePause}
          activeEntryPauses={activeEntryPauses}
          clockIn={clockIn}
          clockOut={clockOut}
          startPause={startPause}
          endPause={endPause}
          onNavigatePermisos={() => setActiveTab('permisos')}
        />
      ) : activeTab === 'history' ? (
        <History
          entries={entries}
          onEditEntry={editEntryManual}
          isAdmin={isAdmin}
        />
      ) : activeTab === 'permisos' ? (
        <MisPermisos userEmail={user.email} />
      ) : isAdmin ? (
        <Admin userEmail={user.email} />
      ) : null}
    </Layout>
  );
}

export default App;
