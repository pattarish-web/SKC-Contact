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

const JSONBLOB_API = "https://jsonblob.com/api/jsonBlob";
const MAX_CLOUD_ATTACHMENT_BYTES = 400_000;
const MAX_CLOUD_TOTAL_BYTES = 1_800_000;

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
    attachments.push({
      id: row.id,
      contractId: row.contractId,
      name: row.name,
      mimeType: row.mimeType,
      size: row.size,
      createdAt: row.createdAt,
      dataBase64,
    });
    total += row.size;
  }

  return {
    version: LIBRARY_SNAPSHOT_VERSION,
    exportedAt: Date.now(),
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
    // Uint8Array is a valid BlobPart at runtime
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

function extractBlobId(location: string | null): string | null {
  if (!location) return null;
  const parts = location.split("/").filter(Boolean);
  return parts[parts.length - 1] || null;
}

export async function pushLibraryToCloud(
  syncId?: string | null,
  options?: { forceNew?: boolean }
): Promise<string> {
  const snapshot = await buildLibrarySnapshot({ forCloud: true });
  const existing = options?.forceNew ? null : syncId || getSyncId();

  if (existing) {
    const res = await fetch(`${JSONBLOB_API}/${existing}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(snapshot),
    });
    if (!res.ok) {
      throw new Error("อัปเดตคลังบนคลาวด์ไม่สำเร็จ");
    }
    setSyncId(existing);
    return existing;
  }

  const res = await fetch(JSONBLOB_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(snapshot),
  });
  if (!res.ok) {
    throw new Error("สร้างลิงก์ซิงก์ไม่สำเร็จ");
  }
  const id =
    extractBlobId(res.headers.get("Location")) ||
    extractBlobId(res.headers.get("location"));
  if (!id) {
    throw new Error("สร้างลิงก์ซิงก์ไม่สำเร็จ (ไม่ได้รับรหัสคลัง)");
  }
  setSyncId(id);
  return id;
}

export async function pullLibraryFromCloud(
  syncId: string
): Promise<LibrarySnapshot> {
  const res = await fetch(`${JSONBLOB_API}/${syncId}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error("โหลดคลังจากลิงก์ซิงก์ไม่สำเร็จ");
  }
  const snapshot = parseLibrarySnapshot(await res.json());
  setSyncId(syncId);
  return snapshot;
}
