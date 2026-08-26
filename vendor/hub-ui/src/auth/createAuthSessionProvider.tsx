import { createContext, useContext, type Context, type ReactNode } from "react";

export type AuthSessionProviderBundle<TState> = {
  AuthSessionProvider: ({ children }: { children: ReactNode }) => ReactNode;
  useAuth: () => TState;
  Context: Context<TState | null>;
};

type AuthContextRegistry = Map<string, Context<unknown>>;

function authContextRegistry(): AuthContextRegistry {
  const g = globalThis as typeof globalThis & { __hubAuthContextRegistry?: AuthContextRegistry };
  if (!g.__hubAuthContextRegistry) g.__hubAuthContextRegistry = new Map();
  return g.__hubAuthContextRegistry;
}

/** Factory — one Provider + hook per workspace tool (P0016 useHubAuth, P0020 useNotesAuth, …). */
export function createAuthSessionProvider<TState>(
  useAuthState: () => TState,
  hookName: string,
): AuthSessionProviderBundle<TState> {
  const registry = authContextRegistry();
  let existing = registry.get(hookName) as Context<TState | null> | undefined;
  if (!existing) {
    existing = createContext<TState | null>(null);
    existing.displayName = `${hookName}Context`;
    registry.set(hookName, existing as Context<unknown>);
  }
  const AuthContext = existing;

  function AuthSessionProvider({ children }: { children: ReactNode }) {
    const value = useAuthState();
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  function useAuth(): TState {
    const ctx = useContext(AuthContext);
    if (!ctx) {
      throw new Error(`${hookName} must be used within AuthSessionProvider`);
    }
    return ctx;
  }

  return { AuthSessionProvider, useAuth, Context: AuthContext };
}
