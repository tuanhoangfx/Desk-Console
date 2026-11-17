/** SSOT — P0001 Desk Console fixed-width columns (Jobs & Drives). Edit here -> regenerate CSS. */
export const P0001_JOBS_FIXED_COLUMNS = [
  { colClass: "hub-users-col--job-id", width: "8.75rem", kind: "code", align: "left", keys: ["code"] },
  { colClass: "hub-users-col--name", width: "12rem", kind: "code", align: "left", keys: ["name"] },
  { colClass: "hub-users-col--path", width: "14rem", kind: "code", align: "left", keys: ["local"] },
  { colClass: "hub-users-col--email", width: "16rem", kind: "code", align: "left", keys: ["remote"] },
  { colClass: "hub-users-col--folder", width: "8rem", kind: "code", align: "left", keys: ["folder"] },
  { colClass: "hub-users-col--status", width: "8.75rem", kind: "compact", align: "center", keys: ["status"] },
  { colClass: "hub-users-col--run", width: "7.25rem", kind: "compact", align: "center", keys: ["run"] },
  { colClass: "hub-users-col--next", width: "9.5rem", kind: "compact", align: "center", keys: ["next"] },
  { colClass: "hub-users-col--mode", width: "8.5rem", kind: "compact", align: "center", keys: ["mode"] },
  { colClass: "hub-users-col--notes", width: "15rem", kind: "compact", align: "left", keys: ["log"] },
  { colClass: "hub-users-col--updated", width: "7.25rem", kind: "date", align: "center", keys: ["updated"] },
  { colClass: "hub-users-col--created", width: "7.25rem", kind: "date", align: "center", keys: ["created"] },
];

export const P0001_DRIVES_FIXED_COLUMNS = [
  { colClass: "hub-users-col--job-id", width: "8.75rem", kind: "code", align: "left", keys: ["code"] },
  { colClass: "hub-users-col--user", width: "12rem", kind: "code", align: "left", keys: ["account"] },
  { colClass: "hub-users-col--email", width: "16rem", kind: "code", align: "left", keys: ["gmail"] },
  { colClass: "hub-users-col--members", width: "6.25rem", kind: "compact", align: "center", keys: ["jobs"] },
  { colClass: "hub-users-col--status", width: "8rem", kind: "compact", align: "center", keys: ["status"] },
  { colClass: "hub-users-col--storage", width: "9.5rem", kind: "compact", align: "center", keys: ["storage"] },
  { colClass: "hub-users-col--files", width: "11.5rem", kind: "code", align: "left", keys: ["files"] },
  { colClass: "hub-users-col--notes", width: "15rem", kind: "compact", align: "left", keys: ["log"] },
  { colClass: "hub-users-col--updated", width: "7.25rem", kind: "date", align: "center", keys: ["updated"] },
  { colClass: "hub-users-col--created", width: "7.25rem", kind: "date", align: "center", keys: ["created"] },
];
