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
  canUseSharedFolderSync,
  hasSharedFolder,
  pickSharedFolder,
} from "@/lib/folder-sync";
import {
  downloadLibraryFile,
  getSyncId,
  importLibraryFile,
  pushLibraryToCloud,
  readSyncIdFromLocation,
  resolveSyncId,
  restoreLibraryBackupIfLocalEmpty,
  syncLibraryWithCloud,
} from "@/lib/library-sync";
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
  const [folderReady, setFolderReady] = useState(false);

  const ctx = useMemo(() => buildContractContext(inputs), [inputs]);
  const missing = useMemo(() => missingRequiredFields(inputs), [inputs]);

  const refreshLibrary = useCallback(async () => {
    setLibraryLoading(true);
    try {
      const bound = (await resolveSyncId()) || getSyncId();
      if (bound) {
        try {
          const result = await syncLibraryWithCloud(bound);
          const rowsAfter = await listContracts();
          if (result === "pushed") {
            setSyncHint(
              `อัปโหลดคลังร่วมแล้ว ${rowsAfter.length} สัญญา — รีเฟรชเครื่องอื่นได้`
            );
          } else if (result === "pulled") {
            setSyncHint(`ดึงคลังร่วมแล้ว ${rowsAfter.length} สัญญา`);
          } else if (result === "merged") {
            setSyncHint(
              `รวมคลังแล้ว ${rowsAfter.length} สัญญา — ทุกเครื่องควรเห็นจำนวนเท่ากัน`
            );
          } else {
            setSyncHint(`คลังพร้อมแล้ว ${rowsAfter.length} สัญญา`);
          }
        } catch (error) {
          setSyncHint(
            error instanceof Error
              ? `ซิงก์ไม่สำเร็จ: ${error.message}`
              : "ซิงก์คลังร่วมไม่สำเร็จ"
          );
        }
      }
      const rows = await listContracts();
      const nos = savedNosOf(rows);
      reconcileSeqFromSaved(nos);
      syncUnsavedDraftContractNo(nos);
      setLibrary(rows);
      setLibraryError(null);
    } catch {
      setLibraryError("โหลดคลังสัญญาไม่สำเร็จ");
    } finally {
      setLibraryLoading(false);
    }
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

  async function quietPushCloud(): Promise<boolean> {
    const id = (await resolveSyncId()) || getSyncId();
    if (!id) return false;
    try {
      await pushLibraryToCloud(id);
      return true;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          if (canUseSharedFolderSync()) {
            const ready = await hasSharedFolder();
            if (!cancelled) setFolderReady(ready);
          }
          const restored = await restoreLibraryBackupIfLocalEmpty();
          if (restored && !cancelled) {
            setSyncHint("กู้คลังจากสำเนาสำรองในเครื่องแล้ว (กันข้อมูลหาย)");
          }
          await resolveSyncId();
          if (cancelled) return;
          const bound = getSyncId();
          const folderBound = await hasSharedFolder();
          if (bound || folderBound) {
            try {
              if (bound) {
                const result = await syncLibraryWithCloud(bound);
                if (!cancelled) {
                  const rowsAfter = await listContracts();
                  if (result === "pushed") {
                    setSyncHint(
                      `อัปโหลดคลังแล้ว ${rowsAfter.length} สัญญา`
                    );
                  } else if (result === "pulled" || result === "merged") {
                    setSyncHint(
                      `ซิงก์คลังแล้ว ${rowsAfter.length} สัญญา`
                    );
                  }
                }
              }
            } catch {
              // Offline / cloud down — still show local library.
            }
          }

          if (readSyncIdFromLocation()) {
            const url = new URL(window.location.href);
            url.searchParams.delete("sync");
            window.history.replaceState({}, "", url.toString());
          }

          const rows = await listContracts();
          if (cancelled) return;
          const nos = savedNosOf(rows);
          reconcileSeqFromSaved(nos);
          syncUnsavedDraftContractNo(nos);
          setLibrary(rows);
          setLibraryError(null);
          setLibraryLoading(false);
        } catch (error) {
          if (!cancelled) {
            setLibraryError(
              error instanceof Error
                ? error.message
                : "โหลดคลังสัญญาไม่สำเร็จ"
            );
            setLibraryLoading(false);
            try {
              const rows = await listContracts();
              setLibrary(rows);
            } catch {
              // ignore
            }
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
      const latest = await listContracts();
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
      const cloudOk = await quietPushCloud();
      await reloadLocalLibrary();
      const action = sessionId
        ? `อัปเดตสัญญา ${saved.inputs.contract_no} แล้ว`
        : `สร้างสัญญา ${saved.inputs.contract_no} แล้ว`;
      setSaveMessage(
        cloudOk
          ? `${action} · เครื่องอื่นเปิดเว็บนี้จะเห็นตาม`
          : `${action} ในเครื่อง · แต่ส่งขึ้นคลังร่วมไม่สำเร็จ ลองบันทึกอีกครั้ง`
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
    await quietPushCloud();
    await reloadLocalLibrary();
  }

  async function duplicateSaved(id: string) {
    const row = await getContract(id);
    if (!row) {
      window.alert("ไม่พบสัญญา");
      await refreshLibrary();
      return;
    }
    try {
      const latest = await listContracts();
      const nos = savedNosOf(latest);
      const renewal = buildRenewalInputs(row.inputs, nos);
      const payload = {
        ...renewal,
        contract_no: allocateContractNo(renewal.contract_date, nos),
      };
      const saved = await saveContract(payload);
      loadContractIntoDraft(saved.id, saved.inputs);
      await quietPushCloud();
      await reloadLocalLibrary();
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
        "นำเข้าจะแทนที่คลังสัญญาบนเครื่องนี้ทั้งหมด ต้องการทำต่อหรือไม่?"
      )
    ) {
      return;
    }
    try {
      setLibraryLoading(true);
      const result = await importLibraryFile(file);
      await quietPushCloud();
      await reloadLocalLibrary();
      setSaveMessage(
        `นำเข้าแล้ว ${result.contracts} สัญญา (${result.attachments} ไฟล์แนบ)`
      );
      setView("library");
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "นำเข้าคลังไม่สำเร็จ"
      );
      setLibraryLoading(false);
    }
  }

  async function handlePickSharedFolder() {
    try {
      await pickSharedFolder();
      setFolderReady(true);
      setSyncHint(
        "เลือกโฟลเดอร์ร่วมแล้ว — บันทึกสัญญาจะเขียนไฟล์ sanggan-clean-library.json ในโฟลเดอร์นี้"
      );
      await refreshLibrary();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "เลือกโฟลเดอร์ร่วมไม่สำเร็จ"
      );
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
      ? "คลังสัญญาที่บันทึกไว้"
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
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6">
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
          <div className="flex flex-wrap items-center justify-end gap-2">
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
      </header>

      {view === "library" ? (
        <ContractLibrary
          items={library}
          loading={libraryLoading}
          error={libraryError}
          syncHint={syncHint}
          folderReady={folderReady}
          folderSupported={canUseSharedFolderSync()}
          onNew={startNew}
          onOpen={(id) => void openSaved(id)}
          onDuplicate={(id) => void duplicateSaved(id)}
          onDelete={(id) => void removeSaved(id)}
          onExportFile={() => void handleExportLibrary()}
          onImportFile={(file) => void handleImportLibrary(file)}
          onSyncNow={() => void refreshLibrary()}
          onPickFolder={() => void handlePickSharedFolder()}
          onReview={(id) => openReview(id)}
        />
      ) : view === "review" ? (
        <ContractReview
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
