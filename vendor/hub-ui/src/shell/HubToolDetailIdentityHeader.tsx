import type { ReactNode } from "react";

export type HubToolDetailIdentityHeaderProps = {
  /** `aria-labelledby` target on the modal. */
  titleId: string;
  /** String title or a chip (Task ID copy badge). */
  title: ReactNode;
  /** Avatar, site icon, role badge — left of title. */
  leading?: ReactNode;
  /** Domain, email, meta chips — right of title. */
  trailing?: ReactNode;
  /** Center slot — account-detail header search (grid column 2). */
  center?: ReactNode;
};

const TITLE_CLASS =
  "user-access-modal__header-name min-w-0 truncate text-sm font-semibold text-[var(--text)]";

/** Golden tool-detail header — P0004 User Access · P0020 Cookie Route. */
export function HubToolDetailIdentityHeader({
  titleId,
  title,
  leading,
  trailing,
  center,
}: HubToolDetailIdentityHeaderProps) {
  const titleNode =
    typeof title === "string" || typeof title === "number" ? (
      <h2 id={titleId} className={TITLE_CLASS}>
        {title}
      </h2>
    ) : (
      <div id={titleId} className={`${TITLE_CLASS} flex items-center`} role="heading" aria-level={2}>
        {title}
      </div>
    );

  return (
    <header className="user-access-modal__header">
      <div className="user-access-modal__header-main min-w-0 flex-1">
        {leading}
        {titleNode}
        {trailing}
      </div>
      {center ? <div className="user-access-modal__header-center min-w-0">{center}</div> : null}
    </header>
  );
}
