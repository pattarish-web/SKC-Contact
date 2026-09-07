export type CentralContract = {
  id: string;
  inputs: {
    contract_no?: string;
    contract_date?: string;
    client_name?: string;
    client_address?: string;
    client_authorized?: string;
    start_date?: string;
    end_date?: string;
    [key: string]: unknown;
  };
  createdAt: number;
  updatedAt: number;
  notes: string;
};

export type LibrarySnapshot = {
  version: 1;
  updatedAt: number;
  contracts: CentralContract[];
};

export function emptySnapshot(): LibrarySnapshot {
  return { version: 1, updatedAt: 0, contracts: [] };
}

export function createContractId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `contract_${crypto.randomUUID()}`;
  }
  return `contract_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeContract(raw: unknown, now = Date.now()): CentralContract | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<CentralContract> & { inputs?: CentralContract["inputs"] };
  const inputs =
    row.inputs && typeof row.inputs === "object"
      ? row.inputs
      : (raw as CentralContract["inputs"]);
  const createdAt = Number(row.createdAt);
  const updatedAt = Number(row.updatedAt);
  return {
    id: typeof row.id === "string" && row.id.trim() ? row.id : createContractId(),
    inputs: inputs || {},
    createdAt: Number.isFinite(createdAt) && createdAt > 86_400_000 ? createdAt : now,
    updatedAt: Number.isFinite(updatedAt) && updatedAt > 86_400_000 ? updatedAt : now,
    notes: typeof row.notes === "string" ? row.notes : "",
  };
}

/** Last-write-wins by id, then by contract number. */
export function mergeContracts(
  local: CentralContract[],
  incoming: CentralContract[]
): CentralContract[] {
  const byId = new Map<string, CentralContract>();
  for (const row of [...local, ...incoming]) {
    const prev = byId.get(row.id);
    if (!prev || row.updatedAt >= prev.updatedAt) byId.set(row.id, row);
  }
  const byNumber = new Map<string, CentralContract>();
  for (const row of byId.values()) {
    const key = (row.inputs.contract_no || "").trim() || row.id;
    const prev = byNumber.get(key);
    if (!prev || row.updatedAt >= prev.updatedAt) byNumber.set(key, row);
  }
  return [...byNumber.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function parseImport(raw: unknown, now = Date.now()): CentralContract[] {
  if (Array.isArray(raw)) {
    return raw
      .map((row) => normalizeContract(row, now))
      .filter((row): row is CentralContract => Boolean(row));
  }
  if (raw && typeof raw === "object" && Array.isArray((raw as LibrarySnapshot).contracts)) {
    return parseImport((raw as LibrarySnapshot).contracts, now);
  }
  throw new Error("ไฟล์คลังสัญญาไม่ถูกต้อง");
}

export function upsertContract(
  snapshot: LibrarySnapshot,
  patch: unknown,
  now = Date.now()
): LibrarySnapshot {
  const next = normalizeContract(patch, now);
  if (!next) throw new Error("ข้อมูลสัญญาไม่ถูกต้อง");
  next.updatedAt = now;
  if (!next.createdAt || next.createdAt < 86_400_000) next.createdAt = now;
  return {
    version: 1,
    updatedAt: now,
    contracts: mergeContracts(snapshot.contracts, [next]),
  };
}

export function deleteContract(
  snapshot: LibrarySnapshot,
  id: string,
  now = Date.now()
): LibrarySnapshot {
  return {
    version: 1,
    updatedAt: now,
    contracts: snapshot.contracts.filter((row) => row.id !== id),
  };
}

export function formatUpdatedAt(value: number | null | undefined): string {
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms < 86_400_000) return "—";
  return new Date(ms).toLocaleString("th-TH");
}
