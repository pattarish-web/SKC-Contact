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
import {
  canUseSharedFolderSync,
  hasSharedFolder,
  readSharedLibrary,
  writeSharedLibrary,
} from "@/lib/folder-sync";
import { withBasePath } from "@/lib/paths";
import {
  decideSyncAction,
  mergeContractLists as mergeSyncContracts,
  type SyncContract,
  type SyncSnapshot,
} from "@/lib/sync-core";

export const LIBRARY_SYNC_KEY = "sanggan-clean-library-sync-id";
export const LIBRARY_BACKUP_KEY = "sanggan-clean-library-safety-backup";
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

type CloudEnvelope = {
  version: typeof LIBRARY_SNAPSHOT_VERSION;
  exportedAt: number;
  encoding?: "gzip-base64";
  payload?: string;
  contracts?: SavedContract[];
  attachments?: ExportedAttachment[];
};

/** Free JSON bin with CORS + overwrite (PUT). ~100KB payload limit. */
const CLOUD_API = "https://extendsclass.com/api/json-storage/bin";
const MAX_CLOUD_ENVELOPE_BYTES = 95_000;

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

function contentTimestamp(contracts: SavedContract[]): number {
  let max = 0;
  for (const row of contracts) {
    max = Math.max(max, row.updatedAt || 0, row.createdAt || 0);
  }
  return max;
}

function supportsGzip(): boolean {
  return (
    typeof CompressionStream !== "undefined" &&
    typeof DecompressionStream !== "undefined"
  );
}

async function gzipToBase64(text: string): Promise<string> {
  const stream = new Blob([text])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  return bytesToBase64(new Uint8Array(buffer));
}

async function gunzipFromBase64(payload: string): Promise<string> {
  const bytes = base64ToBytes(payload);
  const stream = new Blob([new Uint8Array(bytes)])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
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
  const attachments: ExportedAttachment[] = [];

  // Cloud sync is contracts-only so every device gets the full text library.
  // Attachments stay on each machine / in file export.
  if (!options?.forCloud) {
    const attachmentsRaw = await listAllAttachments();
    for (const row of attachmentsRaw) {
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
    }
  }

  return {
    version: LIBRARY_SNAPSHOT_VERSION,
    exportedAt: contentTimestamp(contracts),
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

function normalizeContracts(rows: SavedContract[]): SavedContract[] {
  return rows.map((row) => ({
    id: row.id || createId("contract"),
    inputs: row.inputs as ContractInputs,
    createdAt: row.createdAt || Date.now(),
    updatedAt: row.updatedAt || Date.now(),
    notes: row.notes || "",
  }));
}

/** Last-write-wins by id, then collapse duplicate contract numbers. */
export function mergeContractLists(
  local: SavedContract[],
  remote: SavedContract[]
): SavedContract[] {
  return mergeSyncContracts(
    local as unknown as SyncContract[],
    remote as unknown as SyncContract[]
  ) as unknown as SavedContract[];
}

function toSyncSnapshot(snapshot: LibrarySnapshot): SyncSnapshot {
  return {
    version: 1,
    exportedAt: snapshot.exportedAt || 0,
    contracts: snapshot.contracts as unknown as SyncContract[],
  };
}

export async function backupLocalLibraryIfNonEmpty(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const snapshot = await buildLibrarySnapshot({ forCloud: true });
    if (snapshot.contracts.length === 0) return;
    window.localStorage.setItem(
      LIBRARY_BACKUP_KEY,
      JSON.stringify(snapshot)
    );
  } catch {
    // ignore quota
  }
}

export async function restoreLibraryBackupIfLocalEmpty(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const local = await listContracts();
    if (local.length > 0) return false;
    const raw = window.localStorage.getItem(LIBRARY_BACKUP_KEY);
    if (!raw) return false;
    const snapshot = parseLibrarySnapshot(JSON.parse(raw));
    if (snapshot.contracts.length === 0) return false;
    await importLibrarySnapshot(snapshot, { preserveLocalAttachments: true });
    return true;
  } catch {
    return false;
  }
}

function contractFingerprint(rows: SavedContract[]): string {
  return rows
    .map((row) => `${row.id}:${row.updatedAt || 0}`)
    .sort()
    .join("|");
}

