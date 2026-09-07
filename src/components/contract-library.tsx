"use client";

import { Button } from "@/components/ui/button";
import type { SavedContract } from "@/lib/contracts-db";
import { normalizeContractNo } from "@/lib/contract";
import { formatThaiDate } from "@/lib/thai";
import {
  Copy,
  Download,
  FilePlus2,
  FolderOpen,
  FolderSync,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef } from "react";

function displayContractNo(item: SavedContract): string {
  return (
    normalizeContractNo(item.inputs.contract_no, item.inputs.contract_date) ||
    "ไม่มีเลขที่สัญญา"
  );
}

export function ContractLibrary({
  items,
  loading,
  error,
  syncHint,
  folderReady,
  folderSupported,
  onNew,
  onOpen,
  onDuplicate,
  onDelete,
  onExportFile,
  onImportFile,
  onSyncNow,
  onPickFolder,
}: {
  items: SavedContract[];
  loading: boolean;
  error: string | null;
  syncHint?: string | null;
  folderReady?: boolean;
  folderSupported?: boolean;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onExportFile: () => void;
  onImportFile: (file: File) => void;
  onSyncNow: () => void;
  onPickFolder: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-teal-950">คลังสัญญา</h1>
          <p className="text-sm text-muted-foreground">
            มี {items.length} สัญญาในเครื่องนี้
            {folderReady
              ? " · ใช้โฟลเดอร์ร่วมแล้ว (แนะนำ)"
              : " · แนะนำให้เลือกโฟลเดอร์ OneDrive/ไดรฟ์ร่วมเพื่อไม่ให้ข้อมูลหาย"}
          </p>
          {syncHint ? (
            <p className="mt-1 text-xs font-medium text-teal-800">{syncHint}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {folderSupported ? (
            <Button
              type="button"
              size="sm"
              variant={folderReady ? "outline" : "default"}
              onClick={onPickFolder}
              title="เลือกโฟลเดอร์ OneDrive / Google Drive / ไดรฟ์บริษัท ที่ทั้งสองเครื่องเข้าถึงได้"
            >
              <FolderSync data-icon="inline-start" />
              {folderReady ? "เปลี่ยนโฟลเดอร์ร่วม" : "เลือกโฟลเดอร์ร่วม"}
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onSyncNow}
            title="ดึง/อัปโหลดคลังให้ตรงกัน"
          >
            <RefreshCw data-icon="inline-start" />
            ซิงก์คลัง
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onExportFile}
            title="สำรองคลังเป็นไฟล์"
          >
            <Download data-icon="inline-start" />
            ส่งออก
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            title="นำเข้าจากไฟล์สำรอง"
          >
            <Upload data-icon="inline-start" />
            นำเข้า
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportFile(file);
              e.target.value = "";
            }}
          />
          <Button onClick={onNew}>
            <FilePlus2 data-icon="inline-start" />
            สร้างสัญญาใหม่
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-950">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-dashed border-border bg-white px-4 py-10 text-center text-sm text-muted-foreground">
          กำลังโหลดคลังสัญญา…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white px-4 py-10 text-center">
          <FolderOpen className="mx-auto size-8 text-teal-700/70" />
          <p className="mt-3 text-sm font-medium text-teal-950">
            ยังไม่มีสัญญาที่บันทึก
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            สร้างสัญญาแล้วกด “บันทึกสัญญา” ได้เลย
          </p>
          <Button className="mt-4" onClick={onNew}>
            เริ่มสร้างสัญญา
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-border bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-teal-950">
                    {displayContractNo(item)}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-foreground">
                    {item.inputs.client_name || "ยังไม่ระบุผู้ว่าจ้าง"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatThaiDate(item.inputs.start_date) || "—"} ถึง{" "}
                    {formatThaiDate(item.inputs.end_date) || "—"}
                    {" · "}
                    แก้ไขล่าสุด{" "}
                    {new Date(item.updatedAt).toLocaleString("th-TH")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => onDuplicate(item.id)}
                    title="คัดลอกข้อมูลลูกค้าและออกเลขที่ใหม่เพื่อต่อสัญญา"
                  >
                    <Copy data-icon="inline-start" />
                    คัดลอกต่อสัญญา
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpen(item.id)}
                  >
                    <Pencil data-icon="inline-start" />
                    เปิดแก้ไข
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 data-icon="inline-start" />
                    ลบ
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
