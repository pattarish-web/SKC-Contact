"use client";

import {
  listAllAttachments,
  replaceLibraryData,
  type SavedContract,
} from "@/lib/contracts-db";
import type { LibrarySnapshot as CentralSnapshot } from "@/lib/central-store";
import {
  getSheetsWebAppUrl,
  gvizUrl,
  hasSheetsWriter,
  parseGvizText,
  rowsToContracts,
  SHEET_ID,
  SHEET_NAME,
} from "@/lib/sheets";

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

function snapshotContracts(data: CentralSnapshot): SavedContract[] {
  return (data.contracts || []).map(asSaved);
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
    const cleanup = () => {
      script.remove();
      try {
        delete (window as unknown as Record<string, unknown>)[callback];
      } catch {
        (window as unknown as Record<string, unknown>)[callback] = undefined;
      }
    };
    (window as unknown as Record<string, (payload: unknown) => void>)[callback] = (
      payload: unknown
    ) => {
      cleanup();
      try {
        const text = `google.visualization.Query.setResponse(${JSON.stringify(payload)});`;
        resolve(rowsToContracts(parseGvizText(text)).map(asSaved));
      } catch (error) {
        reject(error);
      }
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("ดึงคลังจาก Google Sheet ไม่สำเร็จ"));
    };
    const sheetQuery = sheetName
      ? `&sheet=${encodeURIComponent(sheetName)}`
      : "";
    script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=${encodeURIComponent(`out:json;responseHandler:${callback}`)}${sheetQuery}&headers=1&_=${Date.now()}`;
    document.body.appendChild(script);
  });
}

async function postToWebApp(body: unknown): Promise<SavedContract[]> {
  const url = getSheetsWebAppUrl();
  if (!url) {
    throw new Error("ยังไม่ได้วางลิงก์เว็บแอปของ Google Sheet");
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
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
  row: SavedContract
): Promise<SavedContract[]> {
  return postToWebApp({ action: "save", payload: row });
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

export function subscribeCentral(
  onSnapshot: (contracts: SavedContract[]) => void,
  onStatus?: (connected: boolean) => void
): () => void {
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      const rows = await pullCentralLibrary();
      if (stopped) return;
      onStatus?.(true);
      onSnapshot(rows);
    } catch {
      if (!stopped) onStatus?.(false);
    }
  };
  void tick();
  const timer = window.setInterval(() => {
    void tick();
  }, 4000);
  return () => {
    stopped = true;
    window.clearInterval(timer);
  };
}
