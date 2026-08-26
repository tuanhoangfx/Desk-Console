export type HubWorkspaceUserAvatarProps = {
  initials: string;
  className?: string;
};

/** Workspace user modal avatar — shared P0020 / P0016 sidebar pattern. */
export function HubWorkspaceUserAvatar({ initials, className = "" }: HubWorkspaceUserAvatarProps) {
  return (
    <span
      className={`user-access-modal__avatar grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-indigo-300/25 bg-indigo-500/20 text-xs font-bold text-indigo-100 ${className}`}
      aria-hidden
    >
      {initials}
    </span>
  );
}
