import { useState } from "react";
import { ArrowRight, CheckCircle2, Play, Sparkles, X } from "lucide-react";
import type { AppScreen } from "../../lib/app-screen";
import { openP0009Guide } from "../../lib/guide-url";
import { P0009_ONBOARDING_STEPS } from "./onboarding-steps";

const TOUR_DISMISSED_KEY = "p0009_guided_tour_dismissed_v1";

export function shouldAutoShowGuidedTour(drivesCount: number, jobsCount: number): boolean {
  try {
    if (window.localStorage.getItem(TOUR_DISMISSED_KEY) === "1") return false;
  } catch {
    return false;
  }
  return drivesCount === 0 && jobsCount === 0;
}

export function dismissGuidedTour(): void {
  try {
    window.localStorage.setItem(TOUR_DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectScreen: (screen: AppScreen) => void;
}

export function FolderSyncGuidedTourModal({ open, onClose, onSelectScreen }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  if (!open) return null;

  const step = P0009_ONBOARDING_STEPS[stepIdx] ?? P0009_ONBOARDING_STEPS[0]!;

  function handleDismiss() {
    dismissGuidedTour();
    onClose();
  }

  function handleGoToScreen(screen: AppScreen) {
    dismissGuidedTour();
    onSelectScreen(screen);
    onClose();
  }

  return (
    <div
      className="fixed bottom-5 right-5 z-50 w-full max-w-md rounded-2xl border border-sky-400/40 bg-slate-950/95 p-4 text-slate-100 shadow-2xl shadow-sky-950/80 backdrop-blur-xl"
      role="dialog"
      aria-label="Interactive Guided Setup"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/90 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300">
            <Sparkles size={13} />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
            Guided Setup · Step {step.stepNumber} of {P0009_ONBOARDING_STEPS.length}
          </span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          aria-label="Close guided tour"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="rounded-md border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-sky-300">
            {step.badge}
          </span>
          <button
            type="button"
            onClick={() => void openP0009Guide("guide/")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-300 hover:text-indigo-200"
          >
            <Play size={11} />
            <span>Full guide + video</span>
          </button>
        </div>

        <h3 className="text-sm font-bold text-white">{step.title}</h3>
        <p className="text-xs leading-relaxed text-slate-300">{step.subtitle}</p>

        <ul className="space-y-1.5 pt-1">
          {step.bullets.slice(0, 2).map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-200">
              <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-400" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-800/90 pt-3">
        <div className="flex items-center gap-1.5">
          {P0009_ONBOARDING_STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStepIdx(i)}
              className={`h-2 rounded-full transition-all ${
                i === stepIdx ? "w-6 bg-sky-400" : "w-2 bg-slate-700 hover:bg-slate-500"
              }`}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {stepIdx < P0009_ONBOARDING_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                const next = P0009_ONBOARDING_STEPS[stepIdx + 1]!;
                setStepIdx(stepIdx + 1);
                onSelectScreen(next.targetScreen);
              }}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              Next Step →
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => handleGoToScreen(step.targetScreen)}
            className="inline-flex items-center gap-1 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-sky-400"
          >
            <span>{step.ctaLabel}</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
