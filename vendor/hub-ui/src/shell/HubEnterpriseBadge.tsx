import {
  hubEnterpriseEmoji,
  hubEnterpriseName,
  isHubEnterpriseSlug,
  type HubEnterpriseSlug,
} from "@tool-workspace/hub-identity";
import { hubFilterOptionEmojiClass } from "../shell/filter-dropdown-primitives";

/** Directory Enterprise cell — Filter sticker emoji + name (P0004 Users / Hub tools SSOT). */
export function HubEnterpriseBadge({
  slug,
  extraCount = 0,
}: {
  slug: HubEnterpriseSlug | string;
  extraCount?: number;
}) {
  const name = hubEnterpriseName(slug);
  const tone = isHubEnterpriseSlug(slug) ? slug : "infi";
  const extra = extraCount > 0 ? `+${extraCount}` : null;
  return (
    <span
      className={`hub-users-enterprise-badge hub-users-enterprise-badge--${tone}`}
      title={name}
    >
      <span className={`${hubFilterOptionEmojiClass()} hub-users-enterprise-badge-icon`} aria-hidden>
        {hubEnterpriseEmoji(slug)}
      </span>
      <span className="hub-users-enterprise-badge-label">{name}</span>
      {extra ? <span className="hub-users-enterprise-badge-extra shrink-0">{extra}</span> : null}
    </span>
  );
}
