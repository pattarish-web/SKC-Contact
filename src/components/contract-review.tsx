"use client";

import { ContractDocument } from "@/components/contract-document";
import { Button } from "@/components/ui/button";
import {
  buildContractContext,
  normalizeContractNo,
} from "@/lib/contract";
import {
  formatBytes,
  getAttachment,
  listAttachmentMeta,
  type AttachmentMeta,
  type SavedContract,
} from "@/lib/contracts-db";
import { formatThaiDate } from "@/lib/thai";
import {
  Download,
  Eye,
  FileSearch,
  FolderOpen,
  Paperclip,
  Pencil,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

async function openAttachmentBlob(id: string, download = false) {
  const file = await getAttachment(id);
  if (!file) {
    window.alert("ไม่พบไฟล์แนบ");
    return;
  }
  const url = URL.createObjectURL(file.blob);
  if (download) {
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name || "attachment";
    a.click();
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function displayContractNo(item: SavedContract): string {
  return (
    normalizeContractNo(item.inputs.contract_no, item.inputs.contract_date) ||
    "ไม่มีเลขที่สัญญา"
  );
}

export function ContractReview({
  items,
  loading,
  initialId = null,
  onEdit,
  onBackToLibrary,
}: {
  items: SavedContract[];
  loading: boolean;
  initialId?: string | null;
  onEdit: (id: string) => void;
  onBackToLibrary: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    initialId || items[0]?.id || null
  );
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [attachLoading, setAttachLoading] = useState(false);

  useEffect(() => {
    if (initialId) {
      setSelectedId(initialId);
      return;
    }
    if (!selectedId && items[0]) {
      setSelectedId(items[0].id);
    } else if (
      selectedId &&
      items.length > 0 &&
      !items.some((row) => row.id === selectedId)
    ) {
      setSelectedId(items[0]?.id ?? null);
    }
  }, [initialId, items, selectedId]);

  const selected = useMemo(
    () => items.find((row) => row.id === selectedId) ?? null,
    [items, selectedId]
  );

  const ctx = useMemo(
    () => (selected ? buildContractContext(selected.inputs) : null),
    [selected]
  );

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        if (!selectedId) {
          if (!cancelled) {
            setAttachments([]);
            setAttachError(null);
          }
          return;
        }
        setAttachLoading(true);
        try {
          const rows = await listAttachmentMeta(selectedId);
          if (!cancelled) {
            setAttachments(rows);
            setAttachError(null);
          }
        } catch {
          if (!cancelled) {
            setAttachments([]);
            setAttachError("โหลดเอกสารแนบไม่สำเร็จ");
          }
        } finally {
          if (!cancelled) setAttachLoading(false);
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [selectedId]);

  return (
    <div className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)] lg:items-start lg:py-6">
      <aside className="space-y-3">
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-start gap-2">
            <FileSearch className="mt-0.5 size-5 text-teal-800" />
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-teal-950">
                รีวิวเอกสาร
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                ดูสัญญาที่บันทึกและเปิดไฟล์แนบได้โดยไม่ต้องเข้าโหมดแก้ไข
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onBackToLibrary}
          >
            <FolderOpen data-icon="inline-start" />
            กลับคลังสัญญา
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-white shadow-sm">
          <div className="border-b border-border px-4 py-3 text-sm font-medium text-teal-950">
            สัญญาทั้งหมด ({items.length})
          </div>
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              กำลังโหลด…
            </p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              ยังไม่มีสัญญาให้รีวิว
            </p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-border overflow-auto">
              {items.map((item) => {
                const active = item.id === selectedId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full px-4 py-3 text-left transition-colors ${
                        active
                          ? "bg-teal-50"
                          : "hover:bg-muted/60"
                      }`}
                    >
                      <p className="truncate text-sm font-semibold text-teal-950">
                        {displayContractNo(item)}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-foreground">
                        {item.inputs.client_name || "ยังไม่ระบุผู้ว่าจ้าง"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatThaiDate(item.inputs.start_date) || "—"} ถึง{" "}
                        {formatThaiDate(item.inputs.end_date) || "—"}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <section className="space-y-4">
        {!selected || !ctx ? (
          <div className="rounded-2xl border border-dashed border-border bg-white px-4 py-16 text-center text-sm text-muted-foreground">
            เลือกสัญญาจากรายการด้านซ้ายเพื่อรีวิว
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-teal-800">
                    กำลังรีวิว
                  </p>
                  <h2 className="mt-1 truncate text-lg font-semibold text-teal-950">
                    {displayContractNo(selected)}
                  </h2>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {selected.inputs.client_name || "ยังไม่ระบุผู้ว่าจ้าง"}
                    {" · "}
                    แก้ไขล่าสุด{" "}
                    {new Date(selected.updatedAt).toLocaleString("th-TH")}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onEdit(selected.id)}
                >
                  <Pencil data-icon="inline-start" />
                  เปิดแก้ไข
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Paperclip className="size-4 text-teal-800" />
                <h3 className="text-sm font-semibold text-teal-950">
                  เอกสารแนบ ({attachments.length})
                </h3>
              </div>
              {attachError ? (
                <p className="text-sm text-red-700">{attachError}</p>
              ) : null}
              {attachLoading ? (
                <p className="text-sm text-muted-foreground">กำลังโหลดไฟล์แนบ…</p>
              ) : attachments.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
                  สัญญานี้ยังไม่มีไฟล์แนบ
                </p>
              ) : (
                <ul className="space-y-2">
                  {attachments.map((file) => (
                    <li
                      key={file.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {file.mimeType || "ไฟล์"} · {formatBytes(file.size)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void openAttachmentBlob(file.id)}
                        >
                          <Eye data-icon="inline-start" />
                          เปิดดู
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void openAttachmentBlob(file.id, true)}
                        >
                          <Download data-icon="inline-start" />
                          ดาวน์โหลด
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-white p-3 shadow-sm sm:p-4">
              <h3 className="mb-3 px-1 text-sm font-semibold text-teal-950">
                ตัวอย่างสัญญา
              </h3>
              <div className="preview-frame overflow-auto rounded-xl border border-border bg-neutral-200/70 p-3 sm:p-6">
                <ContractDocument ctx={ctx} />
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
