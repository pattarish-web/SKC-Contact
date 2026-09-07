"use client";

import { Button } from "@/components/ui/button";
import type { SavedContract } from "@/lib/contracts-db";
import { formatThaiDate } from "@/lib/thai";
import { FilePlus2, FolderOpen, Pencil, Trash2 } from "lucide-react";

export function ContractLibrary({
  items,
  loading,
  error,
  onNew,
  onOpen,
  onDelete,
}: {
  items: SavedContract[];
  loading: boolean;
  error: string | null;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-teal-950">คลังสัญญา</h1>
          <p className="text-sm text-muted-foreground">
            สัญญาที่บันทึกไว้เปิดดูและแก้ไขได้ตลอดในเบราว์เซอร์นี้
          </p>
        </div>
        <Button onClick={onNew}>
          <FilePlus2 data-icon="inline-start" />
          สร้างสัญญาใหม่
        </Button>
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
          <p className="mt-3 text-sm font-medium text-teal-950">ยังไม่มีสัญญาที่บันทึก</p>
          <p className="mt-1 text-sm text-muted-foreground">
            สร้างสัญญาแล้วกด “บันทึกสัญญา” เพื่อเก็บไว้เปิดดูภายหลัง
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-teal-950">
                    {item.inputs.contract_no || "ไม่มีเลขที่สัญญา"}
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
                <div className="flex gap-2">
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
