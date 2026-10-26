import { useEffect, useMemo, useState } from "react";
import { Cloud, File, GitCompare, Laptop, ShieldCheck } from "lucide-react";
import { type FilterValues, type KpiTileData } from "@tool-workspace/hub-ui";
import {
  folderCompareStatusFilter,
  folderOutlineFormatFilter,
  folderOutlineKindFilter,
} from "../../lib/folder-sync-directory-column-hints";
import { addExcludeToken } from "../../lib/job-mode";
import { collectOutlineFormats, matchesOutlineRow } from "../../lib/outline-open-memory.mjs";
import { remoteNameFromSpec, remotePathFromSpec } from "../../lib/remote-name";
import {
  createDriveFolder,
  createLocalFolder,
  fetchJobBrowse,
  fetchSyncWatch,
  updateJob,
  type BrowseRow,
  type SyncJob,
} from "../../lib/sync-api";
import { SyncFolderTree } from "../tree/SyncFolderTree";
import { SyncTreeSection } from "../tree/SyncTreeSection";

const STATUS_FILTER = folderCompareStatusFilter();
const KIND_FILTER = folderOutlineKindFilter();

type Props = {
  job: SyncJob | null;
  onSaved?: (job: SyncJob) => void;
};

function countsFromJob(job: SyncJob | null) {
  const saved = job?.treeCounts;
  if (!saved) return null;
  return { synced: saved.synced || 0, local: saved.local || 0, drive: saved.drive || 0, diff: saved.diff || 0 };
}

function matches(row: BrowseRow, query: string, statuses: string[], kinds: string[], formats: string[]) {
  return matchesOutlineRow(row, { query, statuses, kinds, formats });
}

