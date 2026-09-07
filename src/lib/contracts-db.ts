"use client";

import {
  normalizeContractNo,
  planContractRenumber,
  type ContractInputs,
  type ContractRenumberPlan,
} from "@/lib/contract";

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

/**
 * Renumber every saved contract so each year/month starts at 001
 * (oldest createdAt first). Preserves createdAt/updatedAt.
 */
export async function renumberSavedContractsFromOne(): Promise<{
  changed: number;
  rows: SavedContract[];
  plan: ContractRenumberPlan[];
}> {
  const db = await openDb();
  const readTx = db.transaction(CONTRACTS_STORE, "readonly");
  const existing = await req<SavedContract[]>(
    readTx.objectStore(CONTRACTS_STORE).getAll()
  );

  const plan = planContractRenumber(
    existing.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      contract_no: row.inputs.contract_no || "",
      contract_date: row.inputs.contract_date || "",
    }))
  );

  if (plan.length === 0) {
    return {
      changed: 0,
      rows: existing.sort((a, b) => b.updatedAt - a.updatedAt),
      plan,
    };
  }

  const nextNoById = new Map(plan.map((item) => [item.id, item.to]));
  const writeTx = db.transaction(CONTRACTS_STORE, "readwrite");
  const store = writeTx.objectStore(CONTRACTS_STORE);

  for (const row of existing) {
    const nextNo = nextNoById.get(row.id);
    if (!nextNo) continue;
    const updated: SavedContract = {
      ...row,
      inputs: {
        ...row.inputs,
        contract_no: nextNo,
      },
    };
    store.put(updated);
  }

  await new Promise<void>((resolve, reject) => {
    writeTx.oncomplete = () => resolve();
    writeTx.onerror = () =>
      reject(writeTx.error ?? new Error("เรียงเลขที่สัญญาไม่สำเร็จ"));
    writeTx.onabort = () =>
      reject(writeTx.error ?? new Error("เรียงเลขที่สัญญาถูกยกเลิก"));
  });

  const rows = await listContracts();
  return { changed: plan.length, rows, plan };
}

export async function getContract(id: string): Promise<SavedContract | null> {
  const db = await openDb();
  const tx = db.transaction(CONTRACTS_STORE, "readonly");
  const row = await req<SavedContract | undefined>(
    tx.objectStore(CONTRACTS_STORE).get(id)
  );
  return row ?? null;
}

export async function findContractByNumber(
  contractNo: string,
  contractDate?: string
): Promise<SavedContract | null> {
  const normalized = normalizeContractNo(contractNo, contractDate);
  if (!normalized) return null;
  const rows = await listContracts();
  return (
    rows.find(
      (row) =>
        normalizeContractNo(row.inputs.contract_no, row.inputs.contract_date) ===
        normalized
    ) ?? null
  );
}

/**
 * Upsert a contract. When `options.id` is set, always write that id
 * (even if the row was temporarily missing after a sync) so edits never
 * spawn a second record.
 */
export async function saveContract(
  inputs: ContractInputs,
  options: { id?: string | null; notes?: string } = {}
): Promise<SavedContract> {
  const existing = options.id ? await getContract(options.id) : null;
  const now = Date.now();
  const record: SavedContract = {
    id: options.id || existing?.id || createId("contract"),
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

/** Remove other saved rows that share the same contract number. */
export async function deleteDuplicateContractNumbers(
  keepId: string,
  contractNo: string,
  contractDate?: string
): Promise<string[]> {
  const normalized = normalizeContractNo(contractNo, contractDate);
  if (!normalized) return [];
  const rows = await listContracts();
  const removed: string[] = [];
  for (const row of rows) {
    if (row.id === keepId) continue;
    const no = normalizeContractNo(
      row.inputs.contract_no,
      row.inputs.contract_date
    );
    if (no === normalized) {
      await deleteContract(row.id);
      removed.push(row.id);
    }
  }
  return removed;
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

export async function listAllAttachments(): Promise<ContractAttachment[]> {
  const db = await openDb();
  const tx = db.transaction(ATTACHMENTS_STORE, "readonly");
  return req<ContractAttachment[]>(tx.objectStore(ATTACHMENTS_STORE).getAll());
}

export async function replaceLibraryData(
  contracts: SavedContract[],
  attachments: ContractAttachment[]
): Promise<void> {
  const db = await openDb();
  const clearTx = db.transaction(
    [CONTRACTS_STORE, ATTACHMENTS_STORE],
    "readwrite"
  );
  clearTx.objectStore(CONTRACTS_STORE).clear();
  clearTx.objectStore(ATTACHMENTS_STORE).clear();
  await new Promise<void>((resolve, reject) => {
    clearTx.oncomplete = () => resolve();
    clearTx.onerror = () =>
      reject(clearTx.error ?? new Error("ล้างคลังเดิมไม่สำเร็จ"));
  });

  const writeTx = db.transaction(
    [CONTRACTS_STORE, ATTACHMENTS_STORE],
    "readwrite"
  );
  const contractsStore = writeTx.objectStore(CONTRACTS_STORE);
  const attachmentsStore = writeTx.objectStore(ATTACHMENTS_STORE);
  for (const row of contracts) {
    contractsStore.put(row);
  }
  for (const row of attachments) {
    attachmentsStore.put(row);
  }
  await new Promise<void>((resolve, reject) => {
    writeTx.oncomplete = () => resolve();
    writeTx.onerror = () =>
      reject(writeTx.error ?? new Error("นำเข้าคลังสัญญาไม่สำเร็จ"));
  });
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
