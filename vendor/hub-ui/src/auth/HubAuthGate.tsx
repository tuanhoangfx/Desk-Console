import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { HubAuthGateModal, type HubAuthGateModalProps } from "./HubAuthGateModal";
import { warmWorkspaceProfileRole } from "../lib/workspace-profile-role";

export type HubAuthGateProps = {
  onAuthed?: () => void;
  /** Continue without sign-in (e.g. P0020 anonymous / local mode). */
  onAnonymous?: () => void;
  /** Warm profiles.role cache immediately after successful sign-in. */
  profileRoleClient?: SupabaseClient | null;
  onPrepareProfileRoleClient?: (client: SupabaseClient) => Promise<void>;
  modal: Omit<HubAuthGateModalProps, "open" | "onClose" | "onAuthed" | "onAnonymous">;
};

/** Golden auth gate — compact login modal with Sign In / Sign Up / Anonymous tabs. */
export function HubAuthGate({
  onAuthed,
  onAnonymous,
  profileRoleClient,
  onPrepareProfileRoleClient,
  modal,
}: HubAuthGateProps) {
  const [open, setOpen] = useState(true);
  const dismissible = Boolean(onAnonymous);

  const finishAuthed = () => {
    if (profileRoleClient) {
      void warmWorkspaceProfileRole(profileRoleClient, {
        prepareClient: onPrepareProfileRoleClient,
      });
    }
    setOpen(false);
    onAuthed?.();
  };

  const finishAnonymous = () => {
    setOpen(false);
    onAnonymous?.();
    onAuthed?.();
  };

  return (
    <HubAuthGateModal
      {...modal}
      open={open}
      dismissible={dismissible}
      onClose={() => {
        if (dismissible) finishAnonymous();
      }}
      onAnonymous={onAnonymous ? finishAnonymous : undefined}
      onAuthed={finishAuthed}
    />
  );
}
