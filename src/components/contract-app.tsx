"use client";

import { BrandMark } from "@/components/brand-mark";
import { ContractDocument } from "@/components/contract-document";
import { ContractForm } from "@/components/contract-form";
import { ContractLibrary } from "@/components/contract-library";
import { ContractReview } from "@/components/contract-review";
import { HomeBackButton } from "@/components/home-back-button";
import { Button } from "@/components/ui/button";
import { COMPANY } from "@/lib/company";
import {
  allocateContractNo,
  buildContractContext,
  buildSampleInputs,
  emptyInputs,
  missingRequiredFields,
  normalizeContractNo,
  peekNextContractNo,
  reconcileSeqFromSaved,
  type ContractInputs,
} from "@/lib/contract";
import {
  deleteContract,
  deleteDuplicateContractNumbers,
  findContractByNumber,
  getContract,
  listContracts,
  saveContract,
  type SavedContract,
} from "@/lib/contracts-db";
import {
  clearDraft,
  getDraftActiveId,
  loadContractIntoDraft,
  setActiveContractId,
  syncUnsavedDraftContractNo,
  useContractDraft,
  writePrintPayload,
} from "@/lib/draft-store";
import {
  applyCentralContracts,
  deleteContractOnCentral,
  fingerprint,
  pullCentralLibrary,
  replaceCentralLibrary,
  saveContractToCentral,
  subscribeCentral,
} from "@/lib/central-client";
import { downloadLibraryFile, importLibraryFile } from "@/lib/library-file";
import { appPath } from "@/lib/paths";
import { endDateFromStart, monthsFromRange, todayISO } from "@/lib/thai";
import {
  FileSearch,
  FileText,
  Printer,
  RotateCcw,
  Save,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

function savedNosOf(rows: SavedContract[]): string[] {
  return rows.map((row) => row.inputs.contract_no).filter(Boolean);
}

function buildRenewalInputs(
  source: ContractInputs,
  savedNos: readonly string[]
): ContractInputs {
  const today = todayISO();
  const months = Number(source.contract_months) || 12;
  const start = source.end_date
    ? (() => {
        const d = new Date(`${source.end_date}T00:00:00`);
        d.setDate(d.getDate() + 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      })()
    : today;
  return emptyInputs({
    ...source,
    contract_no: peekNextContractNo(today, savedNos),
    contract_date: today,
    start_date: start,
    end_date: endDateFromStart(start, months),
    contract_months: String(months),
  });
}

type MobilePane = "form" | "preview";
type View = "library" | "editor" | "review";

export function ContractApp() {
  const { inputs, setInputs, activeId, hydrated, storageError } =
    useContractDraft();
  const [pane, setPane] = useState<MobilePane>("form");
  const [view, setView] = useState<View>("library");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [library, setLibrary] = useState<SavedContract[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);

  const ctx = useMemo(() => buildContractContext(inputs), [inputs]);
  const missing = useMemo(() => missingRequiredFields(inputs), [inputs]);

  const applyLive = useCallback(async (rows: SavedContract[]) => {
    const current = await listContracts();
    if (fingerprint(current) !== fingerprint(rows)) {
      await applyCentralContracts(rows);
    }
    const nos = savedNosOf(rows);
    reconcileSeqFromSaved(nos);
    syncUnsavedDraftContractNo(nos);
    setLibrary(rows);
    setLibraryError(null);
    setLibraryLoading(false);
    setSyncHint(`Google Sheet พร้อมแล้ว ${rows.length} สัญญา · อัปเดตทุก 4 วินาที`);
  }, []);

  const reloadLocalLibrary = useCallback(async () => {
    const rows = await listContracts();
    const nos = savedNosOf(rows);
    reconcileSeqFromSaved(nos);
    syncUnsavedDraftContractNo(nos);
    setLibrary(rows);
    setLibraryError(null);
    setLibraryLoading(false);
  }, []);

  const refreshLibrary = useCallback(async () => {
    setLibraryLoading(true);
    try {
      const rows = await pullCentralLibrary();
      await applyLive(rows);
    } catch {
      try {
        await reloadLocalLibrary();
        setLibraryError("เชื่อม Google Sheet ไม่ได้ — แสดงข้อมูลในเครื่องนี้");
      } catch {
        setLibraryError("โหลดคลังสัญญาไม่สำเร็จ");
        setLibraryLoading(false);
      }
    }
  }, [applyLive, reloadLocalLibrary]);

  async function quietPush(row: SavedContract): Promise<boolean> {
    try {
      const next = await saveContractToCentral(row);
      await applyLive(next);
      return true;
    } catch {
      return false;
    }
  }

  async function latestContracts(): Promise<SavedContract[]> {
    try {
      const rows = await pullCentralLibrary();
      await applyLive(rows);
      return rows;
    } catch {
      return listContracts();
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await pullCentralLibrary();
        if (!cancelled) await applyLive(rows);
      } catch {
        if (cancelled) return;
        try {
          await reloadLocalLibrary();
          setLibraryError("เชื่อม Google Sheet ไม่ได้ — แสดงข้อมูลในเครื่องนี้");
        } catch {
          setLibraryError("โหลดคลังสัญญาไม่สำเร็จ");
          setLibraryLoading(false);
        }
      }
    })();
    const stop = subscribeCentral(
      (rows) => {
        void applyLive(rows);
      },
      (connected) => {
        setLiveConnected(connected);
        if (!connected) {
          setSyncHint("ขาดการเชื่อม Google Sheet — กำลังลองใหม่");
        }
      }
    );
    return () => {
      cancelled = true;
      stop();
    };
  }, [applyLive, reloadLocalLibrary]);

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
    clearDraft(savedNosOf(library));
    setSaveMessage(null);
  }

  function fillSample() {
    if (
      (inputs.client_name || inputs.staff_roles.some((r) => r.price_per_head)) &&
      !window.confirm("แทนที่ข้อมูลปัจจุบันด้วยตัวอย่าง?")
    ) {
      return;
    }
    const nos = savedNosOf(library);
    setInputs(
      buildSampleInputs(
        peekNextContractNo(inputs.contract_date || todayISO(), nos)
      )
    );
    setActiveContractId(null);
    setSaveMessage(null);
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
      const latest = await latestContracts();
      const nos = savedNosOf(latest);
      // Read at click-time so a stale React render cannot drop the editing id.
      const sessionId = getDraftActiveId() ?? activeId;
      const normalizedNo = normalizeContractNo(
        inputs.contract_no,
        inputs.contract_date
      );
      const byNumber = normalizedNo
        ? await findContractByNumber(normalizedNo, inputs.contract_date)
        : null;

      let targetId: string | null = null;
      let payload: ContractInputs = inputs;

      if (sessionId) {
        // Opened from library / already saved — overwrite, never allocate.
        const stillThere = latest.some((row) => row.id === sessionId);
        targetId = stillThere ? sessionId : byNumber?.id ?? sessionId;
        payload = inputs;
      } else {
        // New create or renewal draft (no active editing id).
        payload = {
          ...inputs,
          contract_no: allocateContractNo(inputs.contract_date, nos),
        };
        targetId = null;
      }

      const saved = await saveContract(payload, { id: targetId });
      await deleteDuplicateContractNumbers(
        saved.id,
        saved.inputs.contract_no,
        saved.inputs.contract_date
      );
      loadContractIntoDraft(saved.id, saved.inputs);
      const cloudOk = await quietPush(saved);
      const action = sessionId
        ? `อัปเดตสัญญา ${saved.inputs.contract_no} แล้ว`
        : `สร้างสัญญา ${saved.inputs.contract_no} แล้ว`;
      setSaveMessage(
        cloudOk
          ? `${action} · ขึ้น Google Sheet แล้ว`
          : `${action} ในเครื่อง · ยังส่งขึ้นชีตไม่ได้ วางลิงก์เว็บแอปที่หน้าคลังก่อน`
      );
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
    const remaining = library.filter((r) => r.id !== id);
    if (activeId === id) clearDraft(savedNosOf(remaining));
    try {
      const next = await deleteContractOnCentral(id);
      await applyLive(next);
    } catch {
      await reloadLocalLibrary();
      window.alert("ลบในเครื่องแล้ว แต่ Google Sheet ยังไม่ทัน");
    }
  }

  async function duplicateSaved(id: string) {
    const row = await getContract(id);
    if (!row) {
      window.alert("ไม่พบสัญญา");
      await refreshLibrary();
      return;
    }
    try {
      const latest = await latestContracts();
      const nos = savedNosOf(latest);
      const renewal = buildRenewalInputs(row.inputs, nos);
      const payload = {
        ...renewal,
        contract_no: allocateContractNo(renewal.contract_date, nos),
      };
      const saved = await saveContract(payload);
      loadContractIntoDraft(saved.id, saved.inputs);
      await quietPush(saved);
      setView("editor");
      setPane("form");
      setSaveMessage(
        `คัดลอกต่อสัญญาจาก ${
          row.inputs.contract_no || "สัญญาเดิม"
        } → ${saved.inputs.contract_no} · ตรวจวันที่แล้วแก้ไขได้เลย`
      );
    } catch {
      window.alert("คัดลอกสัญญาไม่สำเร็จ");
    }
  }

  async function handleExportLibrary() {
    try {
      await downloadLibraryFile();
      setSaveMessage("ส่งออกไฟล์คลังแล้ว");
    } catch {
      window.alert("ส่งออกคลังไม่สำเร็จ");
    }
  }

  async function handleImportLibrary(file: File) {
    if (
      !window.confirm(
        "นำเข้าจะแทนที่สัญญาทั้งหมดใน Google Sheet ต้องการทำต่อหรือไม่?"
      )
    ) {
      return;
    }
    try {
      setLibraryLoading(true);
      const result = await importLibraryFile(file);
      const rows = await listContracts();
      const next = await replaceCentralLibrary(rows);
      await applyLive(next);
      setSaveMessage(
        `นำเข้าแล้ว ${result.contracts} สัญญาเข้า Google Sheet (${result.attachments} ไฟล์แนบในเครื่องนี้)`
      );
      setView("library");
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "นำเข้าคลังไม่สำเร็จ"
      );
      setLibraryLoading(false);
    }
  }

  function openReview(id?: string) {
    void refreshLibrary();
    setReviewId(id ?? null);
    setView("review");
    setSaveMessage(null);
  }

  function startNew() {
    clearDraft(savedNosOf(library));
    setView("editor");
    setPane("form");
    setSaveMessage(null);
  }

  const subtitle =
    view === "library"
      ? "คลังกลาง Google Sheet · ทุกเครื่องเห็นชุดเดียวกัน"
      : view === "review"
        ? "รีวิวเอกสารและไฟล์แนบ"
        : "จัดทำสัญญาบริการทำความสะอาด";

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
        <div className="mx-auto max-w-[1600px] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
          <button
            type="button"
            className="shrink-0 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40"
            onClick={() => {
              void refreshLibrary();
              setView("library");
            }}
            title="กลับหน้าแรก"
            aria-label="กลับหน้าแรก"
          >
            <BrandMark />
          </button>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              className="block max-w-full truncate text-left text-sm font-semibold text-teal-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40 sm:text-base"
              onClick={() => {
                void refreshLibrary();
                setView("library");
              }}
              title="กลับหน้าแรก"
            >
              {COMPANY.shortName}
            </button>
            <p className="truncate text-xs text-muted-foreground">
              {subtitle}
            </p>
          </div>
          <div className="hidden flex-wrap items-center justify-end gap-2 sm:flex">
            {view !== "review" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openReview()}
              >
                <FileSearch data-icon="inline-start" />
                รีวิวเอกสาร
              </Button>
            ) : null}
            {view === "editor" ? (
              <>
                <HomeBackButton
                  onClick={() => {
                    void refreshLibrary();
                    setView("library");
                  }}
                />
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
                  {activeId ? "อัปเดตสัญญา" : "บันทึกสัญญา"}
                </Button>
                <Button size="sm" onClick={printContract}>
                  <Printer data-icon="inline-start" />
                  พิมพ์ / PDF
                </Button>
              </>
            ) : view === "review" ? (
              <HomeBackButton
                onClick={() => {
                  void refreshLibrary();
                  setView("library");
                }}
              />
            ) : (
              <Button size="sm" onClick={startNew}>
                สร้างสัญญาใหม่
              </Button>
            )}
          </div>
          </div>
          {view === "library" ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
              <Button
                variant="outline"
                className="h-11"
                onClick={() => openReview()}
              >
                <FileSearch data-icon="inline-start" />
                รีวิวเอกสาร
              </Button>
              <Button className="h-11" onClick={startNew}>
                สร้างสัญญาใหม่
              </Button>
            </div>
          ) : view === "review" ? (
            <div className="mt-3 sm:hidden">
              <HomeBackButton
                className="h-11 w-full"
                onClick={() => {
                  void refreshLibrary();
                  setView("library");
                }}
              />
            </div>
          ) : null}
        </div>
      </header>

      {view === "library" ? (
        <ContractLibrary
          items={library}
          loading={libraryLoading}
          error={libraryError}
          liveHint={syncHint}
          liveConnected={liveConnected}
          onNew={startNew}
          onOpen={(id) => void openSaved(id)}
          onDuplicate={(id) => void duplicateSaved(id)}
          onDelete={(id) => void removeSaved(id)}
          onExportFile={() => void handleExportLibrary()}
          onImportFile={(file) => void handleImportLibrary(file)}
          onReview={(id) => openReview(id)}
        />
      ) : view === "review" ? (
        <ContractReview
          key={reviewId ?? "all"}
          items={library}
          loading={libraryLoading}
          initialId={reviewId}
          onEdit={(id) => void openSaved(id)}
          onBackToLibrary={() => {
            void refreshLibrary();
            setView("library");
          }}
        />
      ) : (
        <div className="app-shell mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-4 pb-28 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] lg:items-start lg:px-6 lg:py-6 lg:pb-6">
          <div className="no-print flex gap-2 lg:hidden">
            <HomeBackButton
              className="flex-1"
              onClick={() => {
                void refreshLibrary();
                setView("library");
              }}
            />
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
              savedContractNos={savedNosOf(library)}
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
                3 หน้า · A4 · กดพิมพ์จะเปิดหน้าสัญญาใหม่
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
              {activeId ? "อัปเดต" : "บันทึก"}
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
