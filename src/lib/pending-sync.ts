export type PendingContract = {
  id: string;
  inputs: {
    contract_no?: string;
    contract_date?: string;
    [key: string]: unknown;
  };
  createdAt: number;
  updatedAt: number;
  notes: string;
};

export type PendingOp =
  | { type: "save"; row: PendingContract; removeIds?: string[] }
  | { type: "delete"; id: string }
  | { type: "replace"; rows: PendingContract[] };

export const PENDING_OPS_KEY = "sanggan-clean-pending-ops";

function contractNo(row: PendingContract): string {
  return String(row.inputs.contract_no || "").trim();
}

export function applyPendingOps<T extends PendingContract>(
  remote: T[],
  ops: PendingOp[]
): T[] {
  let next = remote.slice() as PendingContract[];
  for (const op of ops) {
    if (op.type === "replace") {
      next = op.rows.slice();
      continue;
    }
    if (op.type === "delete") {
      next = next.filter((row) => row.id !== op.id);
      continue;
    }
    const remove = new Set(op.removeIds || []);
    next = next.filter((row) => row.id !== op.row.id && !remove.has(row.id));
    const number = contractNo(op.row);
    if (number) {
      next = next.filter(
        (row) => row.id === op.row.id || contractNo(row) !== number
      );
    }
    next.push(op.row);
  }
  return next.sort((a, b) => b.updatedAt - a.updatedAt) as T[];
}

export function enqueuePendingOp(
  ops: PendingOp[],
  incoming: PendingOp
): PendingOp[] {
  if (incoming.type === "replace") {
    return [incoming];
  }
  if (incoming.type === "delete") {
    return [
      ...ops.filter((op) => {
        if (op.type === "save") return op.row.id !== incoming.id;
        if (op.type === "delete") return op.id !== incoming.id;
        return true;
      }),
      incoming,
    ];
  }
  return [
    ...ops.filter((op) => {
      if (op.type === "save") return op.row.id !== incoming.row.id;
      if (op.type === "delete") return op.id !== incoming.row.id;
      return true;
    }),
    incoming,
  ];
}

export function loadPendingOps(): PendingOp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PENDING_OPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingOp[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistPendingOps(ops: PendingOp[]): void {
  if (typeof window === "undefined") return;
  try {
    if (ops.length === 0) {
      window.localStorage.removeItem(PENDING_OPS_KEY);
      return;
    }
    window.localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(ops));
  } catch {
    // ignore quota / private mode
  }
}

export function queuePendingOp(op: PendingOp): PendingOp[] {
  const next = enqueuePendingOp(loadPendingOps(), op);
  persistPendingOps(next);
  return next;
}

export function clearPendingOps(): void {
  persistPendingOps([]);
}

export function dropPendingForId(id: string): PendingOp[] {
  const next = loadPendingOps().filter((op) => {
    if (op.type === "save") return op.row.id !== id;
    if (op.type === "delete") return op.id !== id;
    return true;
  });
  persistPendingOps(next);
  return next;
}
