"use client";

import { Button } from "@/components/ui/button";
import type { SavedContract } from "@/lib/contracts-db";
import { normalizeContractNo } from "@/lib/contract";
import { formatThaiDate } from "@/lib/thai";
import {
  CloudUpload,
  Copy,
  Download,
  FilePlus2,
  FolderOpen,
  Link2,
  Pencil,
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
  syncId,
  syncMessage,
  onNew,
  onOpen,
  onDuplicate,
  onDelete,
  onExportFile,
  onImportFile,
  onCreateShareLink,
  onCopyShareLink,
  onPushCloud,
}: {
  items: SavedContract[];
  loading: boolean;
  error: string | null;
  syncId: string | null;
  syncMessage: string | null;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onExportFile: () => void;
  onImportFile: (file: File) => void;
  onCreateShareLink: () => void;
  onCopyShareLink: () => void;
  onPushCloud: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-teal-950">คลังสัญญา</h1>
          <p className="text-sm text-muted-foreground">
            เปิดแก้ไขได้ตลอด หรือกด “คัดลอกต่อสัญญา” เมื่อลูกค้าต่ออายุสัญญา
          </p>
        </div>
        <Button onClick={onNew}>
          <FilePlus2 data-icon="inline-start" />
          สร้างสัญญาใหม่
        </Button>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
        <p className="font-medium">ข้อมูลคลังเก็บบนเครื่องนี้เป็นหลัก</p>
        <p className="mt-1 text-xs leading-5 text-amber-900/90">
          เปิดแค่ลิงก์เว็บอย่างเดียว เครื่องอื่นจะยังไม่เห็นสัญญา —
          ให้กด “สร้างลิงก์ซิงก์” แล้วส่งลิงก์นั้น หรือส่งไฟล์คลังไปเปิดบนเครื่องอื่น
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={onCreateShareLink}
            title="อัปโหลดคลังแล้วได้ลิงก์ให้เครื่องอื่นเปิดตาม"
          >
            <Link2 data-icon="inline-start" />
            สร้างลิงก์ซิงก์
          </Button>
          {syncId ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onCopyShareLink}
              >
                <Copy data-icon="inline-start" />
                คัดลอกลิงก์ซิงก์
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onPushCloud}
              >
                <CloudUpload data-icon="inline-start" />
                อัปเดตคลังบนลิงก์
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onExportFile}
          >
            <Download data-icon="inline-start" />
            ส่งออกไฟล์
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
          >
            <Upload data-icon="inline-start" />
            นำเข้าไฟล์
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
        </div>
        {syncId ? (
          <p className="mt-2 break-all text-[11px] text-amber-900/80">
            รหัสซิงก์: {syncId}
          </p>
        ) : null}
        {syncMessage ? (
          <p className="mt-2 text-xs font-medium text-teal-900">{syncMessage}</p>
        ) : null}
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
            สร้างสัญญาแล้วกด “บันทึกสัญญา” เพื่อเก็บไว้เปิดดูภายหลัง
            หรือนำเข้าจากไฟล์/ลิงก์ซิงก์
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
                    variant="destructive"
                    size="sm"
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
