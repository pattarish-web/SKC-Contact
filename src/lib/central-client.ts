"use client";

import {
  listAllAttachments,
  replaceLibraryData,
  type SavedContract,
} from "@/lib/contracts-db";
import type { LibrarySnapshot as CentralSnapshot } from "@/lib/central-store";

const KEY =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_LIBRARY_KEY) ||
  "skc-local";
const API =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_CENTRAL_API) || "";

function apiUrl(path: string): string {
  return `${API}${path}`;
}

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-library-key": KEY,
  };
}

function asSaved(row: CentralSnapshot["contracts"][number]): SavedContract {
  return {
    id: row.id,
    inputs: row.inputs as SavedContract["inputs"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    notes: row.notes || "",
  };
}

export function fingerprint(rows: SavedContract[]): string {
  return rows
    .map((row) => `${row.id}:${row.updatedAt || 0}`)
    .sort()
    .join("|");
}

export async function applyCentralContracts(
  contracts: SavedContract[]
): Promise<SavedContract[]> {
  const attachments = await listAllAttachments();
  const ids = new Set(contracts.map((row) => row.id));
  await replaceLibraryData(
    contracts,
    attachments.filter((row) => ids.has(row.contractId))
  );
  return contracts;
}

export async function pullCentralLibrary(): Promise<SavedContract[]> {
  const res = await fetch(apiUrl("/api/library"), {
    cache: "no-store",
    headers: headers(),
  });
  if (!res.ok) {
    throw new Error("ดึงคลังกลางไม่สำเร็จ");
  }
  const snapshot = (await res.json()) as CentralSnapshot;
  return (snapshot.contracts || []).map(asSaved);
}

export async function saveContractToCentral(
  row: SavedContract
): Promise<SavedContract[]> {
  const res = await fetch(apiUrl("/api/library"), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    throw new Error("บันทึกคลังกลางไม่สำเร็จ");
  }
  const snapshot = (await res.json()) as CentralSnapshot;
  return (snapshot.contracts || []).map(asSaved);
}

export async function deleteContractOnCentral(
  id: string
): Promise<SavedContract[]> {
  const res = await fetch(
    apiUrl(`/api/library/contracts/${encodeURIComponent(id)}`),
    { method: "DELETE", headers: headers() }
  );
  if (!res.ok) {
    throw new Error("ลบจากคลังกลางไม่สำเร็จ");
  }
  const snapshot = (await res.json()) as CentralSnapshot;
  return (snapshot.contracts || []).map(asSaved);
}

export async function replaceCentralLibrary(
  contracts: SavedContract[]
): Promise<SavedContract[]> {
  const res = await fetch(apiUrl("/api/library"), {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ version: 1, contracts }),
  });
  if (!res.ok) {
    throw new Error("อัปเดตคลังกลางไม่สำเร็จ");
  }
  const snapshot = (await res.json()) as CentralSnapshot;
  return (snapshot.contracts || []).map(asSaved);
}

export function subscribeCentral(
  onSnapshot: (contracts: SavedContract[]) => void,
  onStatus?: (connected: boolean) => void
): () => void {
  const source = new EventSource(
    apiUrl(`/api/library/stream?key=${encodeURIComponent(KEY)}`)
  );
  source.onopen = () => onStatus?.(true);
  source.onerror = () => onStatus?.(false);
  source.onmessage = (event) => {
    try {
      const snapshot = JSON.parse(event.data) as CentralSnapshot;
      if (snapshot && Array.isArray(snapshot.contracts)) {
        onStatus?.(true);
        onSnapshot(snapshot.contracts.map(asSaved));
      }
    } catch {
      // keep-alive
    }
  };
  return () => source.close();
}
