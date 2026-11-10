import { isHubTechnicalAuthEmail, readHubIdentity } from "@tool-workspace/hub-identity";
import { hubEntityLogActorFromUser, type HubEntityLogActor } from "@tool-workspace/hub-ui";
import { remoteNameFromSpec } from "./remote-name";

const driveEmails = new Map<string, string>();

/** Remember Drive account emails already loaded for the directory. */
export function rememberDriveAccountEmails(accounts: readonly { name: string; email?: string | null }[]) {
  driveEmails.clear();
  for (const account of accounts) {
    const email = account.email?.trim();
    if (email) driveEmails.set(account.name, email);
  }
}

/**
 * Log actor — Hub session email when one is signed in, otherwise the Drive
 * account email for this job. Same `by email` caption as Order.
 */
export function resolveJobActivityActor(remote?: string): HubEntityLogActor {
  const snap = typeof window === "undefined" ? null : readHubIdentity();
  const hubEmail = snap?.user_email?.trim() || "";
  if (hubEmail && !isHubTechnicalAuthEmail(hubEmail)) {
    const actor = hubEntityLogActorFromUser({
      id: snap?.user_id,
      email: hubEmail,
      source: "hub",
    });
    if (actor) return actor;
  }
  const driveEmail = remote ? driveEmails.get(remoteNameFromSpec(remote, "")) : "";
  if (driveEmail) {
    const actor = hubEntityLogActorFromUser({ email: driveEmail, source: "hub" });
    if (actor) return actor;
  }
  return { label: "Folder Sync", source: "system" };
}