/** Goodsync-style tree for the job's local folder and Drive folder. */
export function JobFolderBrowse({ job, onSaved }: Props) {
  const [rows, setRows] = useState<BrowseRow[]>([]);
  const [treeCache, setTreeCache] = useState<Record<string, BrowseRow[]>>({});
  const [rootLoaded, setRootLoaded] = useState(false);
  const [localMissing, setLocalMissing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [excludedCount, setExcludedCount] = useState(0);
  const [excludedNames, setExcludedNames] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [treeCounts, setTreeCounts] = useState<{ synced: number; local: number; drive: number; diff: number } | null>(() =>
    countsFromJob(job),
  );
  const [settleSec, setSettleSec] = useState(20);

  useEffect(() => {
    setQuery("");
    setFilterValues({});
    setTreeCounts(countsFromJob(job));
    setRows([]);
    setExcludedCount(0);
    setExcludedNames([]);
    setRootLoaded(false);
  }, [job?.id]);

  useEffect(() => {
    let cancelled = false;
    void fetchSyncWatch()
      .then((watch) => {
        if (!cancelled && watch.settleMs > 0) setSettleSec(Math.round(watch.settleMs / 1000));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [job?.id]);

  useEffect(() => {
    setTreeCounts(countsFromJob(job));
  }, [job?.id, job?.treeCounts?.at]);

  const statuses = filterValues.status || [];
  const kinds = filterValues.kind || [];
  const selectedFormats = filterValues.format || [];
  const formats = useMemo(() => collectOutlineFormats(treeCache), [treeCache]);
  const filters = useMemo(
    () => [STATUS_FILTER, KIND_FILTER, ...(formats.length ? [folderOutlineFormatFilter(formats)] : [])],
    [formats],
  );
  const statusCounts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1;
        return acc;
      },
      {} as Partial<Record<BrowseRow["status"], number>>,
    );
  }, [rows]);
  const shown = rows.filter((row) => matches(row, query, statuses, kinds, selectedFormats)).length;
  const toggleStatusKpi = (statusVal: string) => {
    const isSingle = statuses.length === 1 && statuses[0] === statusVal;
    const next = { ...filterValues };
    if (isSingle) delete next.status;
    else next.status = [statusVal];
    setFilterValues(next);
  };
  const kpis = useMemo<KpiTileData[]>(
    () => [
      {
        prefKey: "synced",
        label: "Synced",
        value: treeCounts?.synced ?? statusCounts["in-sync"] ?? 0,
        icon: ShieldCheck,
        statusDot: "online",
        tone: "emerald",
        active: statuses.length === 1 && statuses[0] === "in-sync",
        onClick: () => toggleStatusKpi("in-sync"),
      },
      {
        prefKey: "local",
        label: "Local",
        value: treeCounts?.local ?? statusCounts.local ?? 0,
        icon: Laptop,
        statusDot: "idle",
        tone: "amber",
        active: statuses.length === 1 && statuses[0] === "local",
        onClick: () => toggleStatusKpi("local"),
      },
      {
        prefKey: "drive",
        label: "Drive",
        value: treeCounts?.drive ?? statusCounts.cloud ?? 0,
        icon: Cloud,
        statusDot: "active",
        tone: "sky",
        active: statuses.length === 1 && statuses[0] === "cloud",
        onClick: () => toggleStatusKpi("cloud"),
      },
      {
        prefKey: "diff",
        label: "Diff",
        value: treeCounts?.diff ?? statusCounts.different ?? 0,
        icon: GitCompare,
        statusDot: "offline",
        tone: "rose",
        active: statuses.length === 1 && statuses[0] === "different",
        onClick: () => toggleStatusKpi("different"),
      },
    ],
    [statusCounts, treeCounts, statuses, filterValues],
  );

  if (!job) {
    return <p className="hub-directory-body-value px-3 py-3 text-white/55">Select a job to browse its folders.</p>;
  }

  const filterKey = `${query}|${statuses.join(",")}|${kinds.join(",")}|${selectedFormats.join(",")}`;

  return (
    <div className="folder-sync-browse">
      <SyncTreeSection
        banner={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="hub-directory-body-value text-white/55">
              {localMissing
                ? "Local folder is missing. Set it in the Job section."
                : job.settleSec === 0
                  ? "Auto sync is off. Start syncs now."
                  : `New files upload ${job.settleSec || settleSec}s after changes stop, including files inside subfolders.`}
            </p>
            {excludedCount > 0 ? (
              <span
                className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-white/70"
                title={
                  excludedNames.length
                    ? `Excluded from sync:\n${excludedNames.join(", ")}${
                        excludedCount > excludedNames.length ? "…" : ""
                      }`
                    : undefined
                }
              >
                <span aria-hidden>🚫</span>
                <span>
                  {excludedCount} excluded {excludedCount === 1 ? "item" : "items"} hidden
                </span>
              </span>
            ) : null}
          </div>
        }
        error={remoteError || localError}
        empty={rootLoaded && !localMissing && rows.length === 0 ? "This folder is empty." : undefined}
        kpis={kpis}
        shortcutScope="p0009-job-folders"
        placeholder="Search files…"
        filters={filters}
        query={query}
        onQueryChange={setQuery}
        values={filterValues}
        onValuesChange={setFilterValues}
        shown={shown}
        total={rows.length}
        countLabel="files"
        countIcon={File}
        tree={
          <SyncFolderTree
            mode="job"
            resetKey={`${job.id}|${job.localPath}|${job.remote}|${job.exclude || ""}`}
            localRootPath={job.localPath}
            remoteSpec={job.remote}
            filterKey={filterKey}
            className="h-full"
            onCacheChange={setTreeCache}
            emptyMessage={rows.length && !shown ? "No files match search or filters." : "No files in this folder."}
            match={(row) => matches(row, query, statuses, kinds, selectedFormats)}
            onCreateFolder={async (parentPath, folderName) => {
              const localRes = await createLocalFolder(job.localPath, parentPath, folderName);
              if (!localRes.ok) throw new Error(localRes.error || "Could not create local folder.");
              const remoteName = remoteNameFromSpec(job.remote, "");
              const remoteBase = remotePathFromSpec(job.remote);
              if (remoteName) {
                const remoteParent = [remoteBase, parentPath].filter(Boolean).join("/");
                await createDriveFolder(remoteName, remoteParent, folderName).catch(() => undefined);
              }
              return localRes.path;
            }}
            onExcludeToken={async (token) => {
              const nextExclude = addExcludeToken(job.exclude, token);
              if (nextExclude === job.exclude) return;
              const { job: saved } = await updateJob(job.id, { exclude: nextExclude }, { remote: job.remote });
              onSaved?.(saved);
            }}
            load={async (dirPath) => {
              const data = await fetchJobBrowse(job.id, dirPath);
              if (!dirPath) {
                setRows(data.rows || []);
                setLocalMissing(Boolean(data.localMissing));
                setLocalError(data.localError);
                setRemoteError(data.remoteError);
                setExcludedCount(Number(data.excludedCount) || 0);
                setExcludedNames(data.excludedNames || []);
                setRootLoaded(true);
              } else if (data.ok === false) {
                throw new Error(data.localError || data.remoteError || "Could not list this folder.");
              }
              return data.rows || [];
            }}
          />
        }
      />
    </div>
  );
}
