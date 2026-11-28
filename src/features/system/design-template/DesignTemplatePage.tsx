import { HubDesignTemplateEmpty } from "@tool-workspace/hub-ui";
import { ACTIVE_DESIGN_COUNT } from "./design-registry";

/** P0001 System -> Design Template (empty after locking Directory integration in Apps & Versions). */
export function DesignTemplatePage() {
  return (
    <div className="design-template-page flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
      <div className="rounded-xl border border-cyan-400/20 bg-slate-900/75 p-4 backdrop-blur-md">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">System</p>
        <h1 className="mt-1 text-lg font-semibold text-white">Design Template</h1>
        <p className="mt-1 text-xs text-slate-300">
          Active reviews: <strong className="text-cyan-200">{ACTIVE_DESIGN_COUNT}</strong> · Antigravity Theme Mod & Quota controls live in the standard <strong className="text-violet-200">Apps</strong> directory.
        </p>
      </div>
      <HubDesignTemplateEmpty />
    </div>
  );
}
