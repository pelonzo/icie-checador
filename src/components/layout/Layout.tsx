import React, { useState } from 'react';
import { Settings, Bell, LogOut, ShieldAlert, ShieldCheck } from 'lucide-react';
import { type UserProfile } from '../../hooks/useAuth';
import { isAdminEmail } from '../../config/adminRoles';

interface LayoutProps {
  children: React.ReactNode;
  user: UserProfile;
  activeTab: 'dashboard' | 'history' | 'admin';
  setActiveTab: (tab: 'dashboard' | 'history' | 'admin') => void;
  onLogout: () => void;
  hasActiveEntry: boolean;
}

export function Layout({
  children,
  user,
  activeTab,
  setActiveTab,
  onLogout,
  hasActiveEntry
}: LayoutProps) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const isAdmin = isAdminEmail(user.email);

  const handleLogoutClick = () => {
    if (hasActiveEntry) {
      setShowLogoutModal(true);
    } else {
      onLogout();
    }
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    onLogout();
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 lg:p-8 max-w-[1440px] mx-auto w-full">
      {/* Header / Top Navigation Bar */}
      <header className="flex items-center justify-between w-full mb-6 glass-panel py-3 px-6 rounded-full shadow-premium">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="font-bold text-2xl tracking-tight text-text-dark flex items-center gap-1.5">
            <img
              src="/logo-icie.webp"
              alt="Logo ICIE"
              className="h-8 md:h-10 w-auto object-contain"
              onError={(e) => { (e.target as HTMLImageElement).src = '/Imagotipo-ICIE.png'; }}
            />
            <span className="text-xs bg-accent-gold-light text-accent-gold-dark font-medium px-2 py-0.5 rounded-md">
              Checador
            </span>
          </div>
        </div>

        {/* Navigation Tabs (Center) */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'dashboard'
              ? 'bg-nav-active text-white shadow-md'
              : 'text-text-muted hover:text-text-dark hover:bg-white/40'
              }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === 'history'
              ? 'bg-nav-active text-white shadow-md'
              : 'text-text-muted hover:text-text-dark hover:bg-white/40'
              }`}
          >
            Historial y Horarios
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 ${activeTab === 'admin'
                ? 'bg-nav-active text-white shadow-md'
                : 'text-text-muted hover:text-text-dark hover:bg-white/40'
                }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Panel Admin
            </button>
          )}
        </nav>

        {/* Right Side Options */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="hidden p-2.5 hover:bg-white/60 rounded-full text-text-muted hover:text-text-dark transition-all border border-transparent hover:border-card-border"
          >
            <Settings className="w-5 h-5" />
          </button>

          <div className="relative">
            <button className="p-2.5 hover:bg-white/60 rounded-full text-text-muted hover:text-text-dark transition-all border border-transparent hover:border-card-border relative">
              <Bell className="w-5 h-5" />
              {hasActiveEntry && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>
          </div>

          <button
            onClick={handleLogoutClick}
            className="p-2.5 hover:bg-red-50/80 rounded-full text-text-muted hover:text-red-600 transition-all border border-transparent hover:border-red-100"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>

          {/* User Profile Avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-card-border">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="w-10 h-10 rounded-full object-cover border-2 border-accent-gold/40 shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-accent-gold-light text-accent-gold-dark border-2 border-accent-gold/30 flex items-center justify-center font-bold">
                {user.fullName.charAt(0)}
              </div>
            )}
            <span className="hidden lg:inline text-sm font-semibold text-text-dark max-w-[120px] truncate">
              {user.fullName}
            </span>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6 p-5 glass-panel rounded-3xl shadow-premium animate-fadeIn">
          <h3 className="text-base font-bold mb-2">Configuración del Sistema</h3>
          <p className="text-xs text-text-muted mb-4">
            Backend: Supabase PostgreSQL · Auth: Google OAuth vía Supabase.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-semibold text-text-muted">Supabase URL:</span>
              <code className="text-xs break-all block bg-white/50 p-2 rounded-lg mt-1 border border-card-border">
                {import.meta.env.VITE_SUPABASE_URL || 'No configurado'}
              </code>
            </div>
            <div>
              <span className="block text-xs font-semibold text-text-muted">Usuario activo:</span>
              <code className="text-xs break-all block bg-white/50 p-2 rounded-lg mt-1 border border-card-border">
                {user.email}
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Navigation tabs for mobile screen sizes */}
      <div className="md:hidden flex gap-1 p-1 bg-[#e9e5db] rounded-full mb-6 max-w-sm mx-auto w-full">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 text-center py-2 rounded-full text-xs font-bold transition-all ${activeTab === 'dashboard' ? 'bg-nav-active text-white' : 'text-text-muted'
            }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 text-center py-2 rounded-full text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-nav-active text-white' : 'text-text-muted'
            }`}
        >
          Historial
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex-1 text-center py-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1 ${activeTab === 'admin' ? 'bg-nav-active text-white' : 'text-text-muted'
              }`}
          >
            <ShieldCheck className="w-3 h-3" />
            Admin
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Warning Sign-out Modal (RF-003) */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#faf8f5] border border-card-border max-w-md w-full rounded-[2rem] p-8 shadow-2xl relative animate-scaleUp">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-100">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-text-dark mb-2">¡Jornada de Trabajo Activa!</h2>
              <p className="text-sm text-text-muted leading-relaxed mb-6">
                Tienes un registro horario activo (estado "En trabajo" o "En pausa"). Si cierras sesión, tu jornada seguirá registrándose localmente, pero se recomienda marcar tu salida antes de salir.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-3 bg-white border border-card-border hover:bg-gray-50 text-text-dark rounded-full text-sm font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-semibold shadow-md shadow-red-200 transition-all"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
