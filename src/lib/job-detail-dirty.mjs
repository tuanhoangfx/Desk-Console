/** True when the detail draft differs from the saved, already-normalized baseline. */
export function jobSettingsDraftDirty(baseline, draft) {
  if (!baseline || !draft) return false;
  return (
    baseline.name !== draft.name ||
    baseline.localPath !== draft.localPath ||
    baseline.remote !== draft.remote ||
    baseline.mode !== draft.mode ||
    Number(baseline.settleSec) !== Number(draft.settleSec) ||
    String(baseline.proxyUrl || "") !== String(draft.proxyUrl || "") ||
    String(baseline.maxFileSize || "") !== String(draft.maxFileSize || "") ||
    baseline.exclude !== draft.exclude
  );
}

/** Note is saved only from the footer, so an empty stored note matches an empty draft. */
export function jobNoteDirty(saved, note) {
  return (saved || "") !== (note || "");
}
