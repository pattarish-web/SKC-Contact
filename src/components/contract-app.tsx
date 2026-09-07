"use client";

import { BrandMark } from "@/components/brand-mark";
import { ContractDocument } from "@/components/contract-document";
import { ContractForm } from "@/components/contract-form";
import { ContractLibrary } from "@/components/contract-library";
import { Button } from "@/components/ui/button";
import { COMPANY } from "@/lib/company";
import {
  buildContractContext,
  buildSampleInputs,
  missingRequiredFields,
  type ContractInputs,
} from "@/lib/contract";
import {
  deleteContract,
  getContract,
  listContracts,
  saveContract,
  type SavedContract,
} from "@/lib/contracts-db";
import {
  clearDraft,
  loadContractIntoDraft,
  setActiveContractId,
  useContractDraft,
  writePrintPayload,
} from "@/lib/draft-store";
import { appPath } from "@/lib/paths";
import { endDateFromStart, monthsFromRange } from "@/lib/thai";
import {
  ArrowLeft,
  FileText,
  FolderOpen,
  Printer,
  RotateCcw,
  Save,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type MobilePane = "form" | "preview";
type View = "library" | "editor";

export function ContractApp() {
  const { inputs, setInputs, activeId, hydrated, storageError } =
    useContractDraft();
  const [pane, setPane] = useState<MobilePane>("form");
  const [view, setView] = useState<View>("library");
  const [library, setLibrary] = useState<SavedContract[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const ctx = useMemo(() => buildContractContext(inputs), [inputs]);
  const missing = useMemo(() => missingRequiredFields(inputs), [inputs]);

  const refreshLibrary = useCallback(async () => {
    setLibraryLoading(true);
    try {
      setLibrary(await listContracts());
      setLibraryError(null);
    } catch {
      setLibraryError("โหลดคลังสัญญาไม่สำเร็จ");
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const rows = await listContracts();
          if (!cancelled) {
            setLibrary(rows);
            setLibraryError(null);
            setLibraryLoading(false);
          }
        } catch {
          if (!cancelled) {
            setLibraryError("โหลดคลังสัญญาไม่สำเร็จ");
            setLibraryLoading(false);
          }
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  function update<K extends keyof ContractInputs>(
    key: K,
    value: ContractInputs[K]
  ) {
    setDateError(null);
    setInputs((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "start_date") {
        const months = Number(next.contract_months) || 12;
        next.end_date = endDateFromStart(String(value), months);
      }

      if (key === "contract_months") {
        const months = Number(value) || 0;
        if (next.start_date && months > 0) {
          next.end_date = endDateFromStart(next.start_date, months);
        }
      }

      if (key === "end_date" && next.start_date && value) {
        const months = monthsFromRange(next.start_date, String(value));
        if (months == null) {
          setDateError("วันสิ้นสุดต้องไม่ก่อนวันเริ่มสัญญา");
        } else {
          next.contract_months = String(months);
        }
      }

      return next;
    });
  }

  function resetForm() {
    if (!window.confirm("ล้างข้อมูลที่กรอกทั้งหมด และเริ่มสัญญาใหม่?")) {
      return;
    }
    clearDraft();
    setSaveMessage(null);
  }

  function fillSample() {
    if (
      (inputs.client_name || inputs.price_per_head) &&
      !window.confirm("แทนที่ข้อมูลปัจจุบันด้วยตัวอย่าง?")
    ) {
      return;
    }
    setInputs(buildSampleInputs());
    setPane("preview");
  }

  function printContract() {
    if (missing.length > 0) {
      window.alert(`กรอกข้อมูลให้ครบก่อนพิมพ์:\n• ${missing.join("\n• ")}`);
      return;
    }
    writePrintPayload(inputs);
    const popup = window.open(
      appPath("/print"),
      "_blank",
      "noopener,noreferrer"
    );
    if (!popup) {
      window.location.assign(appPath("/print"));
    }
  }

  async function handleSave() {
    if (missing.length > 0) {
      window.alert(`กรอกข้อมูลให้ครบก่อนบันทึก:\n• ${missing.join("\n• ")}`);
      return;
    }
    try {
      const saved = await saveContract(inputs, { id: activeId });
      setActiveContractId(saved.id);
      setSaveMessage(
        `บันทึกแล้ว · ${saved.inputs.contract_no} · ${new Date(
          saved.updatedAt
        ).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`
      );
      await refreshLibrary();
    } catch {
      window.alert("บันทึกสัญญาไม่สำเร็จ");
    }
  }

  async function openSaved(id: string) {
    const row = await getContract(id);
    if (!row) {
      window.alert("ไม่พบสัญญา");
      await refreshLibrary();
      return;
    }
    loadContractIntoDraft(row.id, row.inputs);
    setView("editor");
    setPane("form");
    setSaveMessage(null);
  }

  async function removeSaved(id: string) {
    if (!window.confirm("ลบสัญญานี้และเอกสารแนบทั้งหมด?")) return;
    await deleteContract(id);
    if (activeId === id) clearDraft();
    await refreshLibrary();
  }

  function startNew() {
    clearDraft();
    setView("editor");
    setPane("form");
    setSaveMessage(null);
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[oklch(0.97_0.01_175)] text-sm text-muted-foreground">
        กำลังโหลด…
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[oklch(0.97_0.01_175)]">
      <header className="no-print sticky top-0 z-20 border-b border-teal-900/10 bg-[oklch(0.99_0.01_175)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6">
          <BrandMark className="size-10" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-teal-950 sm:text-base">
              {COMPANY.shortName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {view === "library"
                ? "คลังสัญญาที่บันทึกไว้"
                : "จัดทำสัญญาบริการทำความสะอาด"}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {view === "editor" ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void refreshLibrary();
                    setView("library");
                  }}
                >
                  <FolderOpen data-icon="inline-start" />
                  คลังสัญญา
                </Button>
                <Button variant="outline" size="sm" onClick={fillSample}>
                  <Sparkles data-icon="inline-start" />
                  ตัวอย่าง
                </Button>
                <Button variant="outline" size="sm" onClick={resetForm}>
                  <RotateCcw data-icon="inline-start" />
                  ล้างฟอร์ม
                </Button>
                <Button size="sm" onClick={() => void handleSave()}>
                  <Save data-icon="inline-start" />
                  บันทึกสัญญา
                </Button>
                <Button size="sm" onClick={printContract}>
                  <Printer data-icon="inline-start" />
                  พิมพ์ / PDF
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={startNew}>
                สร้างสัญญาใหม่
              </Button>
            )}
          </div>
        </div>
      </header>

      {view === "library" ? (
        <ContractLibrary
          items={library}
          loading={libraryLoading}
          error={libraryError}
          onNew={startNew}
          onOpen={(id) => void openSaved(id)}
          onDelete={(id) => void removeSaved(id)}
        />
      ) : (
        <div className="app-shell mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-4 pb-28 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] lg:items-start lg:px-6 lg:py-6 lg:pb-6">
          <div className="no-print flex gap-2 lg:hidden">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                void refreshLibrary();
                setView("library");
              }}
            >
              <ArrowLeft data-icon="inline-start" />
              คลัง
            </Button>
            <Button
              variant={pane === "form" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setPane("form")}
            >
              <FileText data-icon="inline-start" />
              กรอกข้อมูล
            </Button>
            <Button
              variant={pane === "preview" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setPane("preview")}
            >
              ดูสัญญา
            </Button>
          </div>

          {storageError ? (
            <div className="no-print rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-950 lg:col-span-2">
              {storageError}
            </div>
          ) : null}
          {dateError ? (
            <div className="no-print rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950 lg:col-span-2">
              {dateError}
            </div>
          ) : null}
          {saveMessage ? (
            <div className="no-print rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-950 lg:col-span-2">
              {saveMessage}
              {activeId ? " · สามารถอัปโหลดเอกสารแนบได้แล้ว" : ""}
            </div>
          ) : null}

          {missing.length > 0 ? (
            <div className="no-print rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950 lg:col-span-2">
              ยังไม่ได้กรอก: {missing.join(" · ")}
            </div>
          ) : (
            <div className="no-print rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-950 lg:col-span-2">
              ข้อมูลครบแล้ว · กดบันทึกเพื่อเก็บในคลัง หรือพิมพ์เป็น PDF
            </div>
          )}

          <aside
            className={`no-print rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5 ${
              pane === "form" ? "block" : "hidden lg:block"
            }`}
          >
            <ContractForm
              inputs={inputs}
              ctx={ctx}
              onChange={update}
              onFillSample={fillSample}
              onReset={resetForm}
              activeId={activeId}
            />
          </aside>

          <section
            className={`print-visible space-y-3 ${
              pane === "preview" ? "block" : "hidden lg:block"
            }`}
          >
            <div className="no-print flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-teal-900">
                ตัวอย่างสัญญา
              </h2>
              <p className="text-xs text-muted-foreground">
                2 หน้า · A4 · กดพิมพ์จะเปิดหน้าสัญญาใหม่
              </p>
            </div>
            <div className="preview-frame overflow-auto rounded-2xl border border-border bg-neutral-200/70 p-3 sm:p-6">
              <ContractDocument ctx={ctx} />
            </div>
          </section>
        </div>
      )}

      {view === "editor" ? (
        <div className="no-print sticky bottom-0 z-20 border-t border-border bg-white/95 p-3 backdrop-blur md:hidden">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => void handleSave()}
            >
              <Save data-icon="inline-start" />
              บันทึก
            </Button>
            <Button className="flex-1" onClick={printContract}>
              <Printer data-icon="inline-start" />
              พิมพ์
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
