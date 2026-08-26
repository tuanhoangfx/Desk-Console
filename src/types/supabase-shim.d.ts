declare module "@supabase/supabase-js" {
  export type Session = Record<string, unknown> | null;
  export type User = Record<string, unknown> | null;
  export type SupabaseClient = {
    auth: {
      getSession: () => Promise<{ data: { session: Session } }>;
      onAuthStateChange: (cb: (event: string, session: Session) => void) => { data: { subscription: { unsubscribe: () => void } } };
    };
    from: (table: string) => unknown;
    channel: (name: string) => unknown;
  };
  export type RealtimeChannel = { unsubscribe: () => void };
  export function createClient(...args: unknown[]): SupabaseClient;
}
