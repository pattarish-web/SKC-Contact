"use client";

import { SheetSetup } from "@/components/sheet-setup";
import { Button } from "@/components/ui/button";
import type { SavedContract } from "@/lib/contracts-db";
import { normalizeContractNo } from "@/lib/contract";
import { formatThaiDate, formatUpdatedAt } from "@/lib/thai";
import {
  Copy,
  Download,
  Eye,
  FilePlus2,
  FolderOpen,
  Pencil,
  Radio,
  Trash2,
  Upload,
  WifiOff,
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
  liveHint,
  liveConnected,
  onNew,
  onOpen,
  onDuplicate,
  onDelete,
  onExportFile,
  onImportFile,
  onReview,
}: {
  items: SavedContract[];
  loading: boolean;
  error: string | null;
  liveHint?: string | null;
  liveConnected?: boolean;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onExportFile: () => void;
  onImportFile: (file: File) => void;
  onReview: (id: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-teal-950">คลังกลาง</h1>
          <p className="text-sm text-muted-foreground">
            มี {items.length} สัญญาใน Google Sheet · ทุกเครื่องเห็นชุดเดียวกัน
          </p>
          <p
            className={`mt-1 flex items-center gap-1 text-xs font-medium ${
              liveConnected ? "text-teal-800" : "text-amber-800"
            }`}
          >
            {liveConnected ? (
              <Radio className="size-3.5" />
            ) : (
              <WifiOff className="size-3.5" />
            )}
            {liveHint ||
              (liveConnected
                ? "เชื่อมคลังกลางแล้ว"
                : "กำลังต่อคลังกลาง…")}
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-11 w-full justify-center sm:h-7 sm:w-auto"
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
            className="h-11 w-full justify-center sm:h-7 sm:w-auto"
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
          <Button className="hidden sm:inline-flex" onClick={onNew}>
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

      <SheetSetup />

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
                    แก้ไขล่าสุด {formatUpdatedAt(item.updatedAt)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-11 justify-center sm:h-7"
                    onClick={() => onReview(item.id)}
                    title="รีวิวสัญญาและไฟล์แนบ"
                  >
                    <Eye data-icon="inline-start" />
                    รีวิว
                  </Button>
                  <Button
                    size="sm"
                    className="h-11 justify-center sm:h-7"
                    onClick={() => onDuplicate(item.id)}
                    title="คัดลอกข้อมูลลูกค้าและออกเลขที่ใหม่เพื่อต่อสัญญา"
                  >
                    <Copy data-icon="inline-start" />
                    คัดลอกต่อสัญญา
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11 justify-center sm:h-7"
                    onClick={() => onOpen(item.id)}
                  >
                    <Pencil data-icon="inline-start" />
                    เปิดแก้ไข
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-11 justify-center sm:h-7"
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
