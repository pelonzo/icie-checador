// Re-exportamos los tipos desde useTimeTracking para evitar conflictos de tipo.
export type { LocalTimeEntry, LocalPause } from '../hooks/useTimeTracking';

// Dummy db — ya no se usa IndexedDB, todo está en Supabase.
export const db = {
      syncQueue: {
              count: async () => 0,
      },
};
