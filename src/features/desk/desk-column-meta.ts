import {
  applyStandardDirectoryColumnHints,
  createDirectoryColumnMetaHelpers,
} from "@tool-workspace/hub-ui";

const { col } = createDirectoryColumnMetaHelpers();

export const DESK_COLUMN_META = applyStandardDirectoryColumnHints({
  name: col("Name", "hub-users-col--name", "name", "col.directory.name", "20rem"),
  status: col("Status", "hub-users-col--status", "status", "col.directory.status", "6.5rem"),
  extra: col("Detail", "hub-users-col--email", "email", "col.directory.email", "22rem"),
  updated: col("Updated", "hub-users-col--updated", "updated", "col.directory.updated", "6.25rem", {
    columnKind: "date",
  }),
});
