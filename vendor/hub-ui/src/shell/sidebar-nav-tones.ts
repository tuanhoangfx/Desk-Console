/** Sidebar nav tone palette — full Tailwind classes for JIT (shared across Hub products). */
export type NavToneStyle = {
  icon: { idle: string; active: string };
  dot: { idle: string; active: string };
  bar: string;
  bg: string;
  text: string;
  rail: string;
  badge: { icon: string; variant: string };
  /** Muted meta line on dashboard cards / table summary */
  meta: string;
  /** MiniBarChart / MiniDonut fill — Tailwind *-400 hex parity */
  chart: string;
};

export const NAV_ICON_TONES = {
  sky: {
    icon: {
      idle: "text-sky-400/75 group-hover:text-sky-300",
      active: "text-sky-300",
    },
    dot: {
      idle: "bg-white/15 group-hover:bg-sky-300/60",
      active: "bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.9)]",
    },
    bar: "bg-sky-400",
    bg: "bg-gradient-to-r from-sky-500/20 to-sky-500/5",
    text: "text-sky-100",
    rail: "bg-gradient-to-b from-transparent via-sky-300/25 to-transparent",
    badge: {
      icon: "text-sky-300",
      variant: "border-sky-500/35 bg-sky-500/[.06] text-sky-200",
    },
    meta: "text-sky-300/85",
    chart: "#38bdf8",
  },
  indigo: {
    icon: {
      idle: "text-indigo-400/75 group-hover:text-indigo-300",
      active: "text-indigo-300",
    },
    dot: {
      idle: "bg-white/15 group-hover:bg-indigo-300/60",
      active: "bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.9)]",
    },
    bar: "bg-indigo-400",
    bg: "bg-gradient-to-r from-indigo-500/20 to-indigo-500/5",
    text: "text-indigo-100",
    rail: "bg-gradient-to-b from-transparent via-indigo-300/25 to-transparent",
    badge: {
      icon: "text-indigo-300",
      variant: "border-indigo-500/35 bg-indigo-500/[.06] text-indigo-200",
    },
    meta: "text-indigo-300/85",
    chart: "#818cf8",
  },
  emerald: {
    icon: {
      idle: "text-emerald-400/75 group-hover:text-emerald-300",
      active: "text-emerald-300",
    },
    dot: {
      idle: "bg-white/15 group-hover:bg-emerald-300/60",
      active: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]",
    },
    bar: "bg-emerald-400",
    bg: "bg-gradient-to-r from-emerald-500/20 to-emerald-500/5",
    text: "text-emerald-100",
    rail: "bg-gradient-to-b from-transparent via-emerald-300/25 to-transparent",
    badge: {
      icon: "text-emerald-300",
      variant: "border-emerald-500/35 bg-emerald-500/[.06] text-emerald-200",
    },
    meta: "text-emerald-300/85",
    chart: "#34d399",
  },
  amber: {
    icon: {
      idle: "text-amber-400/75 group-hover:text-amber-300",
      active: "text-amber-300",
    },
    dot: {
      idle: "bg-white/15 group-hover:bg-amber-300/60",
      active: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]",
    },
    bar: "bg-amber-400",
    bg: "bg-gradient-to-r from-amber-500/20 to-amber-500/5",
    text: "text-amber-100",
    rail: "bg-gradient-to-b from-transparent via-amber-300/25 to-transparent",
    badge: {
      icon: "text-amber-300",
      variant: "border-amber-500/35 bg-amber-500/[.06] text-amber-200",
    },
    meta: "text-amber-300/85",
    chart: "#fbbf24",
  },
  cyan: {
    icon: {
      idle: "text-cyan-400/75 group-hover:text-cyan-300",
      active: "text-cyan-300",
    },
    dot: {
      idle: "bg-white/15 group-hover:bg-cyan-300/60",
      active: "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.9)]",
    },
    bar: "bg-cyan-400",
    bg: "bg-gradient-to-r from-cyan-500/20 to-cyan-500/5",
    text: "text-cyan-100",
    rail: "bg-gradient-to-b from-transparent via-cyan-300/25 to-transparent",
    badge: {
      icon: "text-cyan-300",
      variant: "border-cyan-500/35 bg-cyan-500/[.06] text-cyan-200",
    },
    meta: "text-cyan-300/85",
    chart: "#22d3ee",
  },
  violet: {
    icon: {
      idle: "text-violet-400/75 group-hover:text-violet-300",
      active: "text-violet-300",
    },
    dot: {
      idle: "bg-white/15 group-hover:bg-violet-300/60",
      active: "bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.9)]",
    },
    bar: "bg-violet-400",
    bg: "bg-gradient-to-r from-violet-500/20 to-violet-500/5",
    text: "text-violet-100",
    rail: "bg-gradient-to-b from-transparent via-violet-300/25 to-transparent",
    badge: {
      icon: "text-violet-300",
      variant: "border-violet-500/35 bg-violet-500/[.06] text-violet-200",
    },
    meta: "text-violet-300/85",
    chart: "#a78bfa",
  },
  rose: {
    icon: {
      idle: "text-rose-400/75 group-hover:text-rose-300",
      active: "text-rose-300",
    },
    dot: {
      idle: "bg-white/15 group-hover:bg-rose-300/60",
      active: "bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.9)]",
    },
    bar: "bg-rose-400",
    bg: "bg-gradient-to-r from-rose-500/20 to-rose-500/5",
    text: "text-rose-100",
    rail: "bg-gradient-to-b from-transparent via-rose-300/25 to-transparent",
    badge: {
      icon: "text-rose-300",
      variant: "border-rose-500/35 bg-rose-500/[.06] text-rose-200",
    },
    meta: "text-rose-300/85",
    chart: "#fb7185",
  },
  fuchsia: {
    icon: {
      idle: "text-fuchsia-400/75 group-hover:text-fuchsia-300",
      active: "text-fuchsia-300",
    },
    dot: {
      idle: "bg-white/15 group-hover:bg-fuchsia-300/60",
      active: "bg-fuchsia-400 shadow-[0_0_12px_rgba(232,121,249,0.9)]",
    },
    bar: "bg-fuchsia-400",
    bg: "bg-gradient-to-r from-fuchsia-500/20 to-fuchsia-500/5",
    text: "text-fuchsia-100",
    rail: "bg-gradient-to-b from-transparent via-fuchsia-300/25 to-transparent",
    badge: {
      icon: "text-fuchsia-300",
      variant: "border-fuchsia-500/35 bg-fuchsia-500/[.06] text-fuchsia-200",
    },
    meta: "text-fuchsia-300/85",
    chart: "#e879f9",
  },
  blue: {
    icon: {
      idle: "text-blue-400/75 group-hover:text-blue-300",
      active: "text-blue-300",
    },
    dot: {
      idle: "bg-white/15 group-hover:bg-blue-300/60",
      active: "bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.9)]",
    },
    bar: "bg-blue-400",
    bg: "bg-gradient-to-r from-blue-500/20 to-blue-500/5",
    text: "text-blue-100",
    rail: "bg-gradient-to-b from-transparent via-blue-300/25 to-transparent",
    badge: {
      icon: "text-blue-300",
      variant: "border-blue-500/35 bg-blue-500/[.06] text-blue-200",
    },
    meta: "text-blue-300/85",
    chart: "#60a5fa",
  },
} as const satisfies Record<string, NavToneStyle>;

