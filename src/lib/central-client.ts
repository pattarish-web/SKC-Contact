"use client";

import {
  listAllAttachments,
  replaceLibraryData,
  type SavedContract,
} from "@/lib/contracts-db";
import type { LibrarySnapshot as CentralSnapshot } from "@/lib/central-store";
import { emptyInputs } from "@/lib/contract";
import {
  applyPendingOps,
  clearPendingOps,
  loadPendingOps,
  persistPendingOps,
  type PendingOp,
} from "@/lib/pending-sync";
import {
  getSheetsWebAppUrl,
  getSheetsWriteToken,
  gvizUrl,
  hasSheetsWriter,
  parseGvizText,
  rowsToContracts,
  SHEET_ID,
  SHEET_NAME,
} from "@/lib/sheets";

const JSONP_TIMEOUT_MS = 12_000;

export function asSaved(row: {
  id: string;
  inputs: Record<string, unknown> | SavedContract["inputs"];
  createdAt: number;
  updatedAt: number;
  notes?: string;
}): SavedContract {
  return {
    id: row.id,
    inputs: emptyInputs(row.inputs as Partial<SavedContract["inputs"]>),
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

export function mergeRemoteWithPending(remote: SavedContract[]): SavedContract[] {
  return applyPendingOps(remote, loadPendingOps()).map(asSaved);
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

function snapshotContracts(data: CentralSnapshot): SavedContract[] {
  return (data.contracts || []).map((row) =>
    asSaved({
      id: row.id,
      inputs: row.inputs as SavedContract["inputs"],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      notes: row.notes,
    })
  );
}

async function fetchGvizContracts(): Promise<SavedContract[]> {
  if (typeof document !== "undefined") {
    try {
      return await fetchGvizJsonp(SHEET_NAME);
    } catch {
      return fetchGvizJsonp();
    }
  }
  for (const name of [SHEET_NAME, undefined]) {
    const res = await fetch(gvizUrl(name), { cache: "no-store" });
    if (!res.ok) continue;
    try {
      return rowsToContracts(parseGvizText(await res.text())).map(asSaved);
    } catch {
      // try next tab
    }
  }
  throw new Error("ดึงคลังจาก Google Sheet ไม่สำเร็จ");
}

function fetchGvizJsonp(sheetName?: string): Promise<SavedContract[]> {
  return new Promise((resolve, reject) => {
    const callback = `skcGviz_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const script = document.createElement("script");
    let settled = false;
    const cleanup = () => {
      script.remove();
      try {
        delete (window as unknown as Record<string, unknown>)[callback];
      } catch {
        (window as unknown as Record<string, unknown>)[callback] = undefined;
      }
    };
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      fn();
    };
    (window as unknown as Record<string, (payload: unknown) => void>)[callback] = (
      payload: unknown
    ) => {
      finish(() => {
        try {
          const text = `google.visualization.Query.setResponse(${JSON.stringify(payload)});`;
          resolve(rowsToContracts(parseGvizText(text)).map(asSaved));
        } catch (error) {
          reject(error);
        }
      });
    };
    script.onerror = () => {
      finish(() => reject(new Error("ดึงคลังจาก Google Sheet ไม่สำเร็จ")));
    };
    const timer = window.setTimeout(() => {
      finish(() => reject(new Error("ดึงคลังจาก Google Sheet หมดเวลา")));
    }, JSONP_TIMEOUT_MS);
    const sheetQuery = sheetName
      ? `&sheet=${encodeURIComponent(sheetName)}`
      : "";
    script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=${encodeURIComponent(`out:json;responseHandler:${callback}`)}${sheetQuery}&headers=1&_=${Date.now()}`;
    document.body.appendChild(script);
  });
}

function withToken(body: Record<string, unknown>): Record<string, unknown> {
  const token = getSheetsWriteToken();
  if (!token) return body;
  return { ...body, token };
}

async function postToWebApp(body: Record<string, unknown>): Promise<SavedContract[]> {
  const url = getSheetsWebAppUrl();
  if (!url) {
    throw new Error("ยังไม่ได้วางลิงก์เว็บแอปของ Google Sheet");
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(withToken(body)),
    redirect: "follow",
  });
  const text = await res.text();
  let snapshot: CentralSnapshot & { error?: string };
  try {
    snapshot = JSON.parse(text) as CentralSnapshot & { error?: string };
  } catch {
    throw new Error("ชีตตอบกลับไม่ใช่ JSON — ตรวจว่า Deploy เป็น Web app แล้ว");
  }
  if (snapshot.error) {
    throw new Error(snapshot.error);
  }
  if (!Array.isArray(snapshot.contracts)) {
    throw new Error("บันทึกคลังชีตไม่สำเร็จ");
  }
  return snapshotContracts(snapshot);
}

async function listFromWebApp(): Promise<SavedContract[]> {
  const url = getSheetsWebAppUrl();
  if (!url) {
    throw new Error("ยังไม่ได้วางลิงก์เว็บแอปของ Google Sheet");
  }
  const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}action=list&_=${Date.now()}`, {
    cache: "no-store",
    redirect: "follow",
  });
  const text = await res.text();
  const snapshot = JSON.parse(text) as CentralSnapshot & { error?: string };
  if (snapshot.error) throw new Error(snapshot.error);
  return snapshotContracts(snapshot);
}

export async function pullCentralLibrary(): Promise<SavedContract[]> {
  if (hasSheetsWriter()) {
    try {
      return await listFromWebApp();
    } catch {
      return fetchGvizContracts();
    }
  }
  return fetchGvizContracts();
}

export async function saveContractToCentral(
  row: SavedContract,
  removeIds: string[] = []
): Promise<SavedContract[]> {
  return postToWebApp({
    action: "save",
    payload: row,
    removeIds,
  });
}

export async function deleteContractOnCentral(
  id: string
): Promise<SavedContract[]> {
  return postToWebApp({ action: "delete", id });
}

export async function replaceCentralLibrary(
  contracts: SavedContract[]
): Promise<SavedContract[]> {
  return postToWebApp({ action: "replace", payload: contracts });
}

export async function flushPendingOps(): Promise<SavedContract[] | null> {
  const ops = loadPendingOps();
  if (ops.length === 0) return null;
  const remaining: PendingOp[] = [];
  let last: SavedContract[] | null = null;
  for (let i = 0; i < ops.length; i += 1) {
    const op = ops[i]!;
    try {
      if (op.type === "save") {
        last = await saveContractToCentral(asSaved(op.row), op.removeIds || []);
      } else if (op.type === "delete") {
        last = await deleteContractOnCentral(op.id);
      } else {
        last = await replaceCentralLibrary(op.rows.map(asSaved));
      }
    } catch {
      remaining.push(...ops.slice(i));
      persistPendingOps(remaining);
      return last;
    }
  }
  clearPendingOps();
  return last;
}

export function subscribeCentral(
  onSnapshot: (contracts: SavedContract[]) => void,
  onStatus?: (connected: boolean, pending: boolean) => void
): () => void {
  let stopped = false;
  let inFlight = false;
  let queued = false;
  let generation = 0;

  const tick = async () => {
    if (stopped) return;
    if (inFlight) {
      queued = true;
      return;
    }
    inFlight = true;
    const gen = ++generation;
    try {
      const flushed = await flushPendingOps();
      const rows = flushed ?? (await pullCentralLibrary());
      if (stopped || gen !== generation) return;
      const merged = mergeRemoteWithPending(rows);
      onStatus?.(true, loadPendingOps().length > 0);
      onSnapshot(merged);
    } catch {
      if (!stopped) onStatus?.(false, loadPendingOps().length > 0);
    } finally {
      inFlight = false;
      if (queued && !stopped) {
        queued = false;
        void tick();
      }
    }
  };

  void tick();
  const timer = window.setInterval(() => {
    void tick();
  }, 4000);

  const onWebApp = () => {
    generation += 1;
    void tick();
  };
  window.addEventListener("skc-sheets-webapp", onWebApp);

  return () => {
    stopped = true;
    window.clearInterval(timer);
    window.removeEventListener("skc-sheets-webapp", onWebApp);
  };
}
