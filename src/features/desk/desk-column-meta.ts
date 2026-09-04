import {
  applyStandardDirectoryColumnHints,
  createDirectoryColumnMetaHelpers,
  withDirectoryColumnStickers,
} from "@tool-workspace/hub-ui";
import { DESK_DIRECTORY_FILTER_EMOJI } from "./desk-directory-stickers";

const { col } = createDirectoryColumnMetaHelpers();

export const DESK_COLUMN_META = withDirectoryColumnStickers(
  applyStandardDirectoryColumnHints({
    name: col("Name", "hub-desk-col--name", "name", "col.directory.name", "20rem"),
    run: col("Run", "hub-desk-col--run", "tools", "col.directory.status", "6.5rem"),
    status: col("Status", "hub-desk-col--status", "status", "col.directory.status", "9rem"),
    extra: col("Detail", "hub-desk-col--detail", "email", "col.directory.email", "22rem"),
    updated: col("Updated", "hub-desk-col--updated", "updated", "col.directory.updated", "16rem", {
      columnKind: "date",
    }),
  }),
  {
    name: "📛",
    run: DESK_DIRECTORY_FILTER_EMOJI.runner,
    status: DESK_DIRECTORY_FILTER_EMOJI.status,
    extra: "📝",
    updated: "🕒",
  },
);
