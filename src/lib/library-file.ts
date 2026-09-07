"use client";

import type { ContractInputs } from "@/lib/contract";
import {
  createId,
  listAllAttachments,
  listContracts,
  replaceLibraryData,
  type ContractAttachment,
  type SavedContract,
} from "@/lib/contracts-db";

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

export async function downloadLibraryFile(): Promise<void> {
  const contracts = await listContracts();
  const attachmentsRaw = await listAllAttachments();
  const attachments = [];
  for (const row of attachmentsRaw) {
    const buffer = await row.blob.arrayBuffer();
    attachments.push({
      id: row.id,
      contractId: row.contractId,
      name: row.name,
      mimeType: row.mimeType,
      size: row.size,
      createdAt: row.createdAt,
      dataBase64: bytesToBase64(new Uint8Array(buffer)),
    });
  }
  const blob = new Blob(
    [
      JSON.stringify({
        version: 1,
        exportedAt: Date.now(),
        contracts,
        attachments,
      }),
    ],
    { type: "application/json" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sanggan-clean-library-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importLibraryFile(file: File): Promise<{
  contracts: number;
  attachments: number;
}> {
  const data = JSON.parse(await file.text()) as {
    contracts?: SavedContract[];
    attachments?: Array<{
      id?: string;
      contractId: string;
      name: string;
      mimeType?: string;
      size?: number;
      createdAt?: number;
      dataBase64?: string;
    }>;
  };
  if (!Array.isArray(data.contracts)) {
    throw new Error("ไฟล์คลังสัญญาไม่ถูกต้อง");
  }
  const contracts = data.contracts.map((row) => ({
    id: row.id || createId("contract"),
    inputs: row.inputs as ContractInputs,
    createdAt: row.createdAt || Date.now(),
    updatedAt: row.updatedAt || Date.now(),
    notes: row.notes || "",
  }));
  const attachments: ContractAttachment[] = [];
  for (const row of data.attachments || []) {
    if (!row.dataBase64) continue;
    const bytes = base64ToBytes(row.dataBase64);
    attachments.push({
      id: row.id || createId("file"),
      contractId: row.contractId,
      name: row.name,
      mimeType: row.mimeType || "application/octet-stream",
      size: row.size || bytes.byteLength,
      blob: new Blob([new Uint8Array(bytes)], {
        type: row.mimeType || "application/octet-stream",
      }),
      createdAt: row.createdAt || Date.now(),
    });
  }
  await replaceLibraryData(contracts, attachments);
  return { contracts: contracts.length, attachments: attachments.length };
}
