"use client";

import type { ContractInputs } from "@/lib/contract";
import {
  createId,
  listAllAttachments,
  listContracts,
  replaceLibraryData,
  type AttachmentMeta,
  type ContractAttachment,
  type SavedContract,
} from "@/lib/contracts-db";
import { withBasePath } from "@/lib/paths";

export const LIBRARY_SYNC_KEY = "sanggan-clean-library-sync-id";
export const LIBRARY_SNAPSHOT_VERSION = 1 as const;

export type ExportedAttachment = AttachmentMeta & {
  dataBase64: string;
};

export type LibrarySnapshot = {
  version: typeof LIBRARY_SNAPSHOT_VERSION;
  exportedAt: number;
  contracts: SavedContract[];
  attachments: ExportedAttachment[];
};

type SyncConfig = {
  syncId?: string;
  provider?: string;
};

/** Free JSON bin with CORS + overwrite (PUT). ~100KB payload limit. */
const CLOUD_API = "https://extendsclass.com/api/json-storage/bin";
/** Keep cloud payload under the host limit; attachments stay local / in file export. */
const MAX_CLOUD_ATTACHMENT_BYTES = 12_000;
const MAX_CLOUD_TOTAL_BYTES = 90_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return bytesToBase64(new Uint8Array(buffer));
}

function contentTimestamp(
  contracts: SavedContract[],
  attachments: { createdAt?: number }[]
): number {
  let max = 0;
  for (const row of contracts) {
    max = Math.max(max, row.updatedAt || 0, row.createdAt || 0);
  }
  for (const row of attachments) {
    max = Math.max(max, row.createdAt || 0);
  }
  return max;
}

export function getSyncId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LIBRARY_SYNC_KEY);
}

export function setSyncId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) window.localStorage.setItem(LIBRARY_SYNC_KEY, id);
  else window.localStorage.removeItem(LIBRARY_SYNC_KEY);
}

export function readSyncIdFromLocation(
  search = typeof window !== "undefined" ? window.location.search : ""
): string | null {
  try {
    const params = new URLSearchParams(search);
    const id = params.get("sync")?.trim();
    return id || null;
  } catch {
    return null;
  }
}

export function buildShareUrl(syncId: string): string {
  if (typeof window === "undefined") {
    return `?sync=${encodeURIComponent(syncId)}`;
  }
  const url = new URL(window.location.href);
  url.searchParams.set("sync", syncId);
  url.hash = "";
  return url.toString();
}

