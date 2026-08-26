import {
  extractAuthErrorText,
  HUB_SIGNIN_FAILED_MESSAGE,
  HUB_SIGNUP_ALREADY_REGISTERED_MESSAGE,
  HUB_SIGNUP_FAILED_MESSAGE,
} from "@tool-workspace/hub-identity";

export type NormalizeHubAuthErrorOptions = {
  /** Mention Tool Hub (P0004) in invalid-credentials copy */
  toolHubHint?: boolean;
  /** Extra network / quota messages for dual-workspace tools */
  dualWorkspace?: boolean;
  /** Sign Up uses a different empty-body fallback than Sign In */
  intent?: "signin" | "signup";
};

export function formatHubAuthErrorMessage(raw: unknown): string {
  return extractAuthErrorText(raw);
}

export function normalizeHubAuthError(raw: unknown, opts: NormalizeHubAuthErrorOptions = {}) {
  const msg = formatHubAuthErrorMessage(raw);
  const lower = msg.toLowerCase();
  if (
    /already registered|already been registered|user already exists|email_exists|user_already_exists/.test(
      lower,
    )
  ) {
    return HUB_SIGNUP_ALREADY_REGISTERED_MESSAGE;
  }
  if (lower.includes("rate limit")) return "Temporary sign-in issue. Please try again in a moment.";
  if (lower.includes("sign-in service unavailable")) return msg;
  if (lower.includes("user id not found") || lower.includes("username not found")) {
    return opts.toolHubHint
      ? `${msg} Same username as Tool Hub (P0004).`
      : msg;
  }
  if (lower.includes("phone number not found")) return msg;
  if (lower.includes("account linked to this phone")) {
    return opts.toolHubHint
      ? "Incorrect password for the account linked to this phone. Use that account's Tool Hub (P0004) password, or sign in with username/email."
      : msg;
  }
  if (lower.includes("incorrect password for this username")) {
    return opts.toolHubHint
      ? "Incorrect password for this username. If you recently changed your Tool Hub (P0004) password, use the new one."
      : msg;
  }
  if (lower.includes("invalid login credentials")) {
    return opts.toolHubHint
      ? "Incorrect username/email/phone or password. Use the same credentials as Tool Hub (P0004)."
      : "Incorrect username/email/phone or password.";
  }
  if (lower.includes("user is banned") || lower.includes("user banned")) {
    return opts.dualWorkspace
      ? "Workspace data account is banned, not Tool Hub identity. Ask an admin to unban the workspace data user, then retry Sign In."
      : "This account is banned. Contact an admin to restore access.";
  }
  if (lower.includes("auth_timeout")) {
    return opts.dualWorkspace
      ? "Sign-in timed out — Tool Hub or workspace data plane is slow. Wait a moment and try again."
      : "Sign-in timed out. Please try again.";
  }
  if (opts.dualWorkspace) {
    if (lower.includes("exceed_egress_quota") || lower.includes("egress_quota")) {
      return "Workspace data API quota exceeded on Home Server. Check hub-api / sb-api status.";
    }
    if (isHubApiUnreachableMessage(msg, lower)) {
      return "Cannot reach Tool Hub or workspace data API (Home Server). Cloudflare tunnel or hub-api may be down — retry in a moment.";
    }
  } else if (isHubApiUnreachableMessage(msg, lower)) {
    return "Cannot reach Tool Hub identity (hub-api). Cloudflare tunnel may be disconnected — retry in a moment.";
  }
  return msg || (opts.intent === "signup" ? HUB_SIGNUP_FAILED_MESSAGE : HUB_SIGNIN_FAILED_MESSAGE);
}

function isHubApiUnreachableMessage(msg: string, lower: string): boolean {
  if (msg === "Failed to fetch" || lower.includes("networkerror") || lower.includes("load failed")) {
    return true;
  }
  // Cloudflare Error 1033 / HTTP 502·530 HTML bodies sometimes surface via GoTrue fetch.
  if (/\b(502|530)\b/.test(lower) || lower.includes("error code: 1033") || lower.includes("cloudflare")) {
    return true;
  }
  return false;
}