export type NavIconTone = keyof typeof NAV_ICON_TONES;

export function navToneStyle(tone: NavIconTone): NavToneStyle {
  return NAV_ICON_TONES[tone];
}

export function navIconClass(tone: NavIconTone, active: boolean) {
  return NAV_ICON_TONES[tone].icon[active ? "active" : "idle"];
}

export function navDotClass(tone: NavIconTone, active: boolean) {
  return NAV_ICON_TONES[tone].dot[active ? "active" : "idle"];
}

export function navActiveBarClass(tone: NavIconTone) {
  return NAV_ICON_TONES[tone].bar;
}

export function navActiveBgClass(tone: NavIconTone) {
  return NAV_ICON_TONES[tone].bg;
}

export function navActiveTextClass(tone: NavIconTone) {
  return NAV_ICON_TONES[tone].text;
}

export function navRailClass(tone: NavIconTone) {
  return NAV_ICON_TONES[tone].rail;
}

export function navBadgeIconClass(tone: NavIconTone) {
  return NAV_ICON_TONES[tone].badge.icon;
}

export function navBadgeVariantClass(tone: NavIconTone) {
  return NAV_ICON_TONES[tone].badge.variant;
}

/** KPI strip tiles — 1:1 with NavIconTone after KpiStripTone extension. */
export function navKpiTone(tone: NavIconTone) {
  return tone;
}

export function navMetaTextClass(tone: NavIconTone) {
  return NAV_ICON_TONES[tone].meta;
}

/** Chart bar / donut segment fill — aligned with sidebar tone palette. */
export function navChartColor(tone: NavIconTone) {
  return NAV_ICON_TONES[tone].chart;
}
