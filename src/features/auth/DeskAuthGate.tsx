import {
  HubAuthBrandIcon,
  HubDesktopAccessDeniedScreen,
  HubDesktopAuthBootScreen,
  WorkspaceAuthGate,
  createAuthSessionProvider,
  createWorkspaceAuthGate,
} from "@tool-workspace/hub-ui";
import {
  createHubOnlyAuthGateSubmit,
  createWorkspaceAuthGateHubEnvPartial,
  createWorkspaceAuthGateHubForgotPasswordFromEnv,
  sendDesktopHostAuthTelemetry,
  syncDesktopHostHubSession,
  useDesktopHubAuth,
  type DesktopHubAuthState,
  type HubAuthViteEnv,
} from "@tool-workspace/hub-identity";
import { DESK_BRAND_ICON, DESK_PRODUCT } from "../../lib/app-release";
import { resolveDeskApiOrigin } from "../../lib/host-fetch-recovery";

function useDeskHubAuthState(): DesktopHubAuthState {
  return useDesktopHubAuth({
    code: "P0001",
    env: import.meta.env as HubAuthViteEnv & { DEV?: boolean },
    onSessionSync: (session) => {
      const origin = resolveDeskApiOrigin();
      void syncDesktopHostHubSession(`${origin}/api/hub-auth/session`, session);
    },
    onBootTelemetry: (telemetry) => {
      const origin = resolveDeskApiOrigin();
      void sendDesktopHostAuthTelemetry(`${origin}/api/hub-auth/telemetry`, telemetry);
    },
  });
}

export const { AuthSessionProvider: DeskAuthProvider, useAuth: useDeskAuth } =
  createAuthSessionProvider<DesktopHubAuthState>(useDeskHubAuthState, "useDeskAuth");

export function DeskAuthGate() {
  const { hubAuthEnv, getHubClient, prepareHubIdentityClient, persistHubSession, refreshSession } =
    useDeskAuth();

  return (
    <WorkspaceAuthGate
      {...createWorkspaceAuthGate({
        code: "P0001",
        toolName: DESK_PRODUCT.name,
        title: `Welcome to ${DESK_PRODUCT.name}`,
        tagline: "",
        headerLeading: <HubAuthBrandIcon src={DESK_BRAND_ICON} />,
        onAuthed: () => {
          void refreshSession();
        },
        ...createWorkspaceAuthGateHubEnvPartial({
          env: hubAuthEnv,
          getHubClient,
          prepareHubIdentitySession: prepareHubIdentityClient,
        }),
        onSubmit: createHubOnlyAuthGateSubmit({
          toolCode: "P0001",
          getHubClient,
          persistSession: (session) => persistHubSession(session, "auth_gate"),
        }),
        forgotPassword: createWorkspaceAuthGateHubForgotPasswordFromEnv({ env: hubAuthEnv }),
      })}
    />
  );
}

export function DeskAuthBootScreen() {
  return <HubDesktopAuthBootScreen toolName={DESK_PRODUCT.name} brandIcon={DESK_BRAND_ICON} />;
}

export function DeskAccessDeniedScreen() {
  const auth = useDeskAuth();
  return (
    <HubDesktopAccessDeniedScreen
      toolName={DESK_PRODUCT.name}
      brandIcon={DESK_BRAND_ICON}
      auth={auth}
    />
  );
}
