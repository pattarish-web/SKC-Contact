import assert from "node:assert/strict";
import {
  contractFingerprint,
  decideSyncAction,
  makeContract,
  mergeContractLists,
  simulateTwoUserSync,
} from "./sync-core";

// --- Basic merge ---
{
  const a = makeContract("a1", "SC-2569-09-001", 100, "A");
  const b = makeContract("b1", "SC-2569-09-002", 200, "B");
  const merged = mergeContractLists([a], [b]);
  assert.equal(merged.length, 2);
}

// Same number, different ids → keep newer
{
  const older = makeContract("id-old", "SC-2569-09-001", 100, "เก่า");
  const newer = makeContract("id-new", "SC-2569-09-001", 500, "ใหม่");
  const merged = mergeContractLists([older], [newer]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0]!.id, "id-new");
  assert.equal(merged[0]!.inputs.client_name, "ใหม่");
}

// --- Safety: never wipe local with empty remote ---
{
  const local = {
    version: 1 as const,
    exportedAt: 1000,
    contracts: [makeContract("a", "SC-2569-09-001", 1000)],
  };
  const remote = { version: 1 as const, exportedAt: 99999, contracts: [] };
  const d = decideSyncAction(local, remote);
  assert.equal(d.action, "keep-local-push");
}

// --- Safety: empty local pulls remote ---
{
  const local = { version: 1 as const, exportedAt: 0, contracts: [] };
  const remote = {
    version: 1 as const,
    exportedAt: 50,
    contracts: [makeContract("r", "SC-2569-09-003", 50)],
  };
  assert.equal(decideSyncAction(local, remote).action, "pull");
}

// --- 17 vs 15 style partial libraries ---
{
  const shared = Array.from({ length: 15 }, (_, i) =>
    makeContract(`s${i}`, `SC-2569-09-${String(i + 1).padStart(3, "0")}`, 100 + i)
  );
  const extra = [
    makeContract("x16", "SC-2569-09-016", 2000),
    makeContract("x17", "SC-2569-09-017", 2001),
  ];
  const result = simulateTwoUserSync({
    userA: [...shared, ...extra],
    userB: [...shared],
    cloud: [],
  });
  assert.equal(result.counts.a, 17, `A should end with 17, got ${result.counts.a}`);
  assert.equal(result.counts.b, 17, `B should end with 17, got ${result.counts.b}`);
  assert.equal(result.counts.cloud, 17, `cloud should end with 17, got ${result.counts.cloud}`);
  assert.equal(result.identical, true, "A, B, and cloud fingerprints must match");
}

// --- Concurrent edits on different contracts ---
{
  const base = [
    makeContract("c1", "SC-2569-09-001", 100, "หนึ่ง"),
    makeContract("c2", "SC-2569-09-002", 100, "สอง"),
  ];
  const userA = [
    makeContract("c1", "SC-2569-09-001", 300, "หนึ่ง-แก้โดยA"),
    makeContract("c2", "SC-2569-09-002", 100, "สอง"),
    makeContract("c3", "SC-2569-09-003", 300, "สาม-A"),
  ];
  const userB = [
    makeContract("c1", "SC-2569-09-001", 100, "หนึ่ง"),
    makeContract("c2", "SC-2569-09-002", 400, "สอง-แก้โดยB"),
    makeContract("c4", "SC-2569-09-004", 400, "สี่-B"),
  ];
  const result = simulateTwoUserSync({ userA, userB, cloud: base });
  assert.equal(result.identical, true);
  assert.equal(result.counts.a, 4);
  const byNo = Object.fromEntries(
    result.cloud.map((c) => [c.inputs.contract_no, c.inputs.client_name])
  );
  assert.equal(byNo["SC-2569-09-001"], "หนึ่ง-แก้โดยA");
  assert.equal(byNo["SC-2569-09-002"], "สอง-แก้โดยB");
  assert.ok(byNo["SC-2569-09-003"]);
  assert.ok(byNo["SC-2569-09-004"]);
}

// --- Concurrent edit SAME contract number (LWW) ---
{
  const result = simulateTwoUserSync({
    userA: [makeContract("a", "SC-2569-09-001", 500, "จากA")],
    userB: [makeContract("b", "SC-2569-09-001", 800, "จากB")],
    cloud: [],
  });
  assert.equal(result.identical, true);
  assert.equal(result.counts.cloud, 1);
  assert.equal(result.cloud[0]!.inputs.client_name, "จากB");
}

// --- Empty user must not wipe cloud when syncing after another user ---
{
  const result = simulateTwoUserSync({
    userA: [
      makeContract("a1", "SC-2569-09-001", 100),
      makeContract("a2", "SC-2569-09-002", 100),
    ],
    userB: [],
    cloud: [],
  });
  // B starts empty, pulls A's data after A pushes
  assert.equal(result.counts.cloud, 2);
  assert.equal(result.counts.b, 2);
  assert.equal(result.identical, true);
}

// --- Defect demo: if we wrongly pulled empty over local (old bug) ---
{
  const local = {
    version: 1 as const,
    exportedAt: 100,
    contracts: Array.from({ length: 17 }, (_, i) =>
      makeContract(`L${i}`, `SC-2569-09-${String(i + 1).padStart(3, "0")}`, 100)
    ),
  };
  const emptyRemote = {
    version: 1 as const,
    exportedAt: Date.now(),
    contracts: [],
  };
  const decision = decideSyncAction(local, emptyRemote);
  assert.notEqual(decision.action, "pull");
  assert.ok(
    decision.action === "keep-local-push" || decision.action === "push",
    `expected keep-local-push, got ${decision.action}`
  );
}

console.log("two-user sync simulation ok");
console.log(
  JSON.stringify(
    {
      fingerprintSample: contractFingerprint([
        makeContract("x", "SC-2569-09-001", 1),
      ]),
    },
    null,
    2
  )
);
