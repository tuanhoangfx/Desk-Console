import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DRIVE_CODE_SCHEME,
  JOB_CODE_SCHEME,
  assignDriveCodes,
  assignJobCodes,
  compareDriveCodes,
  compareJobCodes,
  driveCodeSortBucket,
  jobCodeSortBucket,
  nextDriveCode,
  nextJobCode,
  sequentialDriveCodeSortRank,
  sequentialJobCodeSortRank,
} from "./job-code.mjs";

test("nextJobCode and nextDriveCode allocate max(counter) + 1 without reusing gaps", () => {
  assert.equal(nextJobCode([]), "JB0001");
  assert.equal(nextJobCode([{ code: "JB0001" }, { code: "JB0004" }]), "JB0005");
  assert.equal(nextJobCode([{ code: "legacy-id" }, { code: "JB0002" }]), "JB0003");

  assert.equal(nextDriveCode([]), "GG0001");
  assert.equal(nextDriveCode([{ code: "GG0001" }, { code: "GG0003" }]), "GG0004");
});

test("assignJobCodes and assignDriveCodes preserve existing codes and assign missing ones in Created order", () => {
  const jobs = [
    { id: "j-late", createdAt: "2026-10-20T02:00:00.000Z", code: "" },
    { id: "j-kept", createdAt: "2026-10-19T00:00:00.000Z", code: "JB0003" },
    { id: "j-early", createdAt: "2026-10-20T01:00:00.000Z" },
  ];
  const assignedJobs = assignJobCodes(jobs);
  assert.equal(assignedJobs.changed, true);
  assert.equal(assignedJobs.jobs.find((j) => j.id === "j-kept")?.code, "JB0003");
  assert.equal(assignedJobs.jobs.find((j) => j.id === "j-early")?.code, "JB0004");
  assert.equal(assignedJobs.jobs.find((j) => j.id === "j-late")?.code, "JB0005");
  assert.equal(assignJobCodes(assignedJobs.jobs).changed, false);

  const dupJobs = assignJobCodes([
    { id: "dup-1", createdAt: "2026-10-19T00:00:00.000Z", code: "JB0002" },
    { id: "dup-2", createdAt: "2026-10-20T00:00:00.000Z", code: "JB0002" },
  ]);
  assert.equal(dupJobs.changed, true);
  assert.equal(dupJobs.jobs.find((j) => j.id === "dup-1")?.code, "JB0002");
  assert.equal(dupJobs.jobs.find((j) => j.id === "dup-2")?.code, "JB0003");

  const drives = [
    { name: "gdrive-b", createdAt: "2026-10-20T02:00:00.000Z" },
    { name: "gdrive-a", createdAt: "2026-10-20T01:00:00.000Z", code: "GG0002" },
    { name: "gdrive-c", createdAt: "2026-10-20T01:30:00.000Z", code: "" },
  ];
  const assignedDrives = assignDriveCodes(drives);
  assert.equal(assignedDrives.changed, true);
  assert.equal(assignedDrives.accounts.find((a) => a.name === "gdrive-a")?.code, "GG0002");
  assert.equal(assignedDrives.accounts.find((a) => a.name === "gdrive-c")?.code, "GG0003");
  assert.equal(assignedDrives.accounts.find((a) => a.name === "gdrive-b")?.code, "GG0004");
  assert.equal(assignDriveCodes(assignedDrives.accounts).changed, false);
});

test("compareJobCodes, compareDriveCodes, and sort ranks order numerically with empty/legacy last", () => {
  assert.equal(JOB_CODE_SCHEME.prefix, "JB");
  assert.equal(DRIVE_CODE_SCHEME.prefix, "GG");

  const jobCodes = ["", "JB0010", "JB0002", "JB0001"];
  assert.deepEqual([...jobCodes].sort(compareJobCodes), ["JB0001", "JB0002", "JB0010", ""]);
  assert.equal(sequentialJobCodeSortRank("JB0010"), 10);
  assert.equal(sequentialJobCodeSortRank(""), Number.MAX_SAFE_INTEGER);
  assert.equal(jobCodeSortBucket("JB0010"), 0);
  assert.equal(jobCodeSortBucket(""), 1);

  const driveCodes = ["", "GG0012", "GG0003", "GG0001"];
  assert.deepEqual([...driveCodes].sort(compareDriveCodes), ["GG0001", "GG0003", "GG0012", ""]);
  assert.equal(sequentialDriveCodeSortRank("GG0012"), 12);
  assert.equal(sequentialDriveCodeSortRank(null), Number.MAX_SAFE_INTEGER);
  assert.equal(driveCodeSortBucket("GG0012"), 0);
  assert.equal(driveCodeSortBucket(null), 1);
});
