/**
 * Pure sync helpers — no DOM / IndexedDB. Safe to unit-test with two simulated users.
 */
import { normalizeContractNo } from "@/lib/contract";

export type SyncContract = {
  id: string;
  inputs: { contract_no?: string; contract_date?: string; client_name?: string } & Record<
    string,
    unknown
  >;
  createdAt: number;
  updatedAt: number;
  notes?: string;
};

export type SyncSnapshot = {
  version: 1;
  exportedAt: number;
  contracts: SyncContract[];
};

export function contractFingerprint(rows: SyncContract[]): string {
  return rows
    .map((row) => `${row.id}:${row.updatedAt || 0}`)
    .sort()
    .join("|");
}

export function mergeContractLists(
  local: SyncContract[],
  remote: SyncContract[]
): SyncContract[] {
  const byId = new Map<string, SyncContract>();
  for (const row of [...local, ...remote]) {
    const prev = byId.get(row.id);
    if (!prev || (row.updatedAt || 0) >= (prev.updatedAt || 0)) {
      byId.set(row.id, row);
    }
  }

  const byNumber = new Map<string, SyncContract>();
  for (const row of byId.values()) {
    const key =
      normalizeContractNo(
        String(row.inputs.contract_no || ""),
        row.inputs.contract_date ? String(row.inputs.contract_date) : undefined
      ) || row.id;
    const prev = byNumber.get(key);
    if (!prev || (row.updatedAt || 0) >= (prev.updatedAt || 0)) {
      byNumber.set(key, row);
    }
  }

  return [...byNumber.values()].sort(
    (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
  );
}

export type SyncDecision =
  | { action: "noop" }
  | { action: "pull" }
  | { action: "push" }
  | { action: "merge" }
  /** Keep local; do not import remote (protects against empty/partial wipe). */
  | { action: "keep-local-push" };

/**
 * Decide how two devices should reconcile.
 * Hard rules:
 * - Never replace a non-empty local library with a smaller/empty remote.
 * - Never push an empty local library over a non-empty remote.
 */
export function decideSyncAction(
  local: SyncSnapshot,
  remote: SyncSnapshot
): SyncDecision {
  const localCount = local.contracts.length;
  const remoteCount = remote.contracts.length;
  const merged = mergeContractLists(local.contracts, remote.contracts);
  const localFp = contractFingerprint(local.contracts);
  const remoteFp = contractFingerprint(remote.contracts);
  const mergedFp = contractFingerprint(merged);

  if (localCount === 0 && remoteCount === 0) return { action: "noop" };

  // Protect: never wipe local data with empty remote.
  if (localCount > 0 && remoteCount === 0) {
    return { action: "keep-local-push" };
  }

  // Local empty, remote has data → pull.
  if (localCount === 0 && remoteCount > 0) {
    return { action: "pull" };
  }

  // Protect: remote has fewer contracts than local → merge (don't discard local extras).
  if (remoteCount < localCount) {
    return mergedFp === localFp ? { action: "keep-local-push" } : { action: "merge" };
  }

  // Local has fewer → merge so we gain remote extras (and keep any unique local).
  if (localCount < remoteCount) {
    return { action: "merge" };
  }

  // Same count but different sets → merge.
  if (mergedFp !== localFp || mergedFp !== remoteFp) {
    // Remote is strict superset equal to merge and newer → pull is fine.
    if (
      remote.exportedAt > local.exportedAt + 500 &&
      mergedFp === remoteFp &&
      mergedFp !== localFp
    ) {
      return { action: "pull" };
    }
    if (
      local.exportedAt > remote.exportedAt + 500 &&
      mergedFp === localFp &&
      mergedFp !== remoteFp
    ) {
      return { action: "push" };
    }
    return { action: "merge" };
  }

  return { action: "noop" };
}

/** Simulate two users editing then syncing (pure). */
export function simulateTwoUserSync(args: {
  userA: SyncContract[];
  userB: SyncContract[];
  cloud?: SyncContract[];
}): {
  afterA: SyncContract[];
  afterB: SyncContract[];
  cloud: SyncContract[];
  identical: boolean;
  counts: { a: number; b: number; cloud: number };
} {
  let cloud: SyncSnapshot = {
    version: 1,
    exportedAt: args.cloud?.length
      ? Math.max(...(args.cloud.map((c) => c.updatedAt) || [0]))
      : 0,
    contracts: args.cloud ? [...args.cloud] : [],
  };

  let a: SyncSnapshot = {
    version: 1,
    exportedAt: contentStamp(args.userA),
    contracts: [...args.userA],
  };
  let b: SyncSnapshot = {
    version: 1,
    exportedAt: contentStamp(args.userB),
    contracts: [...args.userB],
  };

  // A syncs first
  ({ local: a, cloud } = applyDecision(a, cloud));
  // B syncs second
  ({ local: b, cloud } = applyDecision(b, cloud));
  // A syncs again to catch B's additions
  ({ local: a, cloud } = applyDecision(a, cloud));
  // B syncs again
  ({ local: b, cloud } = applyDecision(b, cloud));

  const identical =
    contractFingerprint(a.contracts) === contractFingerprint(b.contracts) &&
    contractFingerprint(a.contracts) === contractFingerprint(cloud.contracts);

  return {
    afterA: a.contracts,
    afterB: b.contracts,
    cloud: cloud.contracts,
    identical,
    counts: {
      a: a.contracts.length,
      b: b.contracts.length,
      cloud: cloud.contracts.length,
    },
  };
}

function contentStamp(rows: SyncContract[]): number {
  let max = 0;
  for (const row of rows) {
    max = Math.max(max, row.updatedAt || 0, row.createdAt || 0);
  }
  return max;
}

function applyDecision(
  local: SyncSnapshot,
  cloud: SyncSnapshot
): { local: SyncSnapshot; cloud: SyncSnapshot } {
  const decision = decideSyncAction(local, cloud);
  if (decision.action === "noop") return { local, cloud };

  if (decision.action === "pull") {
    return {
      local: {
        ...cloud,
        exportedAt: Math.max(cloud.exportedAt, Date.now()),
      },
      cloud,
    };
  }

  if (decision.action === "push" || decision.action === "keep-local-push") {
    // Never push empty over non-empty cloud.
    if (local.contracts.length === 0 && cloud.contracts.length > 0) {
      return { local, cloud };
    }
    const next = {
      version: 1 as const,
      exportedAt: Date.now(),
      contracts: local.contracts,
    };
    return { local: next, cloud: next };
  }

  // merge
  const merged = mergeContractLists(local.contracts, cloud.contracts);
  const next = {
    version: 1 as const,
    exportedAt: Date.now(),
    contracts: merged,
  };
  return { local: next, cloud: next };
}

export function makeContract(
  id: string,
  no: string,
  updatedAt: number,
  client = "ลูกค้า"
): SyncContract {
  return {
    id,
    inputs: {
      contract_no: no,
      contract_date: "2026-09-01",
      client_name: client,
    },
    createdAt: updatedAt - 1000,
    updatedAt,
    notes: "",
  };
}
