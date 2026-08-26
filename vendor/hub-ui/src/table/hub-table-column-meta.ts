import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  Check,
  Cookie,
  Clock,
  Copy,
  Download,
  FileCode2,
  FileText,
  Fingerprint,
  GitBranch,
  Globe2,
  Hash,
  History,
  KeyRound,
  Layers,
  Link2,
  LockKeyhole,
  Mail,
  MessageSquare,
  Package,
  Play,
  Radio,
  ScrollText,
  Share2,
  Shield,
  ShieldCheck,
  Star,
  Timer,
  Unlink,
  Upload,
  UserRound,
  Users,
  Zap,
} from "lucide-react";

/** Semantic column roles — single source for icon + color across Hub tables. */
export type HubTableColumnRole =
  | "code"
  | "name"
  | "email"
  | "role"
  | "tools"
  | "created"
  | "activity"
  | "actions"
  | "status"
  | "version"
  | "category"
  | "access"
  | "path"
  | "scope"
  | "kind"
  | "layer"
  | "golden"
  | "clone"
  | "lines"
  | "mode"
  | "updated"
  | "share"
  | "vault"
  | "source"
  | "route"
  | "type"
  | "user"
  | "sync"
  | "load"
  | "expires"
  | "id"
  | "drift"
  | "manifest"
  | "links"
  | "url"
  | "synced"
  | "session"
  | "runtime"
  | "zalo"
  | "channel"
  | "bots"
  | "notes"
  | "log"
  | "members"
  | "allowlist"
  | "active"
  | "password"
  | "period"
  | "service"
  | "browser"
  | "totp";

export type HubTableColumnMeta = {
  icon: LucideIcon;
  iconClassName: string;
};

/** Golden directory table (P0004 HubToolsDirectoryTable / UserDirectoryTable). */
export const HUB_TABLE_COLUMN_META: Record<HubTableColumnRole, HubTableColumnMeta> = {
  code: { icon: Hash, iconClassName: "hub-users-th-icon--id" },
  name: { icon: FileText, iconClassName: "hub-users-th-icon--name" },
  email: { icon: Mail, iconClassName: "hub-users-th-icon--email" },
  role: { icon: ShieldCheck, iconClassName: "hub-users-th-icon--role" },
  tools: { icon: Package, iconClassName: "hub-users-th-icon--tools" },
  created: { icon: CalendarClock, iconClassName: "hub-users-th-icon--created" },
  activity: { icon: Clock, iconClassName: "hub-users-th-icon--activity" },
  actions: { icon: Hash, iconClassName: "hub-users-th-icon--actions" },
  status: { icon: Radio, iconClassName: "hub-users-th-icon--role" },
  version: { icon: GitBranch, iconClassName: "hub-users-th-icon--created" },
  category: { icon: Layers, iconClassName: "hub-users-th-icon--tools" },
  access: { icon: Check, iconClassName: "hub-users-th-icon--tools" },
  path: { icon: FileCode2, iconClassName: "hub-users-th-icon--id" },
  scope: { icon: Globe2, iconClassName: "hub-users-th-icon--role" },
  kind: { icon: ScrollText, iconClassName: "hub-users-th-icon--role" },
  layer: { icon: Layers, iconClassName: "hub-users-th-icon--tools" },
  golden: { icon: Star, iconClassName: "hub-users-th-icon--actions" },
  clone: { icon: Copy, iconClassName: "hub-users-th-icon--email" },
  lines: { icon: Hash, iconClassName: "hub-users-th-icon--created" },
  mode: { icon: Zap, iconClassName: "hub-users-th-icon--activity" },
  updated: { icon: History, iconClassName: "hub-users-th-icon--activity" },
  share: { icon: Share2, iconClassName: "hub-users-th-icon--email" },
  vault: { icon: Shield, iconClassName: "hub-users-th-icon--role" },
  source: { icon: LockKeyhole, iconClassName: "hub-users-th-icon--created" },
  route: { icon: Cookie, iconClassName: "hub-users-th-icon--name" },
  type: { icon: Boxes, iconClassName: "hub-users-th-icon--tools" },
  user: { icon: UserRound, iconClassName: "hub-users-th-icon--name" },
  sync: { icon: Upload, iconClassName: "hub-users-th-icon--email" },
  load: { icon: Download, iconClassName: "hub-users-th-icon--tools" },
  expires: { icon: CalendarClock, iconClassName: "hub-users-th-icon--created" },
  id: { icon: Fingerprint, iconClassName: "hub-users-th-icon--id" },
  drift: { icon: AlertTriangle, iconClassName: "hub-users-th-icon--actions" },
  manifest: { icon: Unlink, iconClassName: "hub-users-th-icon--actions" },
  links: { icon: Link2, iconClassName: "hub-users-th-icon--email" },
  url: { icon: Globe2, iconClassName: "hub-users-th-icon--id" },
  synced: { icon: Clock, iconClassName: "hub-users-th-icon--activity" },
  session: { icon: MessageSquare, iconClassName: "hub-users-th-icon--role" },
  runtime: { icon: Play, iconClassName: "hub-users-th-icon--tools" },
  zalo: { icon: MessageSquare, iconClassName: "hub-users-th-icon--email" },
  channel: { icon: Radio, iconClassName: "hub-users-th-icon--name" },
  bots: { icon: Hash, iconClassName: "hub-users-th-icon--actions" },
  notes: { icon: FileText, iconClassName: "hub-users-th-icon--email" },
  log: { icon: History, iconClassName: "hub-users-th-icon--activity" },
  members: { icon: Users, iconClassName: "hub-users-th-icon--tools" },
  allowlist: { icon: Check, iconClassName: "hub-users-th-icon--role" },
  active: { icon: Star, iconClassName: "hub-users-th-icon--created" },
  password: { icon: LockKeyhole, iconClassName: "hub-users-th-icon--role" },
  period: { icon: Timer, iconClassName: "hub-users-th-icon--actions" },
  service: { icon: ShieldCheck, iconClassName: "hub-users-th-icon--tools" },
  browser: { icon: Globe2, iconClassName: "hub-users-th-icon--email" },
  totp: { icon: KeyRound, iconClassName: "hub-users-th-icon--role" },
};

const HUB_TABLE_COLUMN_META_FALLBACK: HubTableColumnMeta = HUB_TABLE_COLUMN_META.name;

export function resolveHubTableColumnMeta(role: HubTableColumnRole): HubTableColumnMeta {
  return HUB_TABLE_COLUMN_META[role] ?? HUB_TABLE_COLUMN_META_FALLBACK;
}
