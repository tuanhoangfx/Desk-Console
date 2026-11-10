declare module "@supabase/supabase-js" {
  export type User = {
    id: string;
    email?: string;
    aud?: string;
    role?: string;
    created_at?: string;
    updated_at?: string;
    last_sign_in_at?: string;
    app_metadata: Record<string, any>;
    user_metadata: Record<string, any>;
    [key: string]: any;
  };

  export type Session = {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at?: number;
    token_type: string;
    user: User;
    [key: string]: any;
  };

  export type AuthError = {
    message: string;
    status?: number;
    code?: string;
    name?: string;
  };

  export type RealtimeChannel = {
    topic: string;
    on: (
      type: string,
      filter: Record<string, any>,
      callback: (payload: Record<string, any>) => void,
    ) => RealtimeChannel;
    subscribe: (cb?: (status: string, err?: Error) => void) => RealtimeChannel;
    unsubscribe: () => Promise<"ok" | "timed out" | "error"> | void;
  };

  export type SupabaseClient<Database = any, SchemaName extends string & keyof Database = any, Schema = any> = {
    auth: {
      getSession: () => Promise<{ data: { session: Session | null }; error: AuthError | null }>;
      getUser: (jwt?: string) => Promise<{ data: { user: User | null }; error: AuthError | null }>;
      setSession: (currentSession: {
        access_token: string;
        refresh_token: string;
      }) => Promise<{ data: { session: Session | null; user: User | null }; error: AuthError | null }>;
      refreshSession: (currentSession?: {
        refresh_token: string;
      }) => Promise<{ data: { session: Session | null; user: User | null }; error: AuthError | null }>;
      signInWithPassword: (credentials: {
        email: string;
        password: string;
      }) => Promise<{ data: { user: User | null; session: Session | null }; error: AuthError | null }>;
      signUp: (credentials: {
        email: string;
        password: string;
        options?: Record<string, any>;
      }) => Promise<{ data: { user: User | null; session: Session | null }; error: AuthError | null }>;
      signOut: (options?: { scope?: "global" | "local" | "others" }) => Promise<{ error: AuthError | null }>;
      updateUser: (attributes: Record<string, any>) => Promise<{ data: { user: User | null }; error: AuthError | null }>;
      verifyOtp: (params: Record<string, any>) => Promise<{ data: { user: User | null; session: Session | null }; error: AuthError | null }>;
      resetPasswordForEmail: (email: string, options?: Record<string, any>) => Promise<{ data: Record<string, any> | null; error: AuthError | null }>;
      onAuthStateChange: (
        cb: (event: string, session: Session | null) => void | Promise<void>,
      ) => { data: { subscription: { unsubscribe: () => void } } };
      [key: string]: any;
    };
    from: (table: string) => any;
    rpc: (fn: string, args?: Record<string, any>, options?: Record<string, any>) => any;
    storage: {
      from: (id: string) => any;
      [key: string]: any;
    };
    channel: (name: string, opts?: Record<string, any>) => RealtimeChannel;
    getChannels: () => RealtimeChannel[];
    removeChannel: (channel: RealtimeChannel) => Promise<"ok" | "timed out" | "error">;
    removeAllChannels: () => Promise<("ok" | "timed out" | "error")[]>;
    [key: string]: any;
  };

  export function createClient<Database = any>(
    supabaseUrl: string,
    supabaseKey: string,
    options?: Record<string, any>,
  ): SupabaseClient<Database>;
}
