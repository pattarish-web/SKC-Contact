"use client";

import type { ContractInputs } from "@/lib/contract";

const DB_NAME = "sanggan-clean-contracts-db";
const DB_VERSION = 1;
const CONTRACTS_STORE = "contracts";
const ATTACHMENTS_STORE = "attachments";

export type SavedContract = {
  id: string;
  inputs: ContractInputs;
  createdAt: number;
  updatedAt: number;
  notes: string;
};

export type ContractAttachment = {
  id: string;
  contractId: string;
  name: string;
  mimeType: string;
  size: number;
  blob: Blob;
  createdAt: number;
};

export type AttachmentMeta = Omit<ContractAttachment, "blob">;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("เปิดฐานข้อมูลไม่สำเร็จ"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CONTRACTS_STORE)) {
        const store = db.createObjectStore(CONTRACTS_STORE, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
        store.createIndex("contract_no", "inputs.contract_no");
      }
      if (!db.objectStoreNames.contains(ATTACHMENTS_STORE)) {
        const store = db.createObjectStore(ATTACHMENTS_STORE, { keyPath: "id" });
        store.createIndex("contractId", "contractId");
      }
    };
  });
}

function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("คำสั่งฐานข้อมูลล้มเหลว"));
  });
}

export function createId(prefix = "id"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function listContracts(): Promise<SavedContract[]> {
  const db = await openDb();
  const tx = db.transaction(CONTRACTS_STORE, "readonly");
  const store = tx.objectStore(CONTRACTS_STORE);
  const rows = await req<SavedContract[]>(store.getAll());
  return rows.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getContract(id: string): Promise<SavedContract | null> {
  const db = await openDb();
  const tx = db.transaction(CONTRACTS_STORE, "readonly");
  const row = await req<SavedContract | undefined>(
    tx.objectStore(CONTRACTS_STORE).get(id)
  );
  return row ?? null;
}

export async function saveContract(
  inputs: ContractInputs,
  options: { id?: string | null; notes?: string } = {}
): Promise<SavedContract> {
  const existing = options.id ? await getContract(options.id) : null;
  const now = Date.now();
  const record: SavedContract = {
    id: existing?.id ?? createId("contract"),
    inputs,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    notes: options.notes ?? existing?.notes ?? "",
  };
  const db = await openDb();
  const tx = db.transaction(CONTRACTS_STORE, "readwrite");
  await req(tx.objectStore(CONTRACTS_STORE).put(record));
  return record;
}

export async function deleteContract(id: string): Promise<void> {
  const db = await openDb();
  const readTx = db.transaction(ATTACHMENTS_STORE, "readonly");
  const attachments = await req<ContractAttachment[]>(
    readTx.objectStore(ATTACHMENTS_STORE).index("contractId").getAll(id)
  );
  const writeTx = db.transaction(
    [CONTRACTS_STORE, ATTACHMENTS_STORE],
    "readwrite"
  );
  const contracts = writeTx.objectStore(CONTRACTS_STORE);
  const files = writeTx.objectStore(ATTACHMENTS_STORE);
  contracts.delete(id);
  for (const item of attachments) {
    files.delete(item.id);
  }
  await new Promise<void>((resolve, reject) => {
    writeTx.oncomplete = () => resolve();
    writeTx.onerror = () =>
      reject(writeTx.error ?? new Error("ลบสัญญาไม่สำเร็จ"));
    writeTx.onabort = () =>
      reject(writeTx.error ?? new Error("ลบสัญญาถูกยกเลิก"));
  });
}

export async function listAttachmentMeta(
  contractId: string
): Promise<AttachmentMeta[]> {
  const db = await openDb();
  const tx = db.transaction(ATTACHMENTS_STORE, "readonly");
  const index = tx.objectStore(ATTACHMENTS_STORE).index("contractId");
  const rows = await req<ContractAttachment[]>(index.getAll(contractId));
  return rows
    .map((row) => ({
      id: row.id,
      contractId: row.contractId,
      name: row.name,
      mimeType: row.mimeType,
      size: row.size,
      createdAt: row.createdAt,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function addAttachment(
  contractId: string,
  file: File
): Promise<AttachmentMeta> {
  const db = await openDb();
  const record: ContractAttachment = {
    id: createId("file"),
    contractId,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    blob: file,
    createdAt: Date.now(),
  };
  const tx = db.transaction(ATTACHMENTS_STORE, "readwrite");
  await req(tx.objectStore(ATTACHMENTS_STORE).put(record));
  return {
    id: record.id,
    contractId: record.contractId,
    name: record.name,
    mimeType: record.mimeType,
    size: record.size,
    createdAt: record.createdAt,
  };
}

export async function getAttachment(
  id: string
): Promise<ContractAttachment | null> {
  const db = await openDb();
  const tx = db.transaction(ATTACHMENTS_STORE, "readonly");
  const row = await req<ContractAttachment | undefined>(
    tx.objectStore(ATTACHMENTS_STORE).get(id)
  );
  return row ?? null;
}

export async function deleteAttachment(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(ATTACHMENTS_STORE, "readwrite");
  await req(tx.objectStore(ATTACHMENTS_STORE).delete(id));
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