export async function loadSharedSyncConfig(): Promise<string | null> {
  try {
    const res = await fetch(withBasePath("/sync-config.json"), {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as SyncConfig;
    const id = data.syncId?.trim();
    return id || null;
  } catch {
    return null;
  }
}

/**
 * Company site always binds to the shared sync id from sync-config.json.
 * Optional `?sync=` overrides for a custom bin.
 */
export async function resolveSyncId(): Promise<string | null> {
  const fromUrl = readSyncIdFromLocation();
  if (fromUrl) {
    setSyncId(fromUrl);
    return fromUrl;
  }
  const shared = await loadSharedSyncConfig();
  if (shared) {
    setSyncId(shared);
    return shared;
  }
  return getSyncId();
}

export async function buildLibrarySnapshot(options?: {
  forCloud?: boolean;
}): Promise<LibrarySnapshot> {
  const contracts = await listContracts();
  const attachmentsRaw = await listAllAttachments();
  const attachments: ExportedAttachment[] = [];
  let total = 0;

  for (const row of attachmentsRaw) {
    if (options?.forCloud) {
      if (row.size > MAX_CLOUD_ATTACHMENT_BYTES) continue;
      if (total + row.size > MAX_CLOUD_TOTAL_BYTES) continue;
    }
    const dataBase64 = await blobToBase64(row.blob);
    const encodedSize = Math.ceil((dataBase64.length * 3) / 4);
    if (options?.forCloud && total + encodedSize > MAX_CLOUD_TOTAL_BYTES) {
      continue;
    }
    attachments.push({
      id: row.id,
      contractId: row.contractId,
      name: row.name,
      mimeType: row.mimeType,
      size: row.size,
      createdAt: row.createdAt,
      dataBase64,
    });
    total += options?.forCloud ? encodedSize : row.size;
  }

  return {
    version: LIBRARY_SNAPSHOT_VERSION,
    exportedAt: contentTimestamp(contracts, attachments),
    contracts,
    attachments,
  };
}

export function parseLibrarySnapshot(raw: unknown): LibrarySnapshot {
  if (!raw || typeof raw !== "object") {
    throw new Error("ไฟล์คลังสัญญาไม่ถูกต้อง");
  }
  const data = raw as Partial<LibrarySnapshot>;
  if (!Array.isArray(data.contracts)) {
    throw new Error("ไฟล์คลังสัญญาไม่ถูกต้อง (ไม่พบรายการสัญญา)");
  }
  return {
    version: LIBRARY_SNAPSHOT_VERSION,
    exportedAt:
      typeof data.exportedAt === "number" ? data.exportedAt : Date.now(),
    contracts: data.contracts as SavedContract[],
    attachments: Array.isArray(data.attachments)
      ? (data.attachments as ExportedAttachment[])
      : [],
  };
}

export async function importLibrarySnapshot(
  snapshot: LibrarySnapshot
): Promise<{ contracts: number; attachments: number }> {
  const contracts: SavedContract[] = snapshot.contracts.map((row) => ({
    id: row.id || createId("contract"),
    inputs: row.inputs as ContractInputs,
    createdAt: row.createdAt || Date.now(),
    updatedAt: row.updatedAt || Date.now(),
    notes: row.notes || "",
  }));

  const attachments: ContractAttachment[] = [];
  for (const row of snapshot.attachments) {
    if (!row.dataBase64) continue;
    const bytes = base64ToBytes(row.dataBase64);
    const blob = new Blob([new Uint8Array(bytes)], {
      type: row.mimeType || "application/octet-stream",
    });
    attachments.push({
      id: row.id || createId("file"),
      contractId: row.contractId,
      name: row.name,
      mimeType: row.mimeType || "application/octet-stream",
      size: row.size || bytes.byteLength,
      blob,
      createdAt: row.createdAt || Date.now(),
    });
  }

  await replaceLibraryData(contracts, attachments);
  return {
    contracts: contracts.length,
    attachments: attachments.length,
  };
}

export async function downloadLibraryFile(): Promise<void> {
  const snapshot = await buildLibrarySnapshot();
  const blob = new Blob([JSON.stringify(snapshot)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sanggan-clean-library-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importLibraryFile(file: File): Promise<{
  contracts: number;
  attachments: number;
}> {
  const text = await file.text();
  const snapshot = parseLibrarySnapshot(JSON.parse(text));
  return importLibrarySnapshot(snapshot);
}

async function cloudGet(syncId: string): Promise<LibrarySnapshot> {
  const res = await fetch(`${CLOUD_API}/${encodeURIComponent(syncId)}?t=${Date.now()}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error("โหลดคลังคลาวด์ไม่สำเร็จ");
  }
  return parseLibrarySnapshot(await res.json());
}

async function cloudPut(syncId: string, snapshot: LibrarySnapshot): Promise<void> {
  const body = JSON.stringify(snapshot);
  if (body.length > MAX_CLOUD_TOTAL_BYTES) {
    // Drop attachments and retry once for contract text only.
    const slim: LibrarySnapshot = {
      ...snapshot,
      attachments: [],
    };
    const slimBody = JSON.stringify(slim);
    if (slimBody.length > MAX_CLOUD_TOTAL_BYTES) {
      throw new Error(
        "คลังใหญ่เกินขีดจำกัดคลาวด์ — ส่งออกไฟล์แทน หรือลบสัญญาเก่าบางส่วน"
      );
    }
    const res = await fetch(`${CLOUD_API}/${encodeURIComponent(syncId)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: slimBody,
    });
    if (!res.ok) {
      throw new Error("อัปเดตคลังคลาวด์ไม่สำเร็จ");
    }
    return;
  }

  const res = await fetch(`${CLOUD_API}/${encodeURIComponent(syncId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body,
  });
  if (!res.ok) {
    throw new Error("อัปเดตคลังคลาวด์ไม่สำเร็จ");
  }
}

async function cloudCreate(snapshot: LibrarySnapshot): Promise<string> {
  const res = await fetch(CLOUD_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(snapshot),
  });
  if (!res.ok) {
    throw new Error("สร้างคลังคลาวด์ไม่สำเร็จ");
  }
  const data = (await res.json()) as { id?: string };
  if (!data.id) {
    throw new Error("สร้างคลังคลาวด์ไม่สำเร็จ (ไม่ได้รับรหัส)");
  }
  return data.id;
}

export async function pushLibraryToCloud(
  syncId?: string | null,
  options?: { forceNew?: boolean }
): Promise<string> {
  const snapshot = await buildLibrarySnapshot({ forCloud: true });
  snapshot.exportedAt = Math.max(snapshot.exportedAt, Date.now());
  const existing = options?.forceNew ? null : syncId || getSyncId();

  if (existing) {
    await cloudPut(existing, snapshot);
    setSyncId(existing);
    return existing;
  }

  const id = await cloudCreate(snapshot);
  setSyncId(id);
  return id;
}

export async function pullLibraryFromCloud(
  syncId: string
): Promise<LibrarySnapshot> {
  const snapshot = await cloudGet(syncId);
  setSyncId(syncId);
  return snapshot;
}

/** Pull/push so this device matches the shared company library. */
export async function syncLibraryWithCloud(
  syncId: string
): Promise<"pulled" | "pushed" | "noop"> {
  const remote = await pullLibraryFromCloud(syncId);
  const local = await buildLibrarySnapshot();
  const localStamp = local.exportedAt;
  const remoteStamp = remote.exportedAt || 0;

  if (remote.contracts.length > 0 && local.contracts.length === 0) {
    await importLibrarySnapshot(remote);
    return "pulled";
  }
  if (local.contracts.length > 0 && remote.contracts.length === 0) {
    await pushLibraryToCloud(syncId);
    return "pushed";
  }
  if (remoteStamp > localStamp) {
    await importLibrarySnapshot(remote);
    return "pulled";
  }
  if (localStamp > remoteStamp) {
    await pushLibraryToCloud(syncId);
    return "pushed";
  }
  return "noop";
}
