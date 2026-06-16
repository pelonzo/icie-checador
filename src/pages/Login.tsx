import { Sparkles, Database } from 'lucide-react';

interface LoginProps {
  onGoogleLogin: () => void;
}

export function Login({ onGoogleLogin }: LoginProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-radial-gradient">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-gold-light/20 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-white/30 rounded-full blur-3xl pointer-events-none" />

      <div className="glass-panel max-w-md w-full rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative border border-card-border overflow-hidden flex flex-col items-center">
        <div className="mb-6 flex items-center gap-1.5 bg-accent-gold-light text-accent-gold-dark px-3.5 py-1 rounded-full text-xs font-bold border border-accent-gold/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Supabase Edition</span>
        </div>

        <div className="flex flex-col items-center mb-8 text-center">
          <img
            src="/logo-icie.webp"
            alt="Logo ICIE"
            className="h-16 w-auto object-contain mx-auto mb-4"
            onError={(e) => { (e.target as HTMLImageElement).src = '/Imagotipo-ICIE.png'; }}
          />
          <h1 className="text-3xl font-extrabold text-text-dark tracking-tight leading-none mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            ICIE Checador
          </h1>
          <p className="text-xs text-text-muted max-w-[280px] leading-relaxed">
            Control de jornada laboral en tiempo real. Inicia sesión con tu cuenta institucional de Google.
          </p>
        </div>

        <button
          onClick={onGoogleLogin}
          className="w-full max-w-[280px] flex items-center justify-center gap-3 bg-white border border-card-border hover:bg-gray-50 text-text-dark font-semibold py-3.5 px-5 rounded-full text-sm shadow-sm transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
        >
          {/* Google icon */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5.04c1.67 0 3.2.58 4.38 1.71l3.27-3.27C17.67 1.54 14.97 1 12 1 7.35 1 3.37 3.65 1.39 7.56l3.86 3C6.18 7.56 8.84 5.04 12 5.04z"/>
            <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.27H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2 3.7-5.01 3.7-8.71z"/>
            <path fill="#FBBC05" d="M5.25 10.56A7.16 7.16 0 0 1 5.04 12c0 .5.07.99.21 1.44l-3.86 3A11.96 11.96 0 0 1 1 12c0-1.85.42-3.6 1.18-5.18l3.07 3.74z"/>
            <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.73-2.89c-1.1.74-2.52 1.18-4.23 1.18-3.16 0-5.82-2.52-6.78-5.52l-3.86 3C3.37 20.35 7.35 23 12 23z"/>
          </svg>
          <span>Acceder con Google (@icie.mx)</span>
        </button>

        <div className="mt-8 border-t border-card-border pt-4 w-full flex items-center justify-center gap-1.5 text-[10px] text-text-muted">
          <Database className="w-3.5 h-3.5 text-green-600" />
          <span>Datos guardados en Supabase PostgreSQL</span>
        </div>
      </div>
    </div>
  );
}

export default Login;
