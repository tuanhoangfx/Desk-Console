/** Golden analytics band titles — uppercase via `.hub-analytics-caption`. */
export const GOLDEN_CHART_PANEL_TITLES: Record<string, string> = {
  health_bar: "Health",
  category_bar: "Category",
  deploy_bar: "Deploy",
  status_bar: "Status",
  role_bar: "Role",
  activity_bar: "Activity",
  tool_bar: "Tools",
  distribution_bar: "Created",
  last_active_bar: "Last active",
  kind_bar: "Kind",
  scope_bar: "Scope",
  apply_bar: "Apply mode",
  size_bar: "Size",
  mode_bar: "Mode",
  group_bar: "Group",
  template_bar: "Template",
  pages_bar: "Pages",
  seller_bar: "Seller",
  status_chart: "Status",
  pay_donut: "Pay",
  pay_bar: "Pay status",
  revenue_chart: "Revenue",
  top_products: "Top products",
  cat_bar: "Category",
  platform_bar: "Platform",
  share_bar: "Route share",
  priority_bar: "Priority",
  deadline_bar: "Deadline",
  assignee_bar: "Assignee",
  service_bar: "Top services",
  identity_bar: "Account identity",
  ownership_bar: "Ownership",
  usage_bar: "Usage",
  password_bar: "Password saved",
  runtime_bar: "Runtime",
  session_bar: "Session",
  zalo_bar: "Zalo account",
  active_bar: "Active bot",
  members_bar: "Members",
  allowlist_bar: "Allowlist",
  top_bar: "Top groups",
  listed_bar: "Listed vs off",
  type_bar: "Type",
  connect_bar: "Connected",
  channel_bar: "Channel",
  unread_bar: "Unread vs read",
  source_bar: "Source",
  reply_bar: "Reply performance",
  inbox_over_time: "Inbox over time",
  hourly_spark: "Inbox over time",
  new_bar: "New conversations",
  status_donut: "Status",
  daily_bar: "Daily revenue",
  tier_bar: "Tier",
  tier_donut: "Tier",
  seller_donut: "Seller",
  cat_donut: "Category",
  top_donut: "Top revenue",
  revenue_top_donut: "Top product revenue",
  workflow_bar: "Workflow",
  partner_bar: "Partner",
  bank_bar: "Bank",
  site_bar: "Service",
  slot_bar: "Slot",
  order_status_bar: "Order Status",
  pay_status_bar: "Pay Status",
  day_bar: "Day",
  notify_bar: "Notify",
  contact_bar: "Contact",
  created_bar: "Created",
  customers_bar: "Customers",
};

/** Strip Display Prefs suffix e.g. `Group (bar)` → `Group`. */
export function chartPanelTitleFromPrefLabel(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

export function chartPanelTitleFromDefs<T extends string>(
  defs: readonly { key: T; label: string }[],
  key: T,
): string {
  const item = defs.find((d) => d.key === key);
  /**
   * The active Display definition owns a chart caption: this keeps a tab's
   * Display row and its chart card in lockstep (e.g. System "Mode", not the
   * generic `health_bar` fallback "Health").
   */
  if (item) return chartPanelTitleFromPrefLabel(item.label);
  return GOLDEN_CHART_PANEL_TITLES[key] ?? key;
}
