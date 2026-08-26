import { useState } from "react";
import { HubAuthGateModal } from "./HubAuthGateModal";
import { HubAuthLogoutChip } from "./HubAuthLogoutChip";
import { HubAuthGateVariantBadge } from "./HubAuthGateVariantBadge";
import { HubAccessDeniedPanel } from "./HubAccessDeniedPanel";
import { HubAuthBrandIcon } from "./HubAuthBrandIcon";
import {
  HUB_AUTH_GATE_VARIANTS,
  type HubAuthGateVariant,
} from "./hub-auth-gate-variant";

type PreviewTool = "P0004" | "P0016" | "P0020";

type PreviewConfig = {
  title: string;
  toolInfo: { code?: string; name: string; tagline: string };
  variant: HubAuthGateVariant;
  anonymousHint?: string;
  deniedTitle: string;
  deniedMessage: string;
};

const PREVIEW: Record<PreviewTool, PreviewConfig> = {
  P0004: {
    title: "Welcome to Tool Hub",
    toolInfo: { name: "Tool Hub", tagline: "Users, roles & password reset" },
    variant: "standard",
    deniedTitle: "No access to Tool Hub",
    deniedMessage: "Ask a workspace admin to grant access, then refresh this page.",
  },
  P0016: {
    title: "Welcome to Chat Center",
    toolInfo: { name: "Chat Center", tagline: "Multi-channel inbox & fanpages" },
    variant: "standard",
    deniedTitle: "No access to Chat Center",
    deniedMessage: "Ask a workspace admin to grant Chat Center access, then refresh this page.",
  },
  P0020: {
    title: "Welcome to Data Box",
    toolInfo: { name: "Data Box", tagline: "Notes, cookies & 2FA vault" },
    variant: "anonymous-dual",
    anonymousHint: "Browse with limited features. Cloud sync requires sign-in.",
    deniedTitle: "No access to Data Box",
    deniedMessage: "Ask a workspace admin to grant Data Box access, then refresh this page.",
  },
};

const PREVIEW_TOOLS: PreviewTool[] = ["P0004", "P0016", "P0020"];

const PREVIEW_BRAND_SRC: Record<PreviewTool, string> = {
  P0004: "/icons/tools/P0004.svg",
  P0016: "/icons/tools/P0016.svg",
  P0020: "/icons/tools/P0020.svg",
};

function previewModalFlags(variant: HubAuthGateVariant) {
  const meta = HUB_AUTH_GATE_VARIANTS[variant];
  return {
    dismissible: meta.dismissible,
    showAnonymous: meta.anonymousTab,
  };
}

export type HubAuthGateGoldenPreviewProps = {
  tool?: PreviewTool;
  /** Side-by-side authVariant badges + standard vs anonymous-dual notes. */
  compare?: boolean;
};

/** Design Template / examples — live golden auth gate (modal + E0001 header chip). */
export function HubAuthGateGoldenPreview({ tool = "P0016", compare = true }: HubAuthGateGoldenPreviewProps) {
  const [activeTool, setActiveTool] = useState<PreviewTool>(tool);
  const [modalOpen, setModalOpen] = useState(false);
  const [deniedOpen, setDeniedOpen] = useState(false);
  const cfg = PREVIEW[activeTool];
  const flags = previewModalFlags(cfg.variant);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6">
      {compare ? (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            authVariant compare
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["standard", "anonymous-dual"] as const).map((variant) => {
              const meta = HUB_AUTH_GATE_VARIANTS[variant];
              return (
                <div
                  key={variant}
                  className="rounded-xl border border-white/8 bg-white/[.02] px-4 py-4 text-center"
                >
                  <HubAuthGateVariantBadge variant={variant} />
                  <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{meta.adapterNote}</p>
                  <p className="mt-1 text-[10px] text-[var(--muted)]">
                    Anonymous tab: {meta.anonymousTab ? "yes" : "no"} · Close ×:{" "}
                    {meta.dismissible ? "yes" : "no"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          HubAuthLogoutChip — E0001 extension header
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-white/8 bg-white/[.02] px-4 py-5">
          <HubAuthLogoutChip
            email="user@example.com"
            roleKey="admin"
            linked
            onOpenUser={() => undefined}
            onLogout={() => undefined}
          />
          <HubAuthLogoutChip email="guest" roleKey="anonymous" onLogout={() => undefined} />
        </div>
        <p className="text-center text-[10px] text-[var(--muted)]">
          Sidebar User row uses classic trailing email — chip is for extension header only.
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            HubAuthGateModal
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {PREVIEW_TOOLS.map((code) => (
              <button
                key={code}
                type="button"
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeTool === code
                    ? "border-indigo-400/35 bg-indigo-500/12 text-indigo-100"
                    : "border-white/10 bg-white/[.03] text-[var(--muted)] hover:bg-white/[.06]"
                }`}
                onClick={() => {
                  setActiveTool(code);
                  setModalOpen(true);
                }}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <HubAuthGateVariantBadge variant={cfg.variant} />
          <button
            type="button"
            className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-100"
            onClick={() => setModalOpen(true)}
          >
            Open modal
          </button>
        </div>
        <p className="text-center text-xs text-[var(--muted)]">
          Modal-only · 30rem · blur 8px · {activeTool} · {HUB_AUTH_GATE_VARIANTS[cfg.variant].tabCount} tabs
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            HubAccessDeniedPanel
          </h3>
          <button
            type="button"
            className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-100"
            onClick={() => setDeniedOpen(true)}
          >
            Open access denied
          </button>
        </div>
        <p className="text-center text-xs text-[var(--muted)]">
          Same auth-gate panel shell — signed-in but no tool access.
        </p>
      </section>

      <HubAuthGateModal
        open={modalOpen}
        dismissible={flags.dismissible}
        title={cfg.title}
        toolInfo={cfg.toolInfo}
        anonymousHint={cfg.anonymousHint}
        headerLeading={<HubAuthBrandIcon src={PREVIEW_BRAND_SRC[activeTool]} />}
        onClose={() => setModalOpen(false)}
        onAnonymous={flags.showAnonymous ? () => setModalOpen(false) : undefined}
        onAuthed={() => setModalOpen(false)}
        onSubmit={async () => ({ error: "Preview only — wire onSubmit in app gate." })}
        onForgotPassword={async () => "Preview only."}
      />

      {deniedOpen ? (
        <HubAccessDeniedPanel
          title={cfg.deniedTitle}
          toolInfo={cfg.toolInfo}
          signedInAs="preview@example.com"
          message={cfg.deniedMessage}
          headerLeading={<HubAuthBrandIcon src={PREVIEW_BRAND_SRC[activeTool]} />}
          onSignOut={() => setDeniedOpen(false)}
        />
      ) : null}
    </div>
  );
}
