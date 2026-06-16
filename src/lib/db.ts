// Tipos de compatibilidad — el backend real es Supabase (ver supabase.ts).

export interface LocalTimeEntry {
    id: string;
    user_id?: string;
    date: string;               // YYYY-MM-DD
  clockIn: string;            // ISO string
  clockOut: string | null;
    status: 'active' | 'paused' | 'completed';
    totalHours: number | null;
    [key: string]: unknown;
}

export interface LocalPause {
    id: string;
    timeEntryId: string;
    type: 'meal' | 'break' | 'other';
    startTime: string;          // ISO string
  endTime: string | null;
    duration: number | null;    // minutos
  [key: string]: unknown;
}

// Dummy db — ya no se usa IndexedDB, todo está en Supabase.
export const db = {
    syncQueue: {
          count: async () => 0,
    },
            };
