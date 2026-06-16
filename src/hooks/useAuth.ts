import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;        // Supabase Auth UUID
  email: string;
  fullName: string;
  avatarUrl: string;
}

export function useAuth() {
  const [user, setUser]       = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mapear sesión de Supabase a perfil local
  function sessionToProfile(session: Session | null): UserProfile | null {
    if (!session?.user) return null;
    const u = session.user;
    const meta = u.user_metadata ?? {};
    return {
      id:       u.id,
      email:    u.email ?? '',
      fullName: meta.full_name ?? meta.name ?? u.email ?? '',
      avatarUrl: meta.avatar_url ?? meta.picture ?? '',
    };
  }

  // Actualiza last_seen_at en profiles (fire-and-forget)
  function touchLastSeen(userId: string) {
    supabase
      .from('profiles')
      .upsert({ id: userId, last_seen_at: new Date().toISOString() }, { onConflict: 'id' })
      .then(() => {});
  }

  // Al montar: leer sesión activa y suscribirse a cambios
  useEffect(() => {
    // Sesión inicial
    supabase.auth.getSession().then(({ data }) => {
      setUser(sessionToProfile(data.session));
      setIsLoading(false);
      if (data.session?.user) touchLastSeen(data.session.user.id);
    });

    // Suscripción a cambios (login / logout / refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(sessionToProfile(session));
        setIsLoading(false);
        if (session?.user) touchLastSeen(session.user.id);
      }
    );

    // Refrescar last_seen_at cada 2 minutos mientras la sesión esté activa
    const interval = setInterval(() => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) touchLastSeen(data.session.user.id);
      });
    }, 2 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Login con Google vía OAuth de Supabase
  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Reemplazar con el dominio de producción cuando se despliegue
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          hd: 'icie.mx',   // Limita el selector a cuentas @icie.mx
        },
      },
    });
    if (error) {
      console.error('Error al iniciar sesión con Google:', error.message);
      alert('No se pudo iniciar sesión con Google. Intenta de nuevo.');
      setIsLoading(false);
    }
    // Si tiene éxito, Supabase redirige al usuario; onAuthStateChange tomará el control.
  }, []);

  // Cierre de sesión
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return {
    user,
    isLoading,
    loginWithGoogle,
    logout,
  };
      }