export async function importLibrarySnapshot(
  snapshot: LibrarySnapshot,
  options?: { preserveLocalAttachments?: boolean }
): Promise<{ contracts: number; attachments: number }> {
  const contracts = normalizeContracts(snapshot.contracts);

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

  if (options?.preserveLocalAttachments) {
    const localAttachments = await listAllAttachments();
    const ids = new Set(contracts.map((row) => row.id));
    const kept = localAttachments.filter((row) => ids.has(row.contractId));
    const seen = new Set(attachments.map((row) => row.id));
    for (const row of kept) {
      if (!seen.has(row.id)) attachments.push(row);
    }
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

async function encodeCloudBody(snapshot: LibrarySnapshot): Promise<string> {
  const cloudSnapshot: LibrarySnapshot = {
    ...snapshot,
    attachments: [],
    exportedAt: Math.max(snapshot.exportedAt, Date.now()),
  };
  const plain = JSON.stringify(cloudSnapshot);

  if (supportsGzip()) {
    const payload = await gzipToBase64(plain);
    const envelope: CloudEnvelope = {
      version: LIBRARY_SNAPSHOT_VERSION,
      exportedAt: cloudSnapshot.exportedAt,
      encoding: "gzip-base64",
      payload,
    };
    const body = JSON.stringify(envelope);
    if (body.length <= MAX_CLOUD_ENVELOPE_BYTES) return body;
  }

  if (plain.length <= MAX_CLOUD_ENVELOPE_BYTES) return plain;

  throw new Error(
    "คลังใหญ่เกินขีดจำกัดคลาวด์ — ลองลบสัญญาเก่า หรือส่งออกไฟล์สำรอง"
  );
}

async function decodeCloudBody(raw: unknown): Promise<LibrarySnapshot> {
  if (!raw || typeof raw !== "object") {
    throw new Error("โหลดคลังคลาวด์ไม่สำเร็จ");
  }
  const data = raw as CloudEnvelope;
  if (data.encoding === "gzip-base64" && typeof data.payload === "string") {
    if (!supportsGzip()) {
      throw new Error("เบราว์เซอร์ไม่รองรับการแตกไฟล์คลังคลาวด์");
    }
    const text = await gunzipFromBase64(data.payload);
    return parseLibrarySnapshot(JSON.parse(text));
  }
  return parseLibrarySnapshot(raw);
}

async function cloudGet(syncId: string): Promise<LibrarySnapshot> {
  const res = await fetch(
    `${CLOUD_API}/${encodeURIComponent(syncId)}?t=${Date.now()}&r=${Math.random()
      .toString(36)
      .slice(2)}`,
    {
      cache: "no-store",
      headers: { Accept: "*/*" },
    }
  );
  if (!res.ok) {
    throw new Error("โหลดคลังคลาวด์ไม่สำเร็จ");
  }
  return decodeCloudBody(await res.json());
}

/**
 * Use text/plain so browsers skip CORS preflight.
 * (extendsclass OPTIONS returns 500, which blocks application/json PUT)
 */
async function cloudPut(syncId: string, snapshot: LibrarySnapshot): Promise<void> {
  const body = await encodeCloudBody(snapshot);
  const res = await fetch(`${CLOUD_API}/${encodeURIComponent(syncId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
    },
    body,
  });
  if (!res.ok) {
    throw new Error("อัปเดตคลังคลาวด์ไม่สำเร็จ");
  }
  // Confirm the write actually stuck (CDN / silent failures).
  const verified = await cloudGet(syncId);
  if (
    contractFingerprint(verified.contracts) !==
    contractFingerprint(snapshot.contracts)
  ) {
    throw new Error("อัปเดตคลังคลาวด์แล้ว แต่ตรวจแล้วยังไม่ครบ — ลองอีกครั้ง");
  }
}

async function cloudCreate(snapshot: LibrarySnapshot): Promise<string> {
  const body = await encodeCloudBody(snapshot);
  const res = await fetch(CLOUD_API, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
    },
    body,
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
  // Never push an empty library over the shared store (prevents wiping others).
  if (snapshot.contracts.length === 0) {
    throw new Error("คลังว่าง — ไม่บันทึกทับคลังร่วมเพื่อกันข้อมูลหาย");
  }
  snapshot.exportedAt = Math.max(snapshot.exportedAt, Date.now());
  await backupLocalLibraryIfNonEmpty();

  // Preferred path: shared OneDrive/Drive folder.
  let folderOk = false;
  if (canUseSharedFolderSync() && (await hasSharedFolder())) {
    try {
      await writeSharedLibrary(snapshot);
      folderOk = true;
    } catch {
      // Fall through to cloud if folder write fails.
    }
  }

  const existing = options?.forceNew ? null : syncId || getSyncId();

  try {
    if (existing) {
      await cloudPut(existing, snapshot);
      setSyncId(existing);
      return existing;
    }
    const id = await cloudCreate(snapshot);
    setSyncId(id);
    return id;
  } catch (error) {
    if (folderOk) {
      return existing || "folder-sync";
    }
    throw error;
  }
}

export async function pullLibraryFromCloud(
  syncId: string
): Promise<LibrarySnapshot> {
  const snapshot = await cloudGet(syncId);
  setSyncId(syncId);
  return snapshot;
}

async function applyMergedAndPush(
  syncId: string | null,
  local: LibrarySnapshot,
  remote: LibrarySnapshot
): Promise<"merged" | "pushed" | "pulled" | "noop"> {
  const mergedContracts = mergeContractLists(local.contracts, remote.contracts);
  const localFp = contractFingerprint(local.contracts);
  const remoteFp = contractFingerprint(remote.contracts);
  const mergedFp = contractFingerprint(mergedContracts);

  if (mergedFp === localFp && mergedFp === remoteFp) {
    return "noop";
  }

  const merged: LibrarySnapshot = {
    version: LIBRARY_SNAPSHOT_VERSION,
    exportedAt: Math.max(local.exportedAt || 0, remote.exportedAt || 0, Date.now()),
    contracts: mergedContracts,
    attachments: [],
  };

  if (merged.contracts.length === 0 && local.contracts.length > 0) {
    return "noop";
  }

  if (mergedFp !== localFp) {
    await backupLocalLibraryIfNonEmpty();
    await importLibrarySnapshot(merged, { preserveLocalAttachments: true });
  }
  if (mergedFp !== remoteFp && merged.contracts.length > 0) {
    if (canUseSharedFolderSync() && (await hasSharedFolder())) {
      try {
        await writeSharedLibrary(merged);
      } catch {
        // continue with cloud
      }
    }
    if (syncId) {
      await cloudPut(syncId, merged);
      setSyncId(syncId);
    }
  }
  if (mergedFp !== localFp && mergedFp !== remoteFp) return "merged";
  if (mergedFp !== localFp) return "pulled";
  return "pushed";
}

/**
 * Reconcile local + shared stores. Never replaces a non-empty local library
 * with an empty/smaller remote wipe.
 */
export async function syncLibraryWithCloud(
  syncId: string
): Promise<"merged" | "pulled" | "pushed" | "noop"> {
  await restoreLibraryBackupIfLocalEmpty();

  let remote: LibrarySnapshot = {
    version: LIBRARY_SNAPSHOT_VERSION,
    exportedAt: 0,
    contracts: [],
    attachments: [],
  };

  // Prefer shared folder when available.
  if (canUseSharedFolderSync() && (await hasSharedFolder())) {
    try {
      const folder = await readSharedLibrary();
      if (folder) {
        remote = {
          version: LIBRARY_SNAPSHOT_VERSION,
          exportedAt: folder.exportedAt || 0,
          contracts: normalizeContracts(folder.contracts as SavedContract[]),
          attachments: [],
        };
      }
    } catch {
      // Fall back to cloud bin.
    }
  }

  if (remote.contracts.length === 0) {
    try {
      remote = await pullLibraryFromCloud(syncId);
    } catch {
      remote = {
        version: LIBRARY_SNAPSHOT_VERSION,
        exportedAt: 0,
        contracts: [],
        attachments: [],
      };
    }
  }

  const local = await buildLibrarySnapshot({ forCloud: true });
  const decision = decideSyncAction(toSyncSnapshot(local), toSyncSnapshot(remote));

  if (decision.action === "noop") return "noop";

  if (decision.action === "pull") {
    if (remote.contracts.length === 0) return "noop";
    await backupLocalLibraryIfNonEmpty();
    await importLibrarySnapshot(remote, { preserveLocalAttachments: true });
    return "pulled";
  }

  if (decision.action === "push" || decision.action === "keep-local-push") {
    if (local.contracts.length === 0) return "noop";
    await pushLibraryToCloud(syncId);
    return "pushed";
  }

  return applyMergedAndPush(syncId, local, remote);
}
