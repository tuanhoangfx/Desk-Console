import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createHubForgotPasswordHandler,
  createWorkspaceAuthGatePreset,
  type CreateHubForgotPasswordHandlerOptions,
  type CreateWorkspaceAuthGatePresetOptions,
} from "@tool-workspace/hub-identity";
import { HubAuthGate } from "./HubAuthGate";
import type { HubAuthGateModalProps } from "./HubAuthGateModal";
import type { HubAuthToolInfo } from "./hub-auth-tool-info";
import type { NormalizeHubAuthErrorOptions } from "./normalize-hub-auth-error";

export type WorkspaceAuthGateConfig = {
  onAuthed?: () => void;
  onAnonymous?: () => void;
  profileRoleClient?: SupabaseClient | null;
  onPrepareProfileRoleClient?: (client: SupabaseClient) => Promise<void>;
  title: string;
  toolInfo: HubAuthToolInfo;
  headerLeading?: ReactNode;
  submitDisabled?: boolean;
  onSubmit: HubAuthGateModalProps["onSubmit"];
  anonymousHint?: string;
  errorOptions?: NormalizeHubAuthErrorOptions;
  forgotPassword?: CreateHubForgotPasswordHandlerOptions;
  onForgotPassword?: HubAuthGateModalProps["onForgotPassword"];
};

export type WorkspaceAuthGateProps = WorkspaceAuthGateConfig;

/** Build `HubAuthGate` props — tool adapters stay thin (~15 lines). */
export function createWorkspaceAuthGateConfig(config: WorkspaceAuthGateConfig) {
  const {
    onAuthed,
    onAnonymous,
    profileRoleClient,
    onPrepareProfileRoleClient,
    forgotPassword,
    onForgotPassword,
    ...modal
  } = config;
  return {
    onAuthed,
    onAnonymous,
    profileRoleClient,
    onPrepareProfileRoleClient,
    modal: {
      ...modal,
      onForgotPassword:
        onForgotPassword ??
        (forgotPassword ? createHubForgotPasswordHandler(forgotPassword) : undefined),
    },
  };
}

/** Golden workspace login gate — HubAuthGate + shared forgot-password handler. */
export function WorkspaceAuthGate(config: WorkspaceAuthGateConfig) {
  return <HubAuthGate {...createWorkspaceAuthGateConfig(config)} />;
}

export type CreateWorkspaceAuthGateOptions = CreateWorkspaceAuthGatePresetOptions & {
  headerLeading?: ReactNode;
  submitDisabled?: boolean;
  onSubmit: HubAuthGateModalProps["onSubmit"];
  onAuthed?: () => void;
  onAnonymous?: () => void;
  profileRoleClient?: SupabaseClient | null;
  onPrepareProfileRoleClient?: (client: SupabaseClient) => Promise<void>;
  forgotPassword: Pick<
    CreateHubForgotPasswordHandlerOptions,
    "isHubConfigured" | "resetPasswordForEmail"
  >;
};

/** Factory — ~8 lines per tool adapter (preset + submit + forgot-password handlers). */
export function createWorkspaceAuthGate(options: CreateWorkspaceAuthGateOptions): WorkspaceAuthGateConfig {
  const {
    code,
    variant,
    toolName,
    tagline,
    title,
    headerLeading,
    submitDisabled,
    onSubmit,
    onAuthed,
    onAnonymous,
    profileRoleClient,
    onPrepareProfileRoleClient,
    forgotPassword,
  } = options;
  const preset = createWorkspaceAuthGatePreset({ code, variant, toolName, tagline, title });
  return {
    onAuthed,
    onAnonymous,
    profileRoleClient,
    onPrepareProfileRoleClient,
    title: preset.title,
    toolInfo: preset.toolInfo,
    anonymousHint: preset.anonymousHint,
    errorOptions: preset.errorOptions,
    headerLeading,
    submitDisabled,
    onSubmit,
    forgotPassword: {
      ...preset.forgotPassword,
      ...forgotPassword,
    },
  };
}
