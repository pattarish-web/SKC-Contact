"use client";

import { Button } from "@/components/ui/button";
import {
  addAttachment,
  deleteAttachment,
  formatBytes,
  getAttachment,
  listAttachmentMeta,
  type AttachmentMeta,
} from "@/lib/contracts-db";
import { FileUp, Paperclip, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.txt,application/pdf,image/*";

export function AttachmentPanel({
  contractId,
}: {
  contractId: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<AttachmentMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!contractId) {
      setItems([]);
      return;
    }
    try {
      const rows = await listAttachmentMeta(contractId);
      setItems(rows);
      setError(null);
    } catch {
      setError("โหลดเอกสารแนบไม่สำเร็จ");
    }
  }, [contractId]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        if (!contractId) {
          if (!cancelled) setItems([]);
          return;
        }
        try {
          const rows = await listAttachmentMeta(contractId);
          if (!cancelled) {
            setItems(rows);
            setError(null);
          }
        } catch {
          if (!cancelled) setError("โหลดเอกสารแนบไม่สำเร็จ");
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [contractId]);

  async function onPick(files: FileList | null) {
    if (!contractId || !files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_BYTES) {
          setError(`ไฟล์ ${file.name} ใหญ่เกิน 8 MB`);
          continue;
        }
        await addAttachment(contractId, file);
      }
      await reload();
    } catch {
      setError("อัปโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onOpen(id: string) {
    const file = await getAttachment(id);
    if (!file) return;
    const url = URL.createObjectURL(file.blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function onDelete(id: string) {
    if (!window.confirm("ลบเอกสารนี้?")) return;
    await deleteAttachment(id);
    await reload();
  }

  if (!contractId) {
    return (
      <section className="space-y-2 rounded-xl border border-dashed border-border bg-muted/30 p-4">
        <h2 className="text-sm font-semibold tracking-wide text-teal-800">
          เอกสารที่เกี่ยวข้อง
        </h2>
        <p className="text-xs leading-5 text-muted-foreground">
          บันทึกสัญญาก่อน จึงจะอัปโหลดเอกสารแนบได้
          ไฟล์อยู่เฉพาะเครื่องนี้ ไม่ตามไปเครื่องอื่น
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-teal-800">
          เอกสารที่เกี่ยวข้อง
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <FileUp data-icon="inline-start" />
          อัปโหลด
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPT}
          multiple
          onChange={(e) => void onPick(e.target.files)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        รองรับ PDF, รูปภาพ, Word/Excel สูงสุดไฟล์ละ 8 MB · ไฟล์แนบอยู่เฉพาะเครื่องนี้ ไม่ตามไปเครื่องอื่น
      </p>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-950">
          {error}
        </p>
      ) : null}
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
          <Paperclip className="mx-auto size-5 opacity-60" />
          <p className="mt-2">ยังไม่มีเอกสารแนบ</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(item.size)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => void onOpen(item.id)}
              >
                เปิด
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon-xs"
                aria-label={`ลบไฟล์ ${item.name}`}
                onClick={() => void onDelete(item.id)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
